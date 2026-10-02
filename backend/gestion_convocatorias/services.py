from datetime import timedelta
from django.utils import timezone
from gestion_administrativa.models import Usuario, UsuarioRol
from .models import Convocatoria, NotificacionConvocatoria


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
