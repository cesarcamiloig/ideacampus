from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from gestion_administrativa.permissions import TieneRolPermitido

from .authentication import JWTAuthenticationRubricas
from .models import Rubrica, SubRubrica
from .serializers import (
    CIEN,
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



# ---------------------------------------------------------------------------
# HU-11 — Vista de Madurez Tecnológica (M0-M9)
# ---------------------------------------------------------------------------
from rest_framework.views import APIView
from gestion_emprendimiento_2.models import Proyecto
from .models import NivelMadurez, RegistroMadurez
from .serializers import RegistroMadurezSerializer, RegistroMadurezCrearSerializer
from gestion_administrativa.authentication import JWTAuthentication


class ProyectoMadurezView(APIView):
    """
    HU-11: Consulta y evaluación de nivel de madurez tecnológica (M0-M9).
    - GET: Todos los roles académicos autenticados pueden consultar el nivel actual,
           la lista de niveles disponibles y el historial auditable de ascensos.
    - POST: Solo el evaluador asignado al proyecto o la coordinación/dirección/admin
            pueden dictaminar una evaluación de madurez.
    - PUT / PATCH: Bloqueados con HTTP 400 Bad Request según criterios de aceptación CA-2 y CA-3
                   (el nivel nunca se edita manualmente de forma directa).
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]

    roles_lectura = (
        "admin", "direccion_del_programa", "direccion", "coordinador",
        "evaluador", "tutor", "mentor", "estudiante",
    )
    roles_escritura = ("admin", "direccion_del_programa", "direccion", "coordinador", "evaluador")

    @property
    def roles_permitidos(self):
        if self.request.method in ("POST", "PUT", "PATCH"):
            return self.roles_escritura
        return self.roles_lectura

    def _obtener_proyecto(self, id_proyecto):
        return Proyecto.objects.select_related(
            "iniciativa", "evaluador", "coordinador", "tutor__usuario"
        ).filter(pk=id_proyecto).first()

    def get(self, request, id_proyecto):
        proyecto = self._obtener_proyecto(id_proyecto)
        if not proyecto:
            return Response({"error": "Proyecto no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        historial = (
            RegistroMadurez.objects.filter(proyecto=proyecto)
            .select_related("evaluador")
            .prefetch_related("evidencias__etapa")
            .order_by("-fecha_registro", "-id")
        )

        niveles_disponibles = [
            {"codigo": choice[0], "nombre": choice[1]}
            for choice in NivelMadurez.choices
        ]

        return Response({
            "proyecto_id": proyecto.pk,
            "nombre_proyecto": proyecto.nombre_proyecto,
            "nivel_actual": proyecto.nivel_madurez_actual,
            "niveles_disponibles": niveles_disponibles,
            "historial": RegistroMadurezSerializer(historial, many=True).data,
        })

    def post(self, request, id_proyecto):
        proyecto = self._obtener_proyecto(id_proyecto)
        if not proyecto:
            return Response({"error": "Proyecto no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        rol_activo = getattr(request.user, "rol_activo", None)
        roles_gestion = ("admin", "direccion_del_programa", "direccion", "coordinador")
        roles_asignados = getattr(request.user, "roles_asignados", [])
        es_gestor = any(r in roles_gestion for r in roles_asignados) or (rol_activo in roles_gestion)

        if not es_gestor:
            if not proyecto.evaluador_id or proyecto.evaluador_id != request.user.pk:
                return Response(
                    {"error": "Solo el evaluador asignado o la coordinación pueden evaluar la madurez de este proyecto."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = RegistroMadurezCrearSerializer(
            data=request.data,
            context={"proyecto": proyecto, "evaluador": request.user}
        )
        serializer.is_valid(raise_exception=True)
        registro = serializer.save()

        salida = RegistroMadurezSerializer(registro)
        return Response(salida.data, status=status.HTTP_201_CREATED)

    def put(self, request, id_proyecto):
        return Response(
            {"error": "El nivel de madurez no se puede editar directamente. Debe registrarse a través de una evaluación formal."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def patch(self, request, id_proyecto):
        return self.put(request, id_proyecto)
