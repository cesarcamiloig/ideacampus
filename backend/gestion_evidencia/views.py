from rest_framework import mixins, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from gestion_administrativa.authentication import JWTAuthentication
from gestion_administrativa.permissions import TieneRolPermitido
from .models import Evidencia
from .serializers import (
    EvidenciaCrearSerializer,
    EvidenciaSerializer,
    proyectos_del_estudiante,
    proyectos_del_tutor,
)


class EvidenciaViewSet(mixins.CreateModelMixin,
                       mixins.ListModelMixin,
                       mixins.RetrieveModelMixin,
                       viewsets.GenericViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    roles_crear = ("estudiante",)
    roles_lectura = ("estudiante", "admin", "direccion_del_programa",
                     "coordinador", "tutor", "mentor", "evaluador")
    # Ver las evidencias de "mi proyecto": el estudiante que participa y el tutor que lo retroalimenta
    roles_mi_proyecto = ("estudiante", "tutor")

    @property
    def roles_permitidos(self):
        if self.action == "create":
            return self.roles_crear
        if self.action == "mi_proyecto":
            return self.roles_mi_proyecto
        return self.roles_lectura

    def get_queryset(self):
        qs = (Evidencia.objects
              .select_related("proyecto__iniciativa", "etapa", "usuario")
              .prefetch_related("documentos"))
        proyecto = self.request.query_params.get("proyecto")
        if proyecto:
            # Un id no numérico no coincide con ningún proyecto (evita un error 500)
            qs = qs.filter(proyecto_id=proyecto) if proyecto.isdigit() else qs.none()
        # El estudiante solo ve sus propias evidencias
        if getattr(self.request.user, "rol_activo", None) == "estudiante":
            qs = qs.filter(usuario=self.request.user)
        return qs

    def get_serializer_class(self):
        return EvidenciaCrearSerializer if self.action == "create" else EvidenciaSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evidencia = serializer.save()
        salida = EvidenciaSerializer(evidencia, context={"request": request})
        return Response(salida.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="mi-proyecto")
    def mi_proyecto(self, request):
        """
        Evidencias de "mis" proyectos, según el rol activo:
        - estudiante: proyectos en los que participa (titular de la iniciativa aprobada
          o integrante del equipo), subidas por él o por su equipo.
        - tutor: proyectos en los que es el tutor asignado, para retroalimentarlas.
        Acepta ?proyecto=ID para limitarse a uno de esos proyectos.
        """
        if getattr(request.user, "rol_activo", None) == "tutor":
            proyectos = proyectos_del_tutor(request.user)
        else:
            proyectos = proyectos_del_estudiante(request.user)

        qs = (Evidencia.objects
              .filter(proyecto__in=proyectos)
              .select_related("proyecto__iniciativa", "etapa", "usuario")
              .prefetch_related("documentos"))
        proyecto = request.query_params.get("proyecto")
        if proyecto:
            qs = qs.filter(proyecto_id=proyecto) if proyecto.isdigit() else qs.none()
        serializer = EvidenciaSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)