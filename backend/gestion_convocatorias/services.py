from datetime import timedelta
from django.utils import timezone
from gestion_administrativa.models import Usuario, UsuarioRol
from .models import Convocatoria, NotificacionConvocatoria, AlertaRol, Iniciativa


def actualizar_estados_convocatorias():
    """
    GENNOVA-50: Actualización automática de estados según ventana temporal.
    1. Cierre automático: Si está 'abierta' y now >= fecha_cierre -> 'cerrada'
    2. Apertura automática: Si está 'publicada' y fecha_apertura <= now < fecha_cierre -> 'abierta'
       y dispara notificaciones de apertura para la comunidad universitaria.
    """
    now = timezone.now()

    # 1. Cierre automático
    convocatorias_a_cerrar = Convocatoria.objects.filter(
        estado='abierta',
        fecha_cierre__lte=now
    )
    for conv in convocatorias_a_cerrar:
        conv.estado = 'cerrada'
        conv.save(update_fields=['estado'])
        notificar_cierre(conv)

    # 2. Apertura automática
    convocatorias_a_abrir = Convocatoria.objects.filter(
        estado='publicada',
        fecha_apertura__lte=now,
        fecha_cierre__gt=now
    )
    for conv in convocatorias_a_abrir:
        conv.estado = 'abierta'
        conv.save(update_fields=['estado'])
        notificar_apertura(conv)


def notificar_apertura(convocatoria):
    """
    Emite notificaciones a los estudiantes y usuarios institucionales activos
    informando sobre la apertura de una convocatoria de emprendimiento.
    """
    # Destinatarios: usuarios activos del sistema con rol estudiante o emprendedor
    usuarios_ids = (
        UsuarioRol.objects.filter(estado='activo')
        .values_list('usuario_id', flat=True)
        .distinct()
    )
    usuarios = Usuario.objects.filter(id_usuario__in=usuarios_ids, estado='activo')

    fecha_cierre_fmt = convocatoria.fecha_cierre.strftime('%d/%m/%Y')
    titulo = f"Nueva Convocatoria: {convocatoria.nombre}"
    mensaje = (
        f"Se encuentra abierta la convocatoria institucional '{convocatoria.nombre}'. "
        f"Categoría: {convocatoria.categoria or 'General'}. "
        f"Plazo límite de postulación hasta el {fecha_cierre_fmt}."
    )

    notificaciones_a_crear = []
    for usuario in usuarios:
        # Evitar notificaciones duplicadas de apertura para el mismo usuario
        ya_notificado = NotificacionConvocatoria.objects.filter(
            convocatoria=convocatoria,
            usuario=usuario,
            tipo='apertura'
        ).exists()

        if not ya_notificado:
            notificaciones_a_crear.append(
                NotificacionConvocatoria(
                    convocatoria=convocatoria,
                    usuario=usuario,
                    titulo=titulo,
                    mensaje=mensaje,
                    tipo='apertura'
                )
            )

    if notificaciones_a_crear:
        NotificacionConvocatoria.objects.bulk_create(notificaciones_a_crear)

    return len(notificaciones_a_crear)


def notificar_cierre(convocatoria):
    """
    Emite notificación a los usuarios informando que la convocatoria ha cerrado.
    """
    usuarios = Usuario.objects.filter(estado='activo')
    titulo = f"Convocatoria Cerrada: {convocatoria.nombre}"
    mensaje = f"Ha finalizado el periodo de recepción de iniciativas para la convocatoria '{convocatoria.nombre}'."

    notificaciones_a_crear = []
    for usuario in usuarios:
        ya_notificado = NotificacionConvocatoria.objects.filter(
            convocatoria=convocatoria,
            usuario=usuario,
            tipo='cerrada'
        ).exists()

        if not ya_notificado:
            notificaciones_a_crear.append(
                NotificacionConvocatoria(
                    convocatoria=convocatoria,
                    usuario=usuario,
                    titulo=titulo,
                    mensaje=mensaje,
                    tipo='cerrada'
                )
            )

    if notificaciones_a_crear:
        NotificacionConvocatoria.objects.bulk_create(notificaciones_a_crear)

    return len(notificaciones_a_crear)


def notificar_cierre_proximo(convocatoria, dias_anticipacion=3):
    """
    Alerta a los usuarios sobre el próximo vencimiento del plazo de postulación.
    """
    now = timezone.now()
    if not (now < convocatoria.fecha_cierre <= now + timedelta(days=dias_anticipacion)):
        return 0

    usuarios = Usuario.objects.filter(estado='activo')
    fecha_cierre_fmt = convocatoria.fecha_cierre.strftime('%d/%m/%Y %H:%M')
    titulo = f"Próximo Cierre: {convocatoria.nombre}"
    mensaje = (
        f"Faltan pocos días para el cierre de '{convocatoria.nombre}'. "
        f"Recuerda radicar tu iniciativa y documentación antes del {fecha_cierre_fmt}."
    )

    notificaciones_a_crear = []
    for usuario in usuarios:
        ya_notificado = NotificacionConvocatoria.objects.filter(
            convocatoria=convocatoria,
            usuario=usuario,
            tipo='cierre_proximo'
        ).exists()

        if not ya_notificado:
            notificaciones_a_crear.append(
                NotificacionConvocatoria(
                    convocatoria=convocatoria,
                    usuario=usuario,
                    titulo=titulo,
                    mensaje=mensaje,
                    tipo='cierre_proximo'
                )
            )

    if notificaciones_a_crear:
        NotificacionConvocatoria.objects.bulk_create(notificaciones_a_crear)

    return len(notificaciones_a_crear)


def generar_alertas_automaticas_por_rol(usuario=None):
    """
    HU-12: Generación automática de alertas sobre vencimientos y compromisos pendientes
    según el rol institucional (Estudiante, Tutor, Mentor, Evaluador, Coordinador).
    """
    now = timezone.now()
    alertas_creadas = 0

    # 1. Determinar destinatarios
    if usuario:
        usuarios = [usuario]
    else:
        usuarios = list(Usuario.objects.filter(estado='activo'))

    # Convocatorias abiertas o publicadas
    convocatorias_activas = list(Convocatoria.objects.filter(estado__in=['abierta', 'publicada']))

    for user in usuarios:
        # Obtener roles activos del usuario
        roles = list(
            UsuarioRol.objects.filter(usuario=user, estado='activo')
            .values_list('rol__nombre_rol', flat=True)
        )
        if not roles:
            roles = ['estudiante']

        roles_set = set(r.lower() for r in roles)

        # A. Vencimientos de Convocatorias (Para Estudiantes y Coordinadores)
        for conv in convocatorias_activas:
            diff = conv.fecha_cierre - now
            dias_restantes = diff.total_seconds() / 86400

            # Vencimiento crítico (< 48 horas)
            if 0 < dias_restantes <= 2:
                prioridad = 'alta'
                titulo = f"Vencimiento Crítico: Cierre de {conv.nombre}"
                mensaje = (
                    f"La convocatoria '{conv.nombre}' cerrará en menos de 48 horas "
                    f"({conv.fecha_cierre.strftime('%d/%m/%Y %H:%M')}). "
                    f"Verifica la radicación de tu propuesta e integrantes de equipo."
                )
                rol_alerta = 'estudiante' if 'estudiante' in roles_set else 'coordinador'
                modulo = 'postulaciones' if 'estudiante' in roles_set else 'convocatorias'

                if not AlertaRol.objects.filter(usuario=user, convocatoria=conv, tipo='vencimiento_convocatoria', prioridad='alta').exists():
                    AlertaRol.objects.create(
                        usuario=user,
                        convocatoria=conv,
                        titulo=titulo,
                        mensaje=mensaje,
                        rol_destinatario=rol_alerta,
                        tipo='vencimiento_convocatoria',
                        prioridad=prioridad,
                        fecha_vencimiento=conv.fecha_cierre,
                        modulo_destino=modulo
                    )
                    alertas_creadas += 1

            # Cierre próximo (entre 2 y 7 días)
            elif 2 < dias_restantes <= 7:
                prioridad = 'media'
                titulo = f"Próximo Vencimiento: {conv.nombre}"
                mensaje = (
                    f"Quedan pocos días para el cierre de postulaciones de '{conv.nombre}' "
                    f"({conv.fecha_cierre.strftime('%d/%m/%Y %H:%M')})."
                )
                rol_alerta = 'estudiante' if 'estudiante' in roles_set else 'coordinador'
                modulo = 'postulaciones' if 'estudiante' in roles_set else 'convocatorias'

                if not AlertaRol.objects.filter(usuario=user, convocatoria=conv, tipo='vencimiento_convocatoria', prioridad='media').exists():
                    AlertaRol.objects.create(
                        usuario=user,
                        convocatoria=conv,
                        titulo=titulo,
                        mensaje=mensaje,
                        rol_destinatario=rol_alerta,
                        tipo='vencimiento_convocatoria',
                        prioridad=prioridad,
                        fecha_vencimiento=conv.fecha_cierre,
                        modulo_destino=modulo
                    )
                    alertas_creadas += 1

        # B. Compromisos para Evaluador (únicamente si hay convocatorias activas o iniciativas radicadas)
        if 'evaluador' in roles_set and (convocatorias_activas or Iniciativa.objects.filter(estado='radicada').exists()):
            titulo = "Compromiso Pendiente: Calificación de Iniciativas"
            if not AlertaRol.objects.filter(usuario=user, tipo='evaluacion_pendiente', leida=False).exists():
                AlertaRol.objects.create(
                    usuario=user,
                    titulo=titulo,
                    mensaje="Tienes asignaciones pendientes de evaluación con la rúbrica institucional multicriterio. Revisa las iniciativas antes del dictamen final.",
                    rol_destinatario='evaluador',
                    tipo='evaluacion_pendiente',
                    prioridad='alta',
                    fecha_vencimiento=now + timedelta(days=4),
                    modulo_destino='evaluaciones'
                )
                alertas_creadas += 1

        # C. Compromisos para Tutor Académico (únicamente si hay iniciativas registradas)
        if 'tutor' in roles_set and Iniciativa.objects.exists():
            titulo = "Compromiso de Tutoría: Registro de Bitácora"
            if not AlertaRol.objects.filter(usuario=user, tipo='compromiso_tutoria', leida=False).exists():
                AlertaRol.objects.create(
                    usuario=user,
                    titulo=titulo,
                    mensaje="Recuerda formalizar las actas de acompañamiento y acuerdos técnicos alcanzados con tus equipos asignados para el periodo académico actual.",
                    rol_destinatario='tutor',
                    tipo='compromiso_tutoria',
                    prioridad='media',
                    fecha_vencimiento=now + timedelta(days=6),
                    modulo_destino='acompanamiento'
                )
                alertas_creadas += 1

        # D. Compromisos para Mentor Especializado (únicamente si hay iniciativas en etapas avanzadas)
        if 'mentor' in roles_set and Iniciativa.objects.filter(estado__in=['aprobada', 'aceptada']).exists():
            titulo = "Compromiso de Mentoría: Asesoría Técnica y de Negocio"
            if not AlertaRol.objects.filter(usuario=user, tipo='compromiso_mentoria', leida=False).exists():
                AlertaRol.objects.create(
                    usuario=user,
                    titulo=titulo,
                    mensaje="Tienes sesiones de mentoría programadas para validar la viabilidad técnica y modelo de negocio de los prototipos en desarrollo.",
                    rol_destinatario='mentor',
                    tipo='compromiso_mentoria',
                    prioridad='media',
                    fecha_vencimiento=now + timedelta(days=5),
                    modulo_destino='mentorias'
                )
                alertas_creadas += 1

        # E. Compromisos para Estudiante Emprendedor (únicamente si hay convocatorias activas)
        if 'estudiante' in roles_set and convocatorias_activas:
            # Alerta sobre documentación y equipo para la convocatoria activa
            primera_conv = convocatorias_activas[0]
            titulo = f"Compromiso de Postulación: {primera_conv.nombre}"
            if not AlertaRol.objects.filter(usuario=user, tipo='entrega_documentacion', leida=False).exists():
                AlertaRol.objects.create(
                    usuario=user,
                    convocatoria=primera_conv,
                    titulo=titulo,
                    mensaje=f"Verifica los requisitos y la radicación de tu propuesta e integrantes para '{primera_conv.nombre}'.",
                    rol_destinatario='estudiante',
                    tipo='entrega_documentacion',
                    prioridad='media',
                    fecha_vencimiento=primera_conv.fecha_cierre,
                    modulo_destino='postulaciones'
                )
                alertas_creadas += 1

        # F. Compromisos para Coordinador de Emprendimiento (únicamente si hay convocatorias activas)
        if ('coordinador' in roles_set or 'admin' in roles_set) and convocatorias_activas:
            titulo = "Supervisión Institucional: Cierre y Asignación de Jurados"
            if not AlertaRol.objects.filter(usuario=user, tipo='cierre_periodo', leida=False).exists():
                AlertaRol.objects.create(
                    usuario=user,
                    titulo=titulo,
                    mensaje="Monitorea las postulaciones radicadas en las convocatorias activas para proceder con la asignación del comité evaluador.",
                    rol_destinatario='coordinador',
                    tipo='cierre_periodo',
                    prioridad='alta',
                    fecha_vencimiento=now + timedelta(days=2),
                    modulo_destino='convocatorias'
                )
                alertas_creadas += 1

    return alertas_creadas

