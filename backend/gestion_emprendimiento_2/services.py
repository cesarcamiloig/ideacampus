from gestion_administrativa.models import Usuario

from .models import Proyecto, usuarios_con_rol_activo


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
