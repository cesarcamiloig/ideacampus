import mimetypes

from django.db.models import Prefetch
from django.http import FileResponse, HttpResponse
from django.utils.http import content_disposition_header
from rest_framework import mixins, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from gestion_administrativa.authentication import JWTAuthentication
from gestion_administrativa.permissions import TieneRolPermitido
from .models import DocumentoEvidencia, Evidencia
from .serializers import (
    EvidenciaCrearSerializer,
    EvidenciaEditarSerializer,
    EvidenciaSerializer,
    borrar_documentos,
    proyectos_del_estudiante,
    proyectos_del_tutor,
    puede_gestionar_evidencia,
    reabrir_actividad_sin_evidencias,
)


# Los listados no cargan el contenido binario de los archivos (hasta 10 MB cada uno)
DOCUMENTOS_SIN_CONTENIDO = Prefetch(
    "documentos", queryset=DocumentoEvidencia.objects.defer("contenido")
)

ROLES_LECTURA = ("estudiante", "admin", "direccion_del_programa",
                 "coordinador", "tutor", "mentor", "evaluador")
ACCIONES_ESCRITURA = ("create", "update", "partial_update", "destroy")


class ActividadViewSet(viewsets.ModelViewSet):
    """
    Actividades del proyecto. Solo el líder del equipo las crea, edita o elimina;
    el estado pasa a "completada" cuando el responsable sube su evidencia.
    Filtros: ?proyecto=ID, ?hito=ID, ?estado=pendiente|completada
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    serializer_class = ActividadSerializer

    @property
    def roles_permitidos(self):
        return ("estudiante",) if self.action in ACCIONES_ESCRITURA else ROLES_LECTURA

    def get_queryset(self):
        qs = Actividad.objects.select_related(
            "proyecto__iniciativa", "hito__rubrica", "responsable", "creado_por")
        for parametro in ("proyecto", "hito"):
            valor = self.request.query_params.get(parametro)
            if valor:
                qs = qs.filter(**{f"{parametro}_id": valor}) if valor.isdigit() else qs.none()
        estado = self.request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)

        rol = getattr(self.request.user, "rol_activo", None)
        if rol == "estudiante":
            qs = qs.filter(proyecto__in=proyectos_del_estudiante(self.request.user))
        elif rol == "tutor":
            qs = qs.filter(proyecto__in=proyectos_del_tutor(self.request.user))
        return qs

    def destroy(self, request, *args, **kwargs):
        actividad = self.get_object()
        if not es_lider_del_proyecto(request.user, actividad.proyecto):
            return Response(
                {"error": "Solo el líder del equipo puede gestionar las actividades del proyecto."},
                status=status.HTTP_403_FORBIDDEN,
            )
        actividad.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EvidenciaViewSet(mixins.CreateModelMixin,
                       mixins.ListModelMixin,
                       mixins.RetrieveModelMixin,
                       viewsets.GenericViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    roles_crear = ("estudiante",)
    roles_lectura = ROLES_LECTURA
    # Ver las evidencias de "mi proyecto": el estudiante que participa y el tutor que lo retroalimenta
    roles_mi_proyecto = ("estudiante", "tutor")

    @property
    def roles_permitidos(self):
        if self.action in ACCIONES_ESCRITURA:
            return self.roles_crear
        if self.action == "mi_proyecto":
            return self.roles_mi_proyecto
        return self.roles_lectura

    def get_queryset(self):
        qs = (Evidencia.objects
              .select_related("proyecto__iniciativa", "etapa", "usuario", "actividad")
              .prefetch_related(DOCUMENTOS_SIN_CONTENIDO))
        proyecto = self.request.query_params.get("proyecto")
        if proyecto:
            # Un id no numérico no coincide con ningún proyecto (evita un error 500)
            qs = qs.filter(proyecto_id=proyecto) if proyecto.isdigit() else qs.none()
        # El estudiante solo ve sus propias evidencias
        if getattr(self.request.user, "rol_activo", None) == "estudiante":
            qs = qs.filter(usuario=self.request.user)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return EvidenciaCrearSerializer
        if self.action in ("update", "partial_update"):
            return EvidenciaEditarSerializer
        return EvidenciaSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evidencia = serializer.save()
        salida = EvidenciaSerializer(evidencia, context={"request": request})
        return Response(salida.data, status=status.HTTP_201_CREATED)

    def _evidencia_gestionable(self, request, pk):
        """
        Devuelve (evidencia, None) si el usuario puede editarla o eliminarla:
        el líder del equipo con todas las del proyecto y los integrantes solo con las propias.
        Si no, (None, respuesta de error).
        """
        evidencia = (Evidencia.objects
                     .select_related("proyecto__iniciativa__equipo__estudiante_lider", "actividad")
                     .filter(pk=pk)
                     .first())
        if not evidencia:
            return None, Response({"error": "Evidencia no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if not puede_gestionar_evidencia(request.user, evidencia):
            return None, Response(
                {"error": "Solo el líder del equipo o quien subió la evidencia puede modificarla o eliminarla."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return evidencia, None

    def update(self, request, *args, **kwargs):
        evidencia, error = self._evidencia_gestionable(request, kwargs.get("pk"))
        if error:
            return error
        serializer = self.get_serializer(
            evidencia, data=request.data, partial=kwargs.pop("partial", False))
        serializer.is_valid(raise_exception=True)
        evidencia = serializer.save()
        salida = EvidenciaSerializer(evidencia, context={"request": request})
        return Response(salida.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Elimina una evidencia con todos sus adjuntos."""
        evidencia, error = self._evidencia_gestionable(request, kwargs.get("pk"))
        if error:
            return error
        actividad = evidencia.actividad
        borrar_documentos(evidencia)
        evidencia.delete()
        reabrir_actividad_sin_evidencias(actividad)
        return Response(status=status.HTTP_204_NO_CONTENT)

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
              .select_related("proyecto__iniciativa", "etapa", "usuario", "actividad")
              .prefetch_related(DOCUMENTOS_SIN_CONTENIDO))
        proyecto = request.query_params.get("proyecto")
        if proyecto:
            qs = qs.filter(proyecto_id=proyecto) if proyecto.isdigit() else qs.none()
        serializer = EvidenciaSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path=r"documentos/(?P<doc_id>\d+)/descargar")
    def descargar_documento(self, request, doc_id=None):
        """
        Descarga un archivo adjunto a una evidencia. El contenido vive en la base de datos,
        así que lo puede descargar cualquiera con acceso al proyecto, no solo quien lo subió:
        - estudiante: proyectos en los que participa (titular o integrante del equipo).
        - tutor: proyectos en los que es el tutor asignado.
        - demás roles de lectura: cualquier proyecto.
        """
        documento = (DocumentoEvidencia.objects
                     .select_related("evidencia")
                     .filter(pk=doc_id, enlace__isnull=True)
                     .first())
        if not documento:
            return Response({"error": "Archivo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        rol = getattr(request.user, "rol_activo", None)
        proyectos = None
        if rol == "estudiante":
            proyectos = proyectos_del_estudiante(request.user)
        elif rol == "tutor":
            proyectos = proyectos_del_tutor(request.user)
        if proyectos is not None and not proyectos.filter(pk=documento.evidencia.proyecto_id).exists():
            return Response(
                {"error": "No tienes acceso a las evidencias de este proyecto."},
                status=status.HTTP_403_FORBIDDEN,
            )

        nombre = documento.nombre_original or f"evidencia-{documento.pk}"
        if documento.contenido is not None:
            tipo = (documento.tipo_contenido
                    or mimetypes.guess_type(nombre)[0]
                    or "application/octet-stream")
            respuesta = HttpResponse(bytes(documento.contenido), content_type=tipo)
            respuesta["Content-Disposition"] = content_disposition_header(as_attachment=True, filename=nombre)
            return respuesta

        # Adjuntos subidos antes de guardar el contenido en la base de datos
        if documento.archivo and documento.archivo.storage.exists(documento.archivo.name):
            return FileResponse(documento.archivo.open("rb"), as_attachment=True, filename=nombre)

        return Response(
            {"error": "El archivo se subió antes de guardarse en la base de datos y ya no está "
                      "disponible en este servidor. Debe volver a cargarse."},
            status=status.HTTP_404_NOT_FOUND,
        )