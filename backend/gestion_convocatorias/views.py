from rest_framework import viewsets
from django.utils import timezone
from .models import Convocatoria
from .serializers import ConvocatoriaSerializer

class ConvocatoriaViewSet(viewsets.ModelViewSet):
    serializer_class = ConvocatoriaSerializer

    # Lógica principal para GENNOVA-50 (Cierre y Apertura Automática)
    def get_queryset(self):
        now = timezone.now()
        
        # 1. Cierre automático: Si está 'abierta' y la hora actual superó la fecha de cierre
        Convocatoria.objects.filter(
            estado='abierta', 
            fecha_cierre__lt=now
        ).update(estado='cerrada')
        
        # 2. Apertura automática: Si está 'publicada' y ya es hora de abrir
        Convocatoria.objects.filter(
            estado='publicada', 
            fecha_apertura__lte=now, 
            fecha_cierre__gt=now
        ).update(estado='abierta')

        return Convocatoria.objects.all().order_by('-fecha_creacion')