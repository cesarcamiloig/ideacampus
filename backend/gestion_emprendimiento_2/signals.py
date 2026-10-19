from django.db.models.signals import post_save
from django.dispatch import receiver

from gestion_convocatorias.models import Iniciativa

from .services import crear_proyecto_desde_iniciativa, eliminar_proyecto_de_iniciativa

ESTADOS_APROBADOS = ('aprobada', 'aceptada')
ESTADOS_RECHAZADOS = ('rechazada',)


@receiver(post_save, sender=Iniciativa)
def sincronizar_proyecto_con_estado(sender, instance, **kwargs):
    """
    Mantiene el Proyecto sincronizado con el estado de la iniciativa (desde la API,
    el admin de Django o cualquier otro lugar):
    - Al aprobarse se crea oficialmente su Proyecto.
    - Al rechazarse se elimina su Proyecto (si se aprueba de nuevo, se vuelve a crear).
    """
    if instance.estado in ESTADOS_APROBADOS:
        crear_proyecto_desde_iniciativa(instance)
    elif instance.estado in ESTADOS_RECHAZADOS:
        eliminar_proyecto_de_iniciativa(instance)
