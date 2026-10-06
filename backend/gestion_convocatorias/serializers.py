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
    documento_adjunto = serializers.FileField(write_only=True, required=False, allow_null=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_correo = serializers.CharField(source='usuario.correo', read_only=True)
    convocatoria_nombre = serializers.CharField(source='convocatoria.nombre', read_only=True)
    convocatoria_categoria = serializers.CharField(source='convocatoria.categoria', read_only=True)
    tiene_equipo = serializers.SerializerMethodField()
    equipo_id = serializers.SerializerMethodField()
    equipo_nombre = serializers.SerializerMethodField()
    radicado = serializers.SerializerMethodField()

    class Meta:
        model = Iniciativa
        fields = [
            'id_iniciativa',
            'convocatoria',
            'convocatoria_nombre',
            'convocatoria_categoria',
            'usuario',
            'usuario_nombre',
            'usuario_correo',
            'nombre',
            'descripcion',
            'tipo',
            'origen_academico',
            'detalle_origen',
            'sector_tecnologico',
            'etapa_actual',
            'estado',
            'radicado',
            'tiene_equipo',
            'equipo_id',
            'equipo_nombre',
            'fecha_postulacion',
            'fecha_actualizacion',
            'documentos',
            'documento_adjunto',
        ]
        read_only_fields = [
            'id_iniciativa',
            'usuario',
            'fecha_postulacion',
            'fecha_actualizacion',
        ]

    def get_radicado(self, obj):
        anio = obj.fecha_postulacion.year if obj.fecha_postulacion else 2026
        return f"UFPS-POST-{anio}-{obj.id_iniciativa:04d}"

    def get_tiene_equipo(self, obj):
        return hasattr(obj, 'equipo') and obj.equipo is not None

    def get_equipo_id(self, obj):
        return obj.equipo.id_equipo if (hasattr(obj, 'equipo') and obj.equipo) else None

    def get_equipo_nombre(self, obj):
        return obj.equipo.nombre_equipo if (hasattr(obj, 'equipo') and obj.equipo) else None

    def validate_documento_adjunto(self, value):
        if not value:
            return value
        ext = os.path.splitext(value.name)[1].lower()
        # 1. Regla: Solo archivos PDF
        if ext != '.pdf':
            raise serializers.ValidationError("El documento adjunto debe ser estrictamente un archivo en formato PDF.")
        
        # 2. Regla: Tamaño máximo 10 MB
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("El archivo supera el tamaño máximo permitido de 10MB.")
        
        return value

    def validate_convocatoria(self, value):
        # 3. Regla: La convocatoria debe estar abierta al postular
        if self.instance is None and value.estado.lower() != 'abierta':
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
        archivo = validated_data.pop('documento_adjunto', None)
        # Siempre inicia en estado pendiente por defecto al postularse
        validated_data['estado'] = 'pendiente'
        iniciativa = Iniciativa.objects.create(**validated_data)
        
        if archivo:
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