from django.db.models.signals import post_save
from django.dispatch import receiver

from gestion_convocatorias.models import Iniciativa

from .services import crear_proyecto_desde_iniciativa

ESTADOS_APROBADOS = ('aprobada', 'aceptada')


@receiver(post_save, sender=Iniciativa)
def crear_proyecto_al_aprobar(sender, instance, **kwargs):
    """
    Al aprobarse una iniciativa (desde la API, el admin de Django o cualquier otro
    lugar) se crea oficialmente su Proyecto.
    """
    if instance.estado in ESTADOS_APROBADOS:
        crear_proyecto_desde_iniciativa(instance)
