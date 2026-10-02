from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from gestion_administrativa.authentication import JWTAuthentication
from gestion_administrativa.permissions import TieneRolPermitido
from .models import Convocatoria, NotificacionConvocatoria
from .serializers import ConvocatoriaSerializer, NotificacionConvocatoriaSerializer
from .services import (
    actualizar_estados_convocatorias,
    notificar_apertura,
    notificar_cierre,
)


class ConvocatoriaViewSet(viewsets.ModelViewSet):
    """
    CRUD completo y ciclo de vida de Convocatorias institucionales (HU-02).
    - Lectura: permitida a todos los usuarios institucionales autenticados.
    - Creación, modificación, cierre y notificación: reservada a Coordinador y Administrador.
    - Apertura y cierre automático según fechas (GENNOVA-50).
    """
    authentication_classes = [JWTAuthentication]
    serializer_class = ConvocatoriaSerializer
    roles_permitidos = ["coordinador", "admin"]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [TieneRolPermitido()]


    def get_queryset(self):
        # Actualización de estados por ventana de tiempo en tiempo real
        actualizar_estados_convocatorias()

        usuario = self.request.user
        roles_usuario = getattr(usuario, 'roles_asignados', [])
        rol_activo = getattr(usuario, 'rol_activo', '')
        es_gestor = ('admin' in roles_usuario or 'coordinador' in roles_usuario or
                     rol_activo in ['admin', 'coordinador'])

        if es_gestor:
            qs = Convocatoria.objects.all()
        else:
            # Los usuarios regulares solo pueden ver convocatorias públicas, abiertas o históricas cerradas
            qs = Convocatoria.objects.exclude(estado='borrador')

        # Filtros opcionales por query param
        estado_filtro = self.request.query_params.get('estado')
        if estado_filtro:
            qs = qs.filter(estado=estado_filtro)

        categoria_filtro = self.request.query_params.get('categoria')
        if categoria_filtro:
            qs = qs.filter(categoria__iexact=categoria_filtro)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(nombre__icontains=search) | Q(descripcion__icontains=search)
            )

        return qs.order_by('-fecha_creacion')

    def perform_create(self, serializer):
        convocatoria = serializer.save(creador=self.request.user)
        # Si nace con estado abierta o publicada, emitir notificaciones
        if convocatoria.estado in ['publicada', 'abierta']:
            notificar_apertura(convocatoria)

    def perform_update(self, serializer):
        estado_anterior = self.get_object().estado
        convocatoria = serializer.save()
        # Si se publica o abre formalmente, disparar notificaciones institucionales
        if estado_anterior == 'borrador' and convocatoria.estado in ['publicada', 'abierta']:
            notificar_apertura(convocatoria)

    @action(detail=True, methods=['post'])
    def publicar(self, request, pk=None):
        """
        Publica una convocatoria que estaba en borrador.
        Si la fecha de apertura ya llegó, se transiciona a 'abierta'.
        Dispara notificaciones para la comunidad institucional.
        """
        convocatoria = self.get_object()
        now = timezone.now()

        if convocatoria.fecha_apertura <= now < convocatoria.fecha_cierre:
            convocatoria.estado = 'abierta'
        else:
            convocatoria.estado = 'publicada'

        convocatoria.save(update_fields=['estado'])
        notificados = notificar_apertura(convocatoria)

        serializer = self.get_serializer(convocatoria)
        return Response({
            'mensaje': f'Convocatoria publicada con éxito en estado {convocatoria.estado}.',
            'notificaciones_enviadas': notificados,
            'convocatoria': serializer.data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        """
        Cierra anticipada o formalmente la convocatoria por parte del Coordinador.
        """
        convocatoria = self.get_object()
        convocatoria.estado = 'cerrada'
        convocatoria.save(update_fields=['estado'])
        notificar_cierre(convocatoria)

        serializer = self.get_serializer(convocatoria)
        return Response({
            'mensaje': 'Convocatoria cerrada exitosamente.',
            'convocatoria': serializer.data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def notificar(self, request, pk=None):
        """
        Emite o reenvía notificaciones a los estudiantes para incentivar postulaciones.
        """
        convocatoria = self.get_object()
        if convocatoria.estado not in ['publicada', 'abierta']:
            return Response(
                {'error': 'Solo se pueden emitir notificaciones para convocatorias publicadas o abiertas.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        notificados = notificar_apertura(convocatoria)
        return Response({
            'mensaje': 'Notificaciones emitidas exitosamente.',
            'notificaciones_generadas': notificados
        }, status=status.HTTP_200_OK)


class NotificacionConvocatoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Gestión de notificaciones recibidas por el usuario institucional autenticado.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = NotificacionConvocatoriaSerializer

    def get_queryset(self):
        qs = NotificacionConvocatoria.objects.filter(usuario=self.request.user)

        leida = self.request.query_params.get('leida')
        if leida is not None:
            if leida.lower() in ['true', '1']:
                qs = qs.filter(leida=True)
            elif leida.lower() in ['false', '0']:
                qs = qs.filter(leida=False)

        return qs.order_by('-fecha_creacion')

    @action(detail=True, methods=['patch'])
    def leer(self, request, pk=None):
        """
        Marca una notificación como leída.
        """
        notificacion = self.get_object()
        notificacion.leida = True
        notificacion.save(update_fields=['leida'])
        return Response(self.get_serializer(notificacion).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def marcar_todas_leidas(self, request):
        """
        Marca todas las notificaciones pendientes del usuario como leídas.
        """
        actualizadas = NotificacionConvocatoria.objects.filter(
            usuario=request.user,
            leida=False
        ).update(leida=True)
        return Response({
            'mensaje': 'Todas las notificaciones han sido marcadas como leídas.',
            'actualizadas': actualizadas
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Resumen cuantitativo de notificaciones para el badge o campana de la interfaz.
        """
        qs = NotificacionConvocatoria.objects.filter(usuario=request.user)
        total = qs.count()
        no_leidas = qs.filter(leida=False).count()
        return Response({
            'total': total,
            'no_leidas': no_leidas
        }, status=status.HTTP_200_OK)