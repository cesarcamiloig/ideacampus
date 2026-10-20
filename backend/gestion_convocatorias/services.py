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


ESPECIFICACION_REGLAS_ALERTAS = {
    "estudiante": [
        {
            "evento": "vencimiento_critico_convocatoria",
            "descripcion": "Alerta cuando una convocatoria abierta se encuentra a menos de 48 horas de su fecha límite de postulación.",
            "tipo": "vencimiento_convocatoria",
            "prioridad": "alta",
            "ventana_anticipacion": "48 horas",
            "modulo_destino": "postulaciones",
        },
        {
            "evento": "recordatorio_cierre_proximo",
            "descripcion": "Recordatorio preventivo sobre el cierre de postulaciones entre 2 y 7 días previos.",
            "tipo": "vencimiento_convocatoria",
            "prioridad": "media",
            "ventana_anticipacion": "7 días",
            "modulo_destino": "postulaciones",
        },
        {
            "evento": "compromiso_documentacion_pendiente",
            "descripcion": "Recordatorio de entrega de documentación soporte y propuesta para convocatorias activas.",
            "tipo": "entrega_documentacion",
            "prioridad": "media",
            "ventana_anticipacion": "Durante vigencia de convocatoria",
            "modulo_destino": "postulaciones",
        },
        {
            "evento": "iniciativa_aprobada_sin_equipo",
            "descripcion": "Compromiso de formalización y registro del equipo emprendedor tras la aprobación de la iniciativa.",
            "tipo": "general",
            "prioridad": "alta",
            "ventana_anticipacion": "Inmediata tras aprobación",
            "modulo_destino": "equipos",
        },
    ],
    "tutor": [
        {
            "evento": "asignacion_tutoria_iniciativa",
            "descripcion": "Notificación inmediata al ser asignado como tutor académico de una iniciativa validada.",
            "tipo": "compromiso_tutoria",
            "prioridad": "alta",
            "ventana_anticipacion": "Inmediata tras asignación",
            "modulo_destino": "acompanamiento",
        },
        {
            "evento": "compromiso_registro_bitacora",
            "descripcion": "Recordatorio periódico para registrar actas de acompañamiento y acuerdos técnicos con equipos asignados.",
            "tipo": "compromiso_tutoria",
            "prioridad": "media",
            "ventana_anticipacion": "6 días",
            "modulo_destino": "acompanamiento",
        },
    ],
    "mentor": [
        {
            "evento": "asignacion_mentoria_proyecto",
            "descripcion": "Notificación al ser vinculado como mentor especializado a un proyecto en desarrollo.",
            "tipo": "compromiso_mentoria",
            "prioridad": "alta",
            "ventana_anticipacion": "Inmediata tras vinculación",
            "modulo_destino": "mentorias",
        },
        {
            "evento": "asesoria_tecnica_modelo_negocio",
            "descripcion": "Compromiso de sesión de mentoría técnica y validación de modelo de negocio.",
            "tipo": "compromiso_mentoria",
            "prioridad": "media",
            "ventana_anticipacion": "5 días",
            "modulo_destino": "mentorias",
        },
    ],
    "evaluador": [
        {
            "evento": "evaluacion_rubrica_pendiente",
            "descripcion": "Compromiso de evaluación multicriterio pendiente para iniciativas asignadas antes del dictamen final.",
            "tipo": "evaluacion_pendiente",
            "prioridad": "alta",
            "ventana_anticipacion": "4 días",
            "modulo_destino": "evaluaciones",
        },
        {
            "evento": "asignacion_evaluador_proyecto",
            "descripcion": "Notificación de designación como evaluador de una iniciativa o proyecto institucional.",
            "tipo": "evaluacion_pendiente",
            "prioridad": "alta",
            "ventana_anticipacion": "Inmediata",
            "modulo_destino": "evaluaciones",
        },
    ],
    "coordinador": [
        {
            "evento": "cierre_convocatoria_asignacion_jurados",
            "descripcion": "Alerta crítica de cierre de convocatoria para proceder con la asignación del comité evaluador y jurados.",
            "tipo": "cierre_periodo",
            "prioridad": "alta",
            "ventana_anticipacion": "48 horas / post-cierre",
            "modulo_destino": "convocatorias",
        },
        {
            "evento": "iniciativas_pendientes_revision",
            "descripcion": "Compromiso de revisión y emisión de dictamen para iniciativas radicadas en estado pendiente.",
            "tipo": "general",
            "prioridad": "alta",
            "ventana_anticipacion": "3 días",
            "modulo_destino": "convocatorias",
        },
        {
            "evento": "proyectos_pendientes_asignacion_tutor",
            "descripcion": "Alerta institucional de proyectos validados que aún no cuentan con tutor académico asignado.",
            "tipo": "general",
            "prioridad": "media",
            "ventana_anticipacion": "5 días post-aprobación",
            "modulo_destino": "emprendimientos",
        },
    ],
}


def generar_alertas_automaticas_por_rol(usuario=None):
    """
    HU-12: Generación automática de alertas sobre vencimientos y compromisos pendientes
    según el rol institucional (Estudiante, Tutor, Mentor, Evaluador, Coordinador).
    """
    now = timezone.now()
    alertas_creadas = 0

    if usuario:
        usuarios = [usuario]
    else:
        usuarios = list(Usuario.objects.filter(estado='activo'))

    convocatorias_activas = list(Convocatoria.objects.filter(estado__in=['abierta', 'publicada']))

    for user in usuarios:
        roles = list(
            UsuarioRol.objects.filter(usuario=user, estado='activo')
            .values_list('rol__nombre_rol', flat=True)
        )
        if not roles:
            roles = ['estudiante']

        roles_set = set(r.lower() for r in roles)

        # 1. EVENTOS PARA ESTUDIANTE
        if 'estudiante' in roles_set:
            # Vencimientos de convocatorias
            for conv in convocatorias_activas:
                diff = conv.fecha_cierre - now
                dias_restantes = diff.total_seconds() / 86400

                # Vencimiento crítico (< 48 horas)
                if 0 < dias_restantes <= 2:
                    titulo = f"Vencimiento Crítico: Cierre de {conv.nombre}"
                    mensaje = (
                        f"La convocatoria '{conv.nombre}' cerrará en menos de 48 horas "
                        f"({conv.fecha_cierre.strftime('%d/%m/%Y %H:%M')}). "
                        f"Verifica la radicación de tu propuesta e integrantes de equipo."
                    )
                    if not AlertaRol.objects.filter(usuario=user, convocatoria=conv, tipo='vencimiento_convocatoria', prioridad='alta').exists():
                        AlertaRol.objects.create(
                            usuario=user,
                            convocatoria=conv,
                            titulo=titulo,
                            mensaje=mensaje,
                            rol_destinatario='estudiante',
                            tipo='vencimiento_convocatoria',
                            prioridad='alta',
                            fecha_vencimiento=conv.fecha_cierre,
                            modulo_destino='postulaciones'
                        )
                        alertas_creadas += 1

                # Cierre próximo (entre 2 y 7 días)
                elif 2 < dias_restantes <= 7:
                    titulo = f"Próximo Vencimiento: {conv.nombre}"
                    mensaje = (
                        f"Quedan pocos días para el cierre de postulaciones de '{conv.nombre}' "
                        f"({conv.fecha_cierre.strftime('%d/%m/%Y %H:%M')})."
                    )
                    if not AlertaRol.objects.filter(usuario=user, convocatoria=conv, tipo='vencimiento_convocatoria', prioridad='media').exists():
                        AlertaRol.objects.create(
                            usuario=user,
                            convocatoria=conv,
                            titulo=titulo,
                            mensaje=mensaje,
                            rol_destinatario='estudiante',
                            tipo='vencimiento_convocatoria',
                            prioridad='media',
                            fecha_vencimiento=conv.fecha_cierre,
                            modulo_destino='postulaciones'
                        )
                        alertas_creadas += 1

            # Compromiso de documentación pendiente
            if convocatorias_activas:
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

            # Compromiso de formalización de equipo para iniciativa aprobada
            iniciativas_sin_equipo = Iniciativa.objects.filter(
                usuario=user,
                estado__in=['aprobada', 'aceptada'],
                equipo__isnull=True
            )
            if iniciativas_sin_equipo.exists():
                ini = iniciativas_sin_equipo.first()
                titulo = "Compromiso: Registro de Equipo Emprendedor"
                if not AlertaRol.objects.filter(usuario=user, titulo=titulo, leida=False).exists():
                    AlertaRol.objects.create(
                        usuario=user,
                        convocatoria=ini.convocatoria,
                        titulo=titulo,
                        mensaje=(
                            f"Tu iniciativa '{ini.nombre}' ha sido aprobada. Procede a conformar y formalizar "
                            f"el equipo emprendedor para continuar en el programa."
                        ),
                        rol_destinatario='estudiante',
                        tipo='general',
                        prioridad='alta',
                        fecha_vencimiento=now + timedelta(days=7),
                        modulo_destino='equipos'
                    )
                    alertas_creadas += 1

        # 2. EVENTOS PARA TUTOR
        if 'tutor' in roles_set:
            try:
                from gestion_emprendimiento_2.models import Proyecto
                proyectos_tutor = Proyecto.objects.filter(tutor__usuario=user)
                tiene_proyectos = proyectos_tutor.exists()
            except Exception:
                tiene_proyectos = False

            if tiene_proyectos or Iniciativa.objects.exists():
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

        # 3. EVENTOS PARA MENTOR
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

        # 4. EVENTOS PARA EVALUADOR
        if 'evaluador' in roles_set and (convocatorias_activas or Iniciativa.objects.filter(estado__in=['pendiente', 'en_revision', 'radicada']).exists()):
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

        # 5. EVENTOS PARA COORDINADOR / ADMIN
        if ('coordinador' in roles_set or 'admin' in roles_set):
            # Cierre de convocatoria y asignación de jurados
            if convocatorias_activas:
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

            # Iniciativas pendientes de dictamen
            iniciativas_pendientes = Iniciativa.objects.filter(estado='pendiente')
            if iniciativas_pendientes.exists():
                titulo = "Iniciativas Pendientes de Dictamen"
                if not AlertaRol.objects.filter(usuario=user, titulo=titulo, leida=False).exists():
                    cant = iniciativas_pendientes.count()
                    AlertaRol.objects.create(
                        usuario=user,
                        titulo=titulo,
                        mensaje=f"Existen {cant} iniciativa(s) en estado pendiente que requieren revisión y dictamen por la coordinación.",
                        rol_destinatario='coordinador',
                        tipo='general',
                        prioridad='alta',
                        fecha_vencimiento=now + timedelta(days=3),
                        modulo_destino='convocatorias'
                    )
                    alertas_creadas += 1

            # Proyectos validados sin tutor asignado
            try:
                from gestion_emprendimiento_2.models import Proyecto
                proyectos_sin_tutor = Proyecto.objects.filter(tutor__isnull=True)
                if proyectos_sin_tutor.exists():
                    titulo = "Asignación Pendiente: Tutores Académicos"
                    if not AlertaRol.objects.filter(usuario=user, titulo=titulo, leida=False).exists():
                        cant_p = proyectos_sin_tutor.count()
                        AlertaRol.objects.create(
                            usuario=user,
                            titulo=titulo,
                            mensaje=f"Hay {cant_p} proyecto(s) aprobado(s) sin tutor académico asignado. Asigna tutores para iniciar el acompañamiento.",
                            rol_destinatario='coordinador',
                            tipo='general',
                            prioridad='media',
                            fecha_vencimiento=now + timedelta(days=5),
                            modulo_destino='emprendimientos'
                        )
                        alertas_creadas += 1
            except Exception:
                pass

    return alertas_creadas
