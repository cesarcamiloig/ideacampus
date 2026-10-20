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
