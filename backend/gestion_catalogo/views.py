from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from gestion_administrativa.authentication import JWTAuthentication
from gestion_administrativa.permissions import TieneRolPermitido
from gestion_convocatorias.models import Convocatoria, Iniciativa

from .models import ESTADOS_AUTORIZABLES, PublicacionCatalogo
from .serializers import CatalogoGestionSerializer, CatalogoPublicoSerializer, PublicacionCatalogoSerializer
from .services import (
    describir_filtros,
    filtrar_iniciativas,
    generar_csv,
    generar_excel,
    iniciativas_con_detalle,
    nombre_archivo,
    resumen_informe,
)

# HU-15: el catálogo y los informes los gestiona la coordinación de emprendimiento
ROLES_GESTION_CATALOGO = ("coordinador",)


def iniciativas_publicadas():
    return iniciativas_con_detalle().filter(
        publicacion_catalogo__publicada=True, estado__in=ESTADOS_AUTORIZABLES
    ).order_by("-publicacion_catalogo__fecha_publicacion", "-id_iniciativa")


# ===========================================================================
# Catálogo público (sin sesión)
# ===========================================================================

class CatalogoPublicoView(APIView):
    """
    Catálogo público de iniciativas autorizadas por la coordinación. No requiere sesión:
    se ignora cualquier token para que un visitante con una sesión vencida también lo vea.
    Filtros: ?q= (nombre, resumen, sector), ?tipo=, ?origen=.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        qs = iniciativas_publicadas()
        busqueda = (request.query_params.get("q") or "").strip()
        if busqueda:
            qs = qs.filter(
                Q(nombre__icontains=busqueda)
                | Q(publicacion_catalogo__resumen_publico__icontains=busqueda)
                | Q(sector_tecnologico__icontains=busqueda)
            )
        tipo = (request.query_params.get("tipo") or "").strip()
        if tipo:
            qs = qs.filter(tipo=tipo)
        origen = (request.query_params.get("origen") or "").strip()
        if origen:
            qs = qs.filter(origen_academico=origen)
        return Response(CatalogoPublicoSerializer(qs, many=True).data)


# ===========================================================================
# Gestión del catálogo (coordinador)
# ===========================================================================

class CatalogoGestionListView(APIView):
    """Iniciativas aprobadas con su estado en el catálogo, para autorizar su difusión."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ROLES_GESTION_CATALOGO

    def get(self, request):
        qs = iniciativas_con_detalle().filter(estado__in=ESTADOS_AUTORIZABLES).order_by("nombre")
        return Response(CatalogoGestionSerializer(qs, many=True).data)


class CatalogoGestionDetalleView(APIView):
    """
    Autoriza, edita o retira una iniciativa del catálogo público.
    PUT { publicada, resumen_publico, resultados }. Publicar exige iniciativa aprobada y resumen.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ROLES_GESTION_CATALOGO

    def put(self, request, id_iniciativa):
        iniciativa = iniciativas_con_detalle().filter(pk=id_iniciativa).first()
        if iniciativa is None:
            return Response({"error": "Iniciativa no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        publicacion = PublicacionCatalogo.objects.filter(iniciativa=iniciativa).first()
        serializer = PublicacionCatalogoSerializer(
            publicacion, data=request.data, partial=publicacion is not None, context={"iniciativa": iniciativa}
        )
        serializer.is_valid(raise_exception=True)

        publicada = serializer.validated_data.get("publicada", getattr(publicacion, "publicada", False))
        extra = {}
        if publicada and not getattr(publicacion, "publicada", False):
            # Queda registrado quién autorizó la difusión y desde cuándo
            extra = {"autorizado_por": request.user, "fecha_publicacion": timezone.now()}
        if publicacion is None:
            extra["iniciativa"] = iniciativa
        serializer.save(**extra)

        iniciativa = iniciativas_con_detalle().get(pk=id_iniciativa)
        return Response(CatalogoGestionSerializer(iniciativa).data)


# ===========================================================================
# Informes exportables (coordinador)
# ===========================================================================

class InformeResumenView(APIView):
    """
    Vista previa del informe con los mismos filtros que la exportación, y las convocatorias
    disponibles para filtrar.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ROLES_GESTION_CATALOGO

    def get(self, request):
        datos = resumen_informe(filtrar_iniciativas(request.query_params))
        datos["convocatorias"] = [
            {"id": c.id_convocatoria, "nombre": c.nombre}
            for c in Convocatoria.objects.filter(iniciativas__isnull=False).distinct().order_by("-fecha_apertura")
        ]
        return Response(datos)


class InformeExportarView(APIView):
    """Descarga el informe de iniciativas filtradas: ?formato=csv | xlsx (por defecto xlsx)."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ROLES_GESTION_CATALOGO

    FORMATOS = {
        "csv": "text/csv; charset=utf-8",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }

    def get(self, request):
        formato = (request.query_params.get("formato") or "xlsx").lower()
        if formato not in self.FORMATOS:
            return Response({"error": "Formato no soportado. Usa csv o xlsx."}, status=status.HTTP_400_BAD_REQUEST)

        iniciativas = filtrar_iniciativas(request.query_params)
        if formato == "csv":
            contenido = generar_csv(iniciativas)
        else:
            contenido = generar_excel(iniciativas, describir_filtros(request.query_params))

        respuesta = HttpResponse(contenido, content_type=self.FORMATOS[formato])
        respuesta["Content-Disposition"] = f'attachment; filename="{nombre_archivo(formato)}"'
        return respuesta
