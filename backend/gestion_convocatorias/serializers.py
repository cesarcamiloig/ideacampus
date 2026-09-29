from rest_framework import serializers
from .models import Convocatoria

class ConvocatoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Convocatoria
        fields = '__all__'

    # Lógica para GENNOVA-50 (Validación de consistencia de fechas)
    def validate(self, data):
        fecha_apertura = data.get('fecha_apertura')
        fecha_cierre = data.get('fecha_cierre')

        if fecha_apertura and fecha_cierre:
            if fecha_apertura >= fecha_cierre:
                raise serializers.ValidationError({
                    "fecha_cierre": "La fecha de cierre debe ser posterior a la fecha de apertura."
                })
        return data