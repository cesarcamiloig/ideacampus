import mimetypes
from collections import defaultdict

from django.db.models import Prefetch
from django.http import FileResponse, HttpResponse
from django.utils.http import content_disposition_header
from rest_framework import mixins, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from gestion_administrativa.authentication import JWTAuthentication
from gestion_administrativa.permissions import TieneRolPermitido
from gestion_acompaniamiento.models import Tutor
from gestion_emprendimiento_2.models import EquipoEmprendedor, Proyecto
from gestion_evaluacion.models import SubRubrica
from .models import DocumentoEvidencia, Evidencia, RegistroAvance, RetroalimentacionAvance
from .serializers import (
    EvidenciaCrearSerializer,
    EvidenciaSerializer,
    RegistroAvanceSerializer,
    RegistroAvanceCrearSerializer,
    RetroalimentacionCrearSerializer,
    RetroalimentacionAvanceSerializer,
    proyectos_del_estudiante,
    proyectos_del_tutor,
)


# Los listados no cargan el contenido binario de los archivos (hasta 10 MB cada uno)
DOCUMENTOS_SIN_CONTENIDO = Prefetch(
    "documentos", queryset=DocumentoEvidencia.objects.defer("contenido")
)


def es_lider_del_proyecto(usuario, proyecto):
    """Solo el líder del equipo emprendedor del proyecto puede eliminar sus evidencias."""
    try:
        equipo = proyecto.iniciativa.equipo
    except EquipoEmprendedor.DoesNotExist:
        return False
    return equipo.estudiante_lider.usuario_id == usuario.pk


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
        if self.action in ("create", "destroy"):
            return self.roles_crear
        if self.action == "mi_proyecto":
            return self.roles_mi_proyecto
        return self.roles_lectura

    def get_queryset(self):
        qs = (Evidencia.objects
              .select_related("proyecto__iniciativa", "etapa", "usuario")
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
        return EvidenciaCrearSerializer if self.action == "create" else EvidenciaSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evidencia = serializer.save()
        salida = EvidenciaSerializer(evidencia, context={"request": request})
        return Response(salida.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """
        Elimina una evidencia con todos sus adjuntos. Solo puede hacerlo el líder del equipo
        del proyecto, sea quien sea el integrante que la subió.
        """
        evidencia = (Evidencia.objects
                     .select_related("proyecto__iniciativa__equipo__estudiante_lider")
                     .filter(pk=kwargs.get("pk"))
                     .first())
        if not evidencia:
            return Response({"error": "Evidencia no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if not es_lider_del_proyecto(request.user, evidencia.proyecto):
            return Response(
                {"error": "Solo el líder del equipo puede eliminar las evidencias del proyecto."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # El registro de avance es un control formal: no puede perder la evidencia que lo respalda
        if evidencia.registros_avance.exists():
            return Response(
                {"error": "Esta evidencia respalda un registro de avance y no se puede eliminar."},
                status=status.HTTP_409_CONFLICT,
            )
        # Los adjuntos antiguos guardados en disco también se borran del almacenamiento
        for documento in evidencia.documentos.exclude(archivo="").exclude(archivo__isnull=True):
            documento.archivo.delete(save=False)
        evidencia.delete()
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
              .select_related("proyecto__iniciativa", "etapa", "usuario")
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


# ===========================================================================
# HU-19 — Registro y validación de avance
# ===========================================================================

def evidencias_con_detalle():
    return (Evidencia.objects
            .select_related("proyecto__iniciativa", "etapa", "usuario")
            .prefetch_related(DOCUMENTOS_SIN_CONTENIDO))


def registros_con_detalle():
    return (RegistroAvance.objects
            .select_related("proyecto__iniciativa", "etapa__rubrica", "registrado_por")
            .prefetch_related(Prefetch("evidencias", queryset=evidencias_con_detalle()),
                              "retroalimentaciones__tutor__usuario"))


def proyectos_segun_rol(usuario):
    """
    Proyectos a los que se limita el usuario según su rol activo:
    - estudiante: en los que participa.
    - tutor: los que tiene asignados.
    - demás roles de lectura: None, sin límite.
    """
    rol = getattr(usuario, "rol_activo", None)
    if rol == "estudiante":
        return proyectos_del_estudiante(usuario)
    if rol == "tutor":
        return proyectos_del_tutor(usuario)
    return None


class RegistroAvanceViewSet(mixins.CreateModelMixin,
                             mixins.ListModelMixin,
                             mixins.RetrieveModelMixin,
                             viewsets.GenericViewSet):
    """
    ViewSet para que estudiantes y tutores registren el avance del proyecto por etapa,
    con la evidencia publicada, dificultades, riesgos y recomendaciones, y para que
    el tutor asignado valide formalmente cada registro.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    parser_classes = [JSONParser, FormParser]
    lookup_value_regex = r"\d+"

    roles_crear = ("estudiante", "tutor")
    roles_lectura = ("estudiante", "tutor", "admin", "coordinador",
                     "direccion_del_programa", "evaluador", "mentor")
    roles_retroalimentar = ("tutor",)
    roles_mis_proyectos = ("estudiante", "tutor")

    @property
    def roles_permitidos(self):
        if self.action == "create":
            return self.roles_crear
        if self.action == "retroalimentar":
            return self.roles_retroalimentar
        if self.action == "mis_proyectos":
            return self.roles_mis_proyectos
        return self.roles_lectura

    def get_queryset(self):
        qs = registros_con_detalle()
        proyecto_param = self.request.query_params.get("proyecto")

        proyectos = proyectos_segun_rol(self.request.user)
        if proyectos is not None:
            qs = qs.filter(proyecto__in=proyectos)

        if proyecto_param:
            qs = qs.filter(proyecto_id=proyecto_param) if proyecto_param.isdigit() else qs.none()

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return RegistroAvanceCrearSerializer
        return RegistroAvanceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registro = serializer.save()
        # Se vuelve a consultar para no cargar el contenido binario de los adjuntos
        registro = registros_con_detalle().get(pk=registro.pk)
        salida = RegistroAvanceSerializer(registro, context={"request": request})
        return Response(salida.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="retroalimentar")
    def retroalimentar(self, request, pk=None):
        """
        El tutor asignado al proyecto valida (aprobado=true) u observa (aprobado=false) un
        registro de avance. Solo el tutor asignado al proyecto del registro puede usar este endpoint.
        """
        registro = RegistroAvance.objects.select_related("proyecto").filter(pk=pk).first()
        if not registro:
            return Response({"error": "Registro de avance no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Verificar que el usuario es el tutor asignado a este proyecto
        perfil_tutor = Tutor.objects.select_related("usuario").filter(usuario=request.user).first()
        if not perfil_tutor:
            return Response(
                {"error": "No tienes un perfil de tutor registrado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if registro.proyecto.tutor_id != perfil_tutor.pk:
            return Response(
                {"error": "Solo el tutor asignado a este proyecto puede retroalimentar sus registros de avance."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RetroalimentacionCrearSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        retroalimentacion = RetroalimentacionAvance.objects.create(
            registro_avance=registro,
            tutor=perfil_tutor,
            **serializer.validated_data,
        )
        salida = RetroalimentacionAvanceSerializer(retroalimentacion, context={"request": request})
        return Response(salida.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="mis-proyectos")
    def mis_proyectos(self, request):
        """Proyectos sobre los que el estudiante o el tutor lleva el control de avance."""
        proyectos = proyectos_segun_rol(request.user).select_related("iniciativa")
        return Response([
            {"id": proyecto.pk, "nombre": proyecto.iniciativa.nombre, "tipo": proyecto.iniciativa.tipo}
            for proyecto in proyectos
        ])

    @action(detail=False, methods=["get"], url_path="trayectoria")
    def trayectoria(self, request):
        """
        Trayectoria de un proyecto (?proyecto=ID) a través de las etapas definidas en la
        rúbrica de su tipo de iniciativa: evidencia publicada, registros de avance y validación
        vigente de cada etapa, que es la del registro más reciente ("sin_registro" si no hay).
        """
        proyecto_id = request.query_params.get("proyecto", "")
        if not proyecto_id.isdigit():
            return Response({"error": "Indica el proyecto a consultar."}, status=status.HTTP_400_BAD_REQUEST)

        proyecto = Proyecto.objects.select_related("iniciativa").filter(pk=proyecto_id).first()
        if not proyecto:
            return Response({"error": "Proyecto no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        proyectos = proyectos_segun_rol(request.user)
        if proyectos is not None and not proyectos.filter(pk=proyecto.pk).exists():
            return Response(
                {"error": "No tienes acceso a la trayectoria de este proyecto."},
                status=status.HTTP_403_FORBIDDEN,
            )

        evidencias_por_etapa = defaultdict(list)
        for evidencia in evidencias_con_detalle().filter(proyecto=proyecto):
            evidencias_por_etapa[evidencia.etapa_id].append(evidencia)
        registros_por_etapa = defaultdict(list)
        for registro in registros_con_detalle().filter(proyecto=proyecto):
            registros_por_etapa[registro.etapa_id].append(registro)

        contexto = {"request": request}
        etapas = []
        for etapa in SubRubrica.objects.filter(rubrica__tipo_iniciativa=proyecto.iniciativa.tipo):
            registros = registros_por_etapa[etapa.pk]
            etapas.append({
                "id": etapa.pk,
                "numero_hito": etapa.numero_hito,
                "nombre": etapa.nombre,
                "descripcion": etapa.descripcion,
                "estado_validacion": registros[0].estado_validacion if registros else "sin_registro",
                "evidencias": EvidenciaSerializer(evidencias_por_etapa[etapa.pk], many=True, context=contexto).data,
                "registros": RegistroAvanceSerializer(registros, many=True, context=contexto).data,
            })
        return Response({"proyecto": proyecto.pk, "nombre": proyecto.iniciativa.nombre, "etapas": etapas})
