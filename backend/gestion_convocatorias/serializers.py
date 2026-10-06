import os
from rest_framework import serializers
from .models import Convocatoria, NotificacionConvocatoria, Iniciativa, DocumentoPostulacion


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


class DocumentoPostulacionSerializer(serializers.ModelSerializer):
    url_archivo = serializers.FileField(source='archivo', read_only=True)

    class Meta:
        model = DocumentoPostulacion
        fields = ['id_documento', 'nombre_original', 'extension', 'tamano_bytes', 'url_archivo', 'fecha_carga']


class IniciativaSerializer(serializers.ModelSerializer):
    documentos = DocumentoPostulacionSerializer(many=True, read_only=True)
    documento_adjunto = serializers.FileField(write_only=True, required=True)

    class Meta:
        model = Iniciativa
        fields = [
            'id_iniciativa',
            'convocatoria',
            'usuario',
            'nombre',
            'descripcion',
            'tipo',
            'origen_academico',
            'detalle_origen',
            'sector_tecnologico',
            'etapa_actual',
            'estado',
            'fecha_postulacion',
            'fecha_actualizacion',
            'documentos',
            'documento_adjunto',
        ]
        read_only_fields = ['id_iniciativa', 'usuario', 'estado', 'fecha_postulacion', 'fecha_actualizacion']

    def validate_documento_adjunto(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        # 1. Regla: Solo archivos PDF
        if ext != '.pdf':
            raise serializers.ValidationError("El documento adjunto debe ser estrictamente un archivo en formato PDF.")
        
        # 2. Regla: Tamaño máximo 10 MB
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("El archivo supera el tamaño máximo permitido de 10MB.")
        
        return value

    def validate_convocatoria(self, value):
        # 3. Regla: La convocatoria debe estar abierta
        if value.estado.lower() != 'abierta':
            raise serializers.ValidationError("No se pueden enviar iniciativas a una convocatoria que no esté abierta.")

        request = self.context.get('request')
        usuario = getattr(request, 'user', None)
        if (getattr(usuario, 'rol_activo', None) == 'estudiante' and
                Iniciativa.objects.filter(usuario=usuario, convocatoria=value).exists()):
            raise serializers.ValidationError(
                "Ya tienes una iniciativa postulada en esta convocatoria."
            )

        return value

    def create(self, validated_data):
        archivo = validated_data.pop('documento_adjunto')
        iniciativa = Iniciativa.objects.create(**validated_data)
        
        nombre_original = archivo.name
        ext = os.path.splitext(nombre_original)[1].lower().replace('.', '')
        tamano_bytes = archivo.size

        DocumentoPostulacion.objects.create(
            iniciativa=iniciativa,
            nombre_original=nombre_original,
            extension=ext,
            tamano_bytes=tamano_bytes,
            archivo=archivo
        )

        return iniciativa