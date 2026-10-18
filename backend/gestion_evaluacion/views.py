from django.db.models import ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CriterioRubrica, Rubrica, SubRubrica
from .permissions import TieneRolPermitido
from .serializers import (
    CIEN,
    CriterioRubricaSerializer,
    RubricaCrearSerializer,
    RubricaSerializer,
    SubRubricaSerializer,
    suma_ponderaciones,
)


class PermisosRubricaMixin:
    """Escribir: admin y dirección del programa. Leer: los roles listados."""

    roles_lectura = (
        "admin", "direccion_del_programa", "coordinador",
        "evaluador", "tutor", "mentor","estudiante"
    )
    roles_escritura = ("admin", "direccion_del_programa")
    acciones_lectura = ("list", "retrieve", "validar")

    def get_permissions(self):
        if self.action in self.acciones_lectura:
            self.roles_permitidos = self.roles_lectura
        else:
            self.roles_permitidos = self.roles_escritura
        return [TieneRolPermitido()]


class BorradoProtegidoMixin:
    """Devuelve 409 si el registro tiene datos que dependen de él."""

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar: tiene evaluaciones o notas asociadas."},
                status=status.HTTP_409_CONFLICT,
            )


class RubricaViewSet(PermisosRubricaMixin, BorradoProtegidoMixin, viewsets.ModelViewSet):
    queryset = Rubrica.objects.prefetch_related("subrubricas__criterios")

    def get_serializer_class(self):
        if self.action == "create":
            return RubricaCrearSerializer
        return RubricaSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rubrica = serializer.save()
        salida = RubricaSerializer(rubrica, context=self.get_serializer_context())
        return Response(salida.data, status=status.HTTP_201_CREATED)

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
            else:
                suma_crit = suma_ponderaciones(sub.criterios.all())
                if suma_crit != CIEN:
                    problemas.append(
                        f"Los criterios del hito {sub.numero_hito} suman {suma_crit} %, deben sumar 100 %."
                    )

        return Response({"completa": not problemas, "problemas": problemas})


class SubRubricaViewSet(PermisosRubricaMixin, BorradoProtegidoMixin, viewsets.ModelViewSet):
    serializer_class = SubRubricaSerializer

    def get_queryset(self):
        qs = SubRubrica.objects.prefetch_related("criterios")
        rubrica = self.request.query_params.get("rubrica")
        return qs.filter(rubrica_id=rubrica) if rubrica else qs


class CriterioRubricaViewSet(PermisosRubricaMixin, BorradoProtegidoMixin, viewsets.ModelViewSet):
    serializer_class = CriterioRubricaSerializer

    def get_queryset(self):
        qs = CriterioRubrica.objects.all()
        subrubrica = self.request.query_params.get("subrubrica")
        return qs.filter(subrubrica_id=subrubrica) if subrubrica else qs