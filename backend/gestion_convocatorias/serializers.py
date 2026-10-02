from rest_framework import serializers
from .models import Convocatoria, NotificacionConvocatoria


class ConvocatoriaSerializer(serializers.ModelSerializer):
    creador_nombre = serializers.SerializerMethodField(read_only=True)
    periodo_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Convocatoria
        fields = [
            'id_convocatoria',
            'nombre',
            'descripcion',
            'categoria',
            'requisitos_documentacion',
            'criterios_evaluacion',
            'fecha_apertura',
            'fecha_cierre',
            'estado',
            'fecha_creacion',
            'creador',
            'creador_nombre',
            'periodo',
            'periodo_nombre',
        ]
        read_only_fields = ['id_convocatoria', 'fecha_creacion', 'creador']

    def get_creador_nombre(self, obj):
        return obj.creador.nombre if obj.creador else None

    def get_periodo_nombre(self, obj):
        return obj.periodo.nombre if obj.periodo else None

    def validate_nombre(self, value):
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("El nombre de la convocatoria debe tener al menos 3 caracteres.")
        return value.strip()

    # Lógica para GENNOVA-50 (Validación de consistencia de fechas)
    def validate(self, data):
        fecha_apertura = data.get('fecha_apertura') or getattr(self.instance, 'fecha_apertura', None)
        fecha_cierre = data.get('fecha_cierre') or getattr(self.instance, 'fecha_cierre', None)

        if fecha_apertura and fecha_cierre:
            if fecha_apertura >= fecha_cierre:
                raise serializers.ValidationError({
                    "fecha_cierre": "La fecha de cierre debe ser posterior a la fecha de apertura."
                })
        return data


class NotificacionConvocatoriaSerializer(serializers.ModelSerializer):
    convocatoria_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = NotificacionConvocatoria
        fields = [
            'id_notificacion',
            'convocatoria',
            'convocatoria_nombre',
            'usuario',
            'titulo',
            'mensaje',
            'tipo',
            'leida',
            'fecha_creacion',
        ]
        read_only_fields = ['id_notificacion', 'convocatoria', 'usuario', 'titulo', 'mensaje', 'tipo', 'fecha_creacion']

    def get_convocatoria_nombre(self, obj):
        return obj.convocatoria.nombre if obj.convocatoria else None