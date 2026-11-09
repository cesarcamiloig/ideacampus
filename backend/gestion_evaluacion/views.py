from django.db.models import Count
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from gestion_administrativa.permissions import TieneRolPermitido
from gestion_emprendimiento_2.models import Proyecto

from .asignaciones import es_evaluador_asignado
from .authentication import JWTAuthenticationRubricas
from .calculos import nota_global
from .models import Evaluacion, Rubrica, SubRubrica
from .serializers import (
    CIEN,
    EvaluacionEntradaSerializer,
    EvaluacionSerializer,
    HitoListaSerializer,
    RubricaEdicionSerializer,
    RubricaSerializer,
    suma_ponderaciones,
)

# Deben coincidir con los valores del campo tipo de Iniciativa
TIPOS_INICIATIVA = ("emprendimiento", "innovacion")


class PermisosRubricaMixin:
    """Lectura para los roles académicos; escritura solo para admin y Dirección del Programa."""
    authentication_classes = [JWTAuthenticationRubricas]
    permission_classes = [TieneRolPermitido]

    roles_lectura = (
        "admin", "direccion_del_programa", "coordinador",
        "evaluador", "tutor", "mentor", "estudiante",
    )
    roles_escritura = ("admin", "direccion_del_programa")
    acciones_lectura = ("list", "retrieve", "validar", "hitos")

    @property
    def roles_permitidos(self):
        if self.action in self.acciones_lectura:
            return self.roles_lectura
        return self.roles_escritura


class RubricaViewSet(PermisosRubricaMixin, mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet):
    """
    Las rúbricas se crean por migración (una por tipo de iniciativa) y no se borran.
    Se editan con un único PUT que recibe la rúbrica completa (hitos y criterios) y la sincroniza.
    """
    http_method_names = ["get", "put", "head", "options"]

    def get_queryset(self):
        return Rubrica.objects.prefetch_related("subrubricas__criterios")

    def get_serializer_class(self):
        if self.action == "update":
            return RubricaEdicionSerializer
        return RubricaSerializer

    def update(self, request, *args, **kwargs):
        rubrica = self.get_object()
        serializer = self.get_serializer(rubrica, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        recargada = self.get_queryset().get(pk=rubrica.pk)
        return Response(RubricaSerializer(recargada, context=self.get_serializer_context()).data)

    @action(detail=False, methods=["get"], url_path="hitos")
    def hitos(self, request):
        """Lista liviana de hitos (sin criterios), opcionalmente filtrada por ?tipo_iniciativa=."""
        hitos = SubRubrica.objects.select_related("rubrica").order_by(
            "rubrica__tipo_iniciativa", "numero_hito"
        )

        tipo = request.query_params.get("tipo_iniciativa")
        if tipo:
            if tipo not in TIPOS_INICIATIVA:
                return Response(
                    {"tipo_iniciativa": (
                        f"Tipo de iniciativa inválido: '{tipo}'. "
                        f"Use uno de: {', '.join(TIPOS_INICIATIVA)}."
                    )},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            hitos = hitos.filter(rubrica__tipo_iniciativa=tipo)

        return Response(HitoListaSerializer(hitos, many=True).data)

    @action(detail=True, methods=["get"])
    def validar(self, request, pk=None):
        """Indica si la rúbrica está completa y lista para usarse."""
        rubrica = self.get_object()
        problemas = []

        subrubricas = list(rubrica.subrubricas.all())
        if not subrubricas:
            problemas.append("La rúbrica no tiene hitos (subrúbricas).")
        else:
            suma_hitos = suma_ponderaciones(rubrica.subrubricas.all())
            if suma_hitos != CIEN:
                problemas.append(f"Los hitos suman {suma_hitos} %, deben sumar 100 %.")

        for sub in subrubricas:
            if not sub.criterios.exists():
                problemas.append(f"El hito {sub.numero_hito} no tiene criterios.")
                continue
            suma_criterios = suma_ponderaciones(sub.criterios.all())
            if suma_criterios != CIEN:
                problemas.append(
                    f"Los criterios del hito {sub.numero_hito} suman {suma_criterios} %, deben sumar 100 %."
                )

        return Response({"completa": not problemas, "problemas": problemas})


class EvaluacionViewSet(viewsets.ModelViewSet):
    """
    Evaluación de los hitos de un proyecto. Una por (proyecto, hito, evaluador);
    se crea con POST y se reemplaza completa con PUT.
    Filtros: ?proyecto=ID, ?subrubrica=ID
    """
    authentication_classes = [JWTAuthenticationRubricas]
    permission_classes = [TieneRolPermitido]
    http_method_names = ["get", "post", "put", "head", "options"]

    roles_escritura = ("evaluador",)
    roles_ver_todas = ("admin", "direccion_del_programa", "coordinador")
    roles_lectura = roles_escritura + roles_ver_todas

    @property
    def roles_permitidos(self):
        if self.action in ("create", "update", "mis_proyectos"):
            return self.roles_escritura
        return self.roles_lectura

    def get_serializer_class(self):
        if self.action in ("create", "update"):
            return EvaluacionEntradaSerializer
        return EvaluacionSerializer

    @staticmethod
    def _con_detalle():
        return Evaluacion.objects.select_related("subrubrica", "evaluador").prefetch_related("notas__criterio")

    def _respuesta(self, evaluacion, codigo=status.HTTP_200_OK):
        recargada = self._con_detalle().get(pk=evaluacion.pk)
        return Response(EvaluacionSerializer(recargada).data, status=codigo)

    def get_queryset(self):
        qs = self._con_detalle()
        # Solo se ve todo con el rol activo de gestión, aunque se tengan otros roles
        if getattr(self.request.user, "rol_activo", None) not in self.roles_ver_todas:
            qs = qs.filter(evaluador=self.request.user)
        for parametro in ("proyecto", "subrubrica"):
            valor = self.request.query_params.get(parametro)
            if valor:
                # Un id no numérico no coincide con ninguno (evita un error 500)
                qs = qs.filter(**{f"{parametro}_id": valor}) if valor.isdigit() else qs.none()
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._respuesta(serializer.save(), status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        # Sin el filtro de get_queryset: la evaluación ajena responde 403, no 404
        evaluacion = get_object_or_404(
            Evaluacion.objects.select_related("proyecto__iniciativa", "subrubrica__rubrica"),
            pk=kwargs["pk"],
        )
        if evaluacion.evaluador_id != request.user.pk:
            raise PermissionDenied("Solo el evaluador dueño puede modificar esta evaluación.")
        serializer = self.get_serializer(evaluacion, data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._respuesta(serializer.save())

    @action(detail=False, methods=["get"], url_path="mis-proyectos")
    def mis_proyectos(self, request):
        """Proyectos activos que el evaluador puede evaluar, con su avance."""
        proyectos = Proyecto.objects.filter(estado=Proyecto.Estado.ACTIVO).select_related("iniciativa")
        hitos_por_tipo = dict(
            SubRubrica.objects.values_list("rubrica__tipo_iniciativa").annotate(total=Count("pk"))
        )
        evaluados = dict(
            Evaluacion.objects.filter(evaluador=request.user)
            .values_list("proyecto_id").annotate(total=Count("subrubrica", distinct=True))
        )
        return Response([
            {
                "id": proyecto.pk,
                "nombre_iniciativa": proyecto.iniciativa.nombre,
                "tipo": proyecto.iniciativa.tipo,
                "hitos_evaluados": evaluados.get(proyecto.pk, 0),
                "hitos_totales": hitos_por_tipo.get(proyecto.iniciativa.tipo, 0),
            }
            for proyecto in proyectos
            if es_evaluador_asignado(request.user, proyecto)
        ])


class ResultadosProyectoView(APIView):
    """Nota global del proyecto y el detalle por hito."""
    authentication_classes = [JWTAuthenticationRubricas]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ("evaluador", "admin", "direccion_del_programa", "coordinador", "tutor")

    def get(self, request, id_proyecto):
        proyecto = get_object_or_404(Proyecto.objects.select_related("iniciativa"), pk=id_proyecto)
        return Response(nota_global(proyecto))
