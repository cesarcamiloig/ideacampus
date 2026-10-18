from django.db import transaction
from datetime import timedelta
from django.db.models import Q
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from gestion_administrativa.authentication import JWTAuthentication
from gestion_administrativa.permissions import TieneRolPermitido
from gestion_emprendimiento_2.services import (
    coordinadores_activos,
    crear_proyecto_desde_iniciativa,
)
from .models import Convocatoria, Iniciativa, NotificacionConvocatoria, AlertaRol
from .serializers import (
    ConvocatoriaSerializer,
    IniciativaSerializer,
    NotificacionConvocatoriaSerializer,
    AlertaRolSerializer,
)
from .services import (
    actualizar_estados_convocatorias,
    notificar_apertura,
    notificar_cierre,
    generar_alertas_automaticas_por_rol,
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
    roles_permitidos = [
        "admin",
        "coordinador",
        "direccion_del_programa",
        "direccion",
    ]

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
        roles_gestores = [
            'admin',
            'coordinador',
            'direccion_del_programa',
            'direccion',
        ]
        es_gestor = any(rol in roles_usuario for rol in roles_gestores) or (
            rol_activo in roles_gestores
        )

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


class AlertaRolViewSet(viewsets.ModelViewSet):
    """
    HU-12: Gestión integral de alertas automáticas sobre vencimientos y compromisos
    organizadas por fecha, prioridad y estado de lectura para los roles institucionales.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AlertaRolSerializer

    def get_queryset(self):
        user = self.request.user
        # Sincronizar alertas automáticas si no tiene ninguna registrada aún
        if not AlertaRol.objects.filter(usuario=user).exists():
            generar_alertas_automaticas_por_rol(user)

        qs = AlertaRol.objects.filter(usuario=user)

        # Filtro por estado de lectura: leida = 'true' / 'false'
        leida = self.request.query_params.get('leida')
        if leida is not None:
            if leida.lower() in ['true', '1']:
                qs = qs.filter(leida=True)
            elif leida.lower() in ['false', '0']:
                qs = qs.filter(leida=False)

        # Filtro por prioridad: 'alta', 'media', 'baja'
        prioridad = self.request.query_params.get('prioridad')
        if prioridad:
            qs = qs.filter(prioridad=prioridad.lower())

        # Filtro por tipo de alerta
        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo)

        # Filtro por rol_destinatario
        rol = self.request.query_params.get('rol')
        if rol and rol.lower() != 'todos':
            qs = qs.filter(Q(rol_destinatario=rol.lower()) | Q(rol_destinatario='todos'))

        # Filtro por ventana temporal de fecha de vencimiento
        ventana = self.request.query_params.get('ventana_fecha')
        now = timezone.now()
        if ventana == 'hoy_48h':
            qs = qs.filter(fecha_vencimiento__gte=now, fecha_vencimiento__lte=now + timedelta(days=2))
        elif ventana == 'semana':
            qs = qs.filter(fecha_vencimiento__gte=now, fecha_vencimiento__lte=now + timedelta(days=7))
        elif ventana == 'proximas':
            qs = qs.filter(fecha_vencimiento__gt=now + timedelta(days=7))
        elif ventana == 'vencidas':
            qs = qs.filter(fecha_vencimiento__lt=now)

        # Búsqueda por texto (q)
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(Q(titulo__icontains=q) | Q(mensaje__icontains=q))

        # Ordenamiento dinámico
        orden = self.request.query_params.get('orden', 'fecha_vencimiento')
        if orden == 'vencimiento_asc':
            qs = qs.order_by('fecha_vencimiento')
        elif orden == 'vencimiento_desc':
            qs = qs.order_by('-fecha_vencimiento')
        elif orden == 'recientes':
            qs = qs.order_by('-fecha_creacion')
        elif orden == 'prioridad':
            qs = qs.order_by('prioridad', 'fecha_vencimiento')
        else:
            qs = qs.order_by('fecha_vencimiento', '-fecha_creacion')

        return qs

    @action(detail=True, methods=['patch', 'post'])
    def leer(self, request, pk=None):
        """
        Marca o alterna una alerta como leída/no leída.
        """
        alerta = self.get_object()
        nueva_leida = request.data.get('leida', True)
        if isinstance(nueva_leida, str):
            nueva_leida = nueva_leida.lower() in ['true', '1']
        alerta.leida = bool(nueva_leida)
        alerta.save(update_fields=['leida'])
        return Response(self.get_serializer(alerta).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def marcar_todas_leidas(self, request):
        """
        Marca todas las alertas pendientes del usuario como leídas.
        """
        actualizadas = AlertaRol.objects.filter(
            usuario=request.user,
            leida=False
        ).update(leida=True)
        return Response({
            'mensaje': 'Todas las alertas han sido marcadas como leídas.',
            'actualizadas': actualizadas
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def sincronizar(self, request):
        """
        Revalida las convocatorias y compromisos y genera alertas automáticas frescas.
        """
        actualizar_estados_convocatorias()
        generadas = generar_alertas_automaticas_por_rol(request.user)
        return Response({
            'mensaje': 'Alertas automáticas sincronizadas con éxito.',
            'alertas_generadas': generadas
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Indicadores consolidados para badges, campana y tarjetas superiores de KPI.
        """
        qs = AlertaRol.objects.filter(usuario=request.user)
        rol = request.query_params.get('rol')
        if rol and rol.lower() != 'todos':
            qs = qs.filter(Q(rol_destinatario=rol.lower()) | Q(rol_destinatario='todos'))
        now = timezone.now()
        total = qs.count()
        no_leidas = qs.filter(leida=False).count()
        alta_prioridad = qs.filter(prioridad='alta').count()
        proximas_a_vencer = qs.filter(
            fecha_vencimiento__gte=now,
            fecha_vencimiento__lte=now + timedelta(days=7)
        ).count()
        vencidas = qs.filter(fecha_vencimiento__lt=now).count()

        return Response({
            'total': total,
            'no_leidas': no_leidas,
            'alta_prioridad': alta_prioridad,
            'proximas_a_vencer': proximas_a_vencer,
            'vencidas': vencidas
        }, status=status.HTTP_200_OK)


class IniciativaViewSet(viewsets.ModelViewSet):
    """
    Gestión de postulaciones e iniciativas de estudiantes (HU-03).
    - Los estudiantes solo pueden consultar sus propias postulaciones y radicar si son estudiantes activos.
    - La Dirección del Programa y los administradores pueden ver todas las iniciativas y aprobarlas/rechazarlas.
    - Notifica automáticamente al estudiante tras radicar o tras cambio de estado.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = IniciativaSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def _es_gestor(self, usuario):
        roles_usuario = getattr(usuario, 'roles_asignados', [])
        rol_activo = getattr(usuario, 'rol_activo', '')
        roles_gestores = ['admin', 'direccion_del_programa', 'direccion']
        return any(rol in roles_usuario for rol in roles_gestores) or (
            rol_activo in roles_gestores
        )

    def get_queryset(self):
        usuario = self.request.user
        if self._es_gestor(usuario):
            return Iniciativa.objects.all().select_related('convocatoria', 'usuario').prefetch_related('documentos').order_by('-fecha_postulacion')
        return Iniciativa.objects.filter(usuario=usuario).select_related('convocatoria', 'usuario').prefetch_related('documentos').order_by('-fecha_postulacion')

    def perform_create(self, serializer):
        usuario = self.request.user
        from gestion_administrativa.models import UsuarioRol
        roles_usuario = getattr(usuario, 'roles_asignados', [])
        rol_activo = getattr(usuario, 'rol_activo', '')
        
        es_estudiante = ('estudiante' in roles_usuario or rol_activo == 'estudiante' or
                         UsuarioRol.objects.filter(usuario=usuario, rol__nombre_rol='estudiante', estado='activo').exists())
        
        if not es_estudiante:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Solo los estudiantes con rol activo pueden postular y registrar iniciativas.")

        iniciativa = serializer.save(usuario=usuario, estado='pendiente')

        # Notificación institucional al estudiante
        NotificacionConvocatoria.objects.create(
            convocatoria=iniciativa.convocatoria,
            usuario=usuario,
            titulo="Iniciativa Radicada Exitosamente",
            mensaje=f"Tu iniciativa '{iniciativa.nombre}' ha sido radicada correctamente con radicado UFPS-POST-{iniciativa.fecha_postulacion.year}-{iniciativa.id_iniciativa:04d}.",
            tipo="actualizacion"
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        es_gestor = self._es_gestor(request.user)

        # Si el usuario NO es gestor y pretende cambiar el estado, se rechaza
        if 'estado' in request.data and not es_gestor:
            return Response(
                {"error": "Solo la Dirección del Programa o un administrador puede modificar el estado de evaluación de una iniciativa."},
                status=status.HTTP_403_FORBIDDEN
            )

        estado_anterior = instance.estado
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        # Si queda aprobada, la señal post_save crea su Proyecto en la misma transacción
        with transaction.atomic():
            iniciativa = serializer.save()

        # Si cambió el estado, notificar al estudiante
        if es_gestor and 'estado' in request.data and iniciativa.estado != estado_anterior:
            self._notificar_cambio_estado(iniciativa, estado_anterior, iniciativa.estado)

        return Response(serializer.data)

    def _notificar_cambio_estado(self, iniciativa, anterior, nuevo):
        nuevo_norm = nuevo.lower().strip()
        if nuevo_norm in ['aprobada', 'aprobado', 'aceptada', 'aceptado', 'validada', 'validado']:
            titulo = "¡Iniciativa Aprobada!"
            mensaje = f"¡Felicitaciones! Tu iniciativa '{iniciativa.nombre}' ha sido aprobada por la Dirección del Programa. Ya puedes proceder a conformar y registrar tu Equipo Emprendedor."
            tipo = "apertura"
        elif nuevo_norm in ['rechazada', 'rechazado']:
            titulo = "Iniciativa No Seleccionada"
            mensaje = f"Tu iniciativa '{iniciativa.nombre}' ha sido evaluada y marcada como no seleccionada en esta convocatoria."
            tipo = "cerrada"
        else:
            titulo = f"Actualización de Iniciativa: {nuevo.capitalize()}"
            mensaje = f"El estado de tu iniciativa '{iniciativa.nombre}' ha cambiado a '{nuevo}'."
            tipo = "actualizacion"

        NotificacionConvocatoria.objects.create(
            convocatoria=iniciativa.convocatoria,
            usuario=iniciativa.usuario,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo
        )

    @action(detail=True, methods=['patch', 'post'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        iniciativa = self.get_object()
        if not self._es_gestor(request.user):
            return Response(
                {"error": "Solo la Dirección del Programa o un administrador puede modificar el estado de una iniciativa."},
                status=status.HTTP_403_FORBIDDEN
            )

        nuevo_estado = request.data.get('estado', '').strip().lower()
        if nuevo_estado in ['aprobada', 'aprobado', 'aceptada', 'aceptado', 'validada']:
            nuevo_estado = 'aprobada'
        elif nuevo_estado in ['rechazada', 'rechazado']:
            nuevo_estado = 'rechazada'
        elif nuevo_estado in ['en_revision', 'revision']:
            nuevo_estado = 'en_revision'
        elif nuevo_estado in ['pendiente']:
            nuevo_estado = 'pendiente'
        else:
            return Response(
                {"error": f"Estado no válido: '{nuevo_estado}'. Debe ser 'pendiente', 'en_revision', 'aprobada' o 'rechazada'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Al aprobar se debe elegir el coordinador que quedará a cargo del proyecto
        coordinador = None
        if nuevo_estado == 'aprobada':
            id_coordinador = request.data.get('id_coordinador')
            if not id_coordinador:
                return Response(
                    {"error": "Debe seleccionar un coordinador para aprobar la iniciativa."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            coordinador = coordinadores_activos().filter(pk=id_coordinador).first()
            if coordinador is None:
                return Response(
                    {"error": "El usuario seleccionado no es un coordinador activo."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        estado_anterior = iniciativa.estado
        iniciativa.estado = nuevo_estado
        # Al aprobarse, la señal post_save crea oficialmente su Proyecto
        with transaction.atomic():
            iniciativa.save(update_fields=['estado', 'fecha_actualizacion'])
            if coordinador is not None:
                crear_proyecto_desde_iniciativa(iniciativa, coordinador=coordinador)

        self._notificar_cambio_estado(iniciativa, estado_anterior, nuevo_estado)

        return Response(self.get_serializer(iniciativa).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='coordinadores')
    def coordinadores(self, request):
        """Lista de coordinadores activos para asignar al proyecto al aprobar una iniciativa."""
        if not self._es_gestor(request.user):
            return Response(
                {"error": "Solo la Dirección del Programa o un administrador puede consultar los coordinadores."},
                status=status.HTTP_403_FORBIDDEN
            )
        data = [
            {"id_usuario": u.id_usuario, "nombre": u.nombre, "correo": u.correo}
            for u in coordinadores_activos()
        ]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='mis-aprobadas')
    def mis_aprobadas(self, request):
        """
        Retorna las iniciativas aprobadas del estudiante que aún NO tienen un equipo asociado,
        habilitadas para crear equipo emprendedor (HU-04).
        """
        usuario = request.user
        estados_aprobados = ['aprobada', 'aprobado', 'aceptada', 'aceptado', 'validada', 'validado']
        
        iniciativas = Iniciativa.objects.filter(
            usuario=usuario,
            estado__in=estados_aprobados,
            equipo__isnull=True
        ).order_by('-fecha_postulacion')
        
        serializer = self.get_serializer(iniciativas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def documento(self, request, pk=None):
        iniciativa = self.get_object()
        documento = iniciativa.documentos.first()
        if (
            not documento
            or not documento.archivo
            or not documento.archivo.storage.exists(documento.archivo.name)
        ):
            return Response(
                {'error': 'La iniciativa no tiene un documento adjunto.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return FileResponse(
            documento.archivo.open('rb'),
            as_attachment=True,
            filename=documento.nombre_original,
            content_type='application/pdf',
        )
