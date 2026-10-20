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

