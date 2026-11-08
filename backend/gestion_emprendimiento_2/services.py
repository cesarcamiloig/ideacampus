from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from gestion_administrativa.models import Usuario
from gestion_acompaniamiento.models import Mentor

from .models import Proyecto, ProyectoMentor, usuarios_con_rol_activo


def coordinadores_activos():
    """Usuarios activos con el rol 'coordinador' activo."""
    return Usuario.objects.filter(
        usuarios_con_rol_activo('coordinador')
    ).distinct().order_by('nombre')


def evaluadores_activos():
    """Usuarios activos con el rol 'evaluador' activo."""
    return Usuario.objects.filter(
        usuarios_con_rol_activo('evaluador')
    ).distinct().order_by('nombre')


def tutores_activos():
    """
    Tutores académicos activos cuyo usuario institucional tiene el rol 'tutor' activo.
    Asegura que los usuarios con rol 'tutor' activo cuenten con su perfil en el modelo Tutor.
    """
    from gestion_acompaniamiento.models import Tutor
    usuarios_tutor = Usuario.objects.filter(
        usuarios_con_rol_activo('tutor')
    ).distinct()
    for u in usuarios_tutor:
        Tutor.objects.get_or_create(usuario=u)

    return Tutor.objects.filter(
        estado="activo",
        usuario__estado="activo",
        usuario__usuariorol__rol__nombre_rol="tutor",
        usuario__usuariorol__estado="activo",
    ).select_related("usuario").distinct().order_by("usuario__nombre")


def crear_proyecto_desde_iniciativa(iniciativa, coordinador=None):
    """
    Crea oficialmente el Proyecto asociado a una iniciativa aprobada.
    Si la iniciativa ya tiene proyecto, lo retorna sin duplicarlo.
    Si se indica un coordinador, se le asigna al proyecto.
    Evaluador, tutor y mentores quedan sin asignar (se asignan manualmente).
    """
    proyecto, _ = Proyecto.objects.get_or_create(
        iniciativa=iniciativa,
        defaults={
            'nombre_proyecto': iniciativa.nombre,
            'descripcion': iniciativa.descripcion,
            'coordinador': coordinador,
        },
    )
    if coordinador is not None and proyecto.coordinador_id != coordinador.pk:
        proyecto.coordinador = coordinador
        proyecto.save(update_fields=['coordinador'])
    return proyecto


def eliminar_proyecto_de_iniciativa(iniciativa):
    """
    Elimina el Proyecto de una iniciativa rechazada (y sus asignaciones de mentores).
    Si vuelve a aprobarse, el proyecto se crea de nuevo.
    """
    Proyecto.objects.filter(iniciativa=iniciativa).delete()


def obtener_mentores_disponibles(id_proyecto=None):
    """
    Consulta y retorna los mentores activos en la plataforma.
    Si se indica un id_proyecto, excluye a los mentores que ya cuenten con
    una asignación activa (activo=True) en dicho proyecto.
    """
    qs = Mentor.objects.filter(
        estado='activo',
        usuario__estado='activo'
    ).select_related('usuario')

    if id_proyecto:
        mentores_asignados_ids = ProyectoMentor.objects.filter(
            proyecto_id=id_proyecto,
            activo=True
        ).values_list('mentor_id', flat=True)
        qs = qs.exclude(id_mentor__in=mentores_asignados_ids)

    return qs.order_by('usuario__nombre')


@transaction.atomic
def asignar_mentor_a_proyecto(id_proyecto: int, id_mentor: int, fecha_asignacion=None):
    """
    GENNOVA-80: Asigna un mentor a un proyecto.
    Reglas de negocio:
    - Valida existencia del proyecto y del mentor (activo).
    - Si la relación existe con activo=True: Lanza ValidationError.
    - Si la relación existía pero con activo=False: La reactiva (activo=True) y actualiza la fecha.
    - Si no existe: Crea el registro en ProyectoMentor con activo=True.
    
    Retorna una tupla (instancia_proyecto_mentor, fue_creado_nuevo: bool).
    """
    try:
        proyecto = Proyecto.objects.get(pk=id_proyecto)
    except Proyecto.DoesNotExist:
        raise ValidationError({"error": f"No se encontró un proyecto con el ID {id_proyecto}."})

    try:
        mentor = Mentor.objects.select_related('usuario').get(pk=id_mentor)
    except Mentor.DoesNotExist:
        raise ValidationError({"error": f"No se encontró un mentor con el ID {id_mentor}."})

    if mentor.estado != 'activo' or (mentor.usuario and mentor.usuario.estado != 'activo'):
        raise ValidationError({"error": "El mentor seleccionado no se encuentra en estado activo."})

    # Buscar si ya existe la relación (activa o inactiva)
    relacion = ProyectoMentor.objects.filter(
        proyecto=proyecto,
        mentor=mentor
    ).first()

    hoy = fecha_asignacion or timezone.now().date()

    if relacion:
        if relacion.activo:
            raise ValidationError({
                "error": f"El mentor '{mentor.usuario.nombre}' ya se encuentra asignado activamente al proyecto '{proyecto.nombre_proyecto}'."
            })
        
        # Reactivación de un registro inactivo que quedó de cuando la desasignación era un
        # soft delete; las desasignaciones nuevas eliminan el registro.
        relacion.activo = True
        relacion.fecha_asignacion = hoy
        relacion.save(update_fields=['activo', 'fecha_asignacion'])
        return relacion, False
    else:
        # Creación de nueva asignación
        relacion = ProyectoMentor.objects.create(
            proyecto=proyecto,
            mentor=mentor,
            fecha_asignacion=hoy,
            activo=True,
        )
        return relacion, True


@transaction.atomic
def desasignar_mentor_de_proyecto(id_proyecto: int, id_mentor: int):
    """
    GENNOVA-80: Quita al mentor del proyecto eliminando el registro de proyecto_mentor.
    Lanza ValidationError si el mentor no está asignado (o solo queda un registro inactivo
    de cuando la desasignación era un soft delete).

    Retorna la instancia ya eliminada, con su id original y activo=False, para que la
    respuesta conserve el mismo formato de antes.
    """
    relacion = ProyectoMentor.objects.select_related('proyecto', 'mentor__usuario').filter(
        proyecto_id=id_proyecto,
        mentor_id=id_mentor
    ).first()

    if not relacion:
        raise ValidationError({
            "error": "No existe un registro de asignación entre el proyecto y el mentor indicado."
        })

    if not relacion.activo:
        raise ValidationError({
            "error": "El mentor ya se encuentra desasignado (inactivo) de este proyecto."
        })

    id_relacion = relacion.pk
    relacion.delete()
    # delete() deja pk en None; se restaura solo para serializar la respuesta
    relacion.pk = id_relacion
    relacion.activo = False
    return relacion



# ==============================================================================
# GENNOVA-78: Lógica de Ordenamiento Cronológico y Línea de Tiempo (HU-08)
# ==============================================================================

def normalizar_fecha_cronologica(fecha):
    """
    Normaliza cualquier tipo de fecha (date, datetime naive/aware, str) a un
    datetime timezone-aware para ordenamiento seguro y consistente sin colisiones de tipo.
    """
    from datetime import date, datetime, time
    from django.utils.dateparse import parse_date, parse_datetime

    if fecha is None:
        return timezone.now()
    if isinstance(fecha, datetime):
        return timezone.make_aware(fecha) if timezone.is_naive(fecha) else fecha
    if isinstance(fecha, date):
        dt = datetime.combine(fecha, time.min)
        return timezone.make_aware(dt) if timezone.is_naive(dt) else dt
    if isinstance(fecha, str):
        parsed_dt = parse_datetime(fecha)
        if parsed_dt:
            return timezone.make_aware(parsed_dt) if timezone.is_naive(parsed_dt) else parsed_dt
        parsed_d = parse_date(fecha)
        if parsed_d:
            dt = datetime.combine(parsed_d, time.min)
            return timezone.make_aware(dt)
    return timezone.now()


def obtener_linea_tiempo_proyecto(id_proyecto=None, id_iniciativa=None, orden_ascendente=True):
    """
    GENNOVA-78 (HU-08): Consulta y compila las etapas y eventos históricos de un proyecto
    o iniciativa, retornándolos estrictamente ordenados de forma cronológica.

    Recibe el ID del proyecto o de la iniciativa, resuelve la entidad y extrae sus hitos
    y etapas (PlanTrabajo / HitoPlanTrabajo, Evaluaciones, y ciclo de vida de la Iniciativa).
    Garantiza que cada elemento contenga los campos requeridos:
    fecha, estado, responsable y observaciones.

    Parámetros:
    - id_proyecto: ID opcional del Proyecto.
    - id_iniciativa: ID opcional de la Iniciativa.
    - orden_ascendente: Si True, ordena de más antiguo a más reciente (orden cronológico estándar).
                        Si False, de más reciente a más antiguo.

    Retorna una lista de diccionarios formateados con los campos requeridos,
    o None si el proyecto/iniciativa no existe.
    """
    from gestion_convocatorias.models import Iniciativa
    from gestion_evaluacion.models import Evaluacion
    from .models import PlanTrabajo, HitoPlanTrabajo

    proyecto = None
    iniciativa = None

    if id_proyecto is not None:
        proyecto = Proyecto.objects.select_related(
            'iniciativa', 'iniciativa__usuario', 'coordinador', 'tutor__usuario'
        ).filter(pk=id_proyecto).first()
        if proyecto:
            iniciativa = proyecto.iniciativa
        else:
            iniciativa = Iniciativa.objects.select_related('usuario', 'convocatoria').filter(pk=id_proyecto).first()
            if iniciativa:
                proyecto = getattr(iniciativa, 'proyecto', None)

    elif id_iniciativa is not None:
        iniciativa = Iniciativa.objects.select_related('usuario', 'convocatoria').filter(pk=id_iniciativa).first()
        if iniciativa:
            proyecto = getattr(iniciativa, 'proyecto', None)
        else:
            proyecto = Proyecto.objects.select_related(
                'iniciativa', 'iniciativa__usuario', 'coordinador', 'tutor__usuario'
            ).filter(pk=id_iniciativa).first()
            if proyecto:
                iniciativa = proyecto.iniciativa

    if not iniciativa and not proyecto:
        return None

    eventos = []

    # 1. Hitos del Plan de Trabajo (HU-20: Hito clave o etapa estructurada)
    plan = PlanTrabajo.objects.filter(iniciativa=iniciativa).first() if iniciativa else None
    if not plan and proyecto:
        plan = PlanTrabajo.objects.filter(iniciativa=proyecto.iniciativa).first()

    if plan:
        hitos = plan.hitos.all().prefetch_related(
            'actividades__responsable__usuario',
            'actividades__entregables'
        )
        for hito in hitos:
            fecha_hito = (
                hito.fecha_completado
                if hito.completado and hito.fecha_completado
                else (normalizar_fecha_cronologica(hito.fecha_limite) if hito.fecha_limite else plan.fecha_creacion)
            )

            estado_hito = (
                "completado"
                if hito.completado
                else ("en_progreso" if hito.actividades.filter(estado="en_progreso").exists() else "pendiente")
            )

            # Responsable asignado en las actividades del hito
            actividad_con_responsable = hito.actividades.filter(
                responsable__isnull=False
            ).select_related('responsable__usuario').first()

            if actividad_con_responsable and actividad_con_responsable.responsable and actividad_con_responsable.responsable.usuario:
                responsable = actividad_con_responsable.responsable.usuario.nombre
            elif proyecto and proyecto.tutor and proyecto.tutor.usuario:
                responsable = proyecto.tutor.usuario.nombre
            elif iniciativa and iniciativa.usuario:
                responsable = iniciativa.usuario.nombre
            else:
                responsable = "Equipo Emprendedor"

            # Observaciones registradas en entregables o descripción del hito
            entregable_con_obs = None
            for act in hito.actividades.all():
                for ent in act.entregables.all():
                    if ent.observaciones:
                        entregable_con_obs = ent.observaciones
                        break
                if entregable_con_obs:
                    break

            observaciones = entregable_con_obs or hito.descripcion or f"Etapa: {hito.nombre}"

            eventos.append({
                "id_etapa": hito.id_hito,
                "nombre": hito.nombre,
                "fecha": fecha_hito,
                "estado": estado_hito,
                "responsable": responsable,
                "observaciones": observaciones,
                "tipo_evento": "hito_plan_trabajo",
                "orden": hito.orden,
            })

    # 2. Evaluaciones asociadas al proyecto
    if proyecto:
        evaluaciones = Evaluacion.objects.filter(proyecto=proyecto).select_related('subrubrica', 'evaluador')
        for ev in evaluaciones:
            subrubrica_nombre = ev.subrubrica.nombre if ev.subrubrica else "Evaluación"
            estado_eval = f"calificado (Nota: {ev.nota_final})" if ev.nota_final is not None else "en_evaluacion"
            eventos.append({
                "id_etapa": ev.subrubrica_id,
                "nombre": f"Evaluación de Etapa: {subrubrica_nombre}",
                "fecha": ev.creado,
                "estado": estado_eval,
                "responsable": ev.evaluador.nombre if ev.evaluador else "Evaluador",
                "observaciones": ev.comentario or "Evaluación registrada.",
                "tipo_evento": "evaluacion",
                "orden": ev.subrubrica.numero_hito if ev.subrubrica else None,
            })

    # 3. Eventos del ciclo de vida general (Iniciativa y Proyecto)
    if iniciativa:
        eventos.append({
            "id_etapa": iniciativa.id_iniciativa,
            "nombre": f"Postulación de Iniciativa: {iniciativa.nombre}",
            "fecha": iniciativa.fecha_postulacion,
            "estado": iniciativa.estado,
            "responsable": iniciativa.usuario.nombre if iniciativa.usuario else "Postulante",
            "observaciones": iniciativa.descripcion or (f"Etapa actual: {iniciativa.etapa_actual}" if iniciativa.etapa_actual else "Iniciativa postulada."),
            "tipo_evento": "postulacion",
            "orden": 0,
        })

    if proyecto:
        eventos.append({
            "id_etapa": proyecto.id_proyecto,
            "nombre": f"Formalización de Proyecto: {proyecto.nombre_proyecto}",
            "fecha": proyecto.creado,
            "estado": proyecto.estado,
            "responsable": proyecto.coordinador.nombre if proyecto.coordinador else "Coordinación",
            "observaciones": proyecto.descripcion or f"Proyecto institucional en estado {proyecto.estado}.",
            "tipo_evento": "creacion_proyecto",
            "orden": 1,
        })

        if proyecto.tutor and proyecto.tutor.usuario:
            eventos.append({
                "id_etapa": proyecto.tutor.id_tutor,
                "nombre": f"Asignación de Tutor: {proyecto.tutor.usuario.nombre}",
                "fecha": proyecto.creado,
                "estado": "tutor_asignado",
                "responsable": proyecto.tutor.usuario.nombre,
                "observaciones": f"Tutor asignado (Área: {proyecto.tutor.area_conocimiento or 'General'}).",
                "tipo_evento": "asignacion_tutor",
                "orden": 2,
            })

    # Ordenamiento cronológico estricto (GENNOVA-78)
    eventos.sort(
        key=lambda item: normalizar_fecha_cronologica(item.get("fecha")),
        reverse=not orden_ascendente
    )

    return eventos
