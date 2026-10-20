from rest_framework import serializers
from gestion_administrativa.models import Usuario
from gestion_acompaniamiento.models import Mentor

from .models import Proyecto, ProyectoMentor


class EstudianteDisponibleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nombre', 'correo']


class ActualizarEquipoSerializer(serializers.Serializer):
    nombre_equipo = serializers.CharField(max_length=150, min_length=3, trim_whitespace=True)


class AgregarMiembroSerializer(serializers.Serializer):
    id_usuario = serializers.IntegerField()


class CrearEquipoSerializer(serializers.Serializer):
    nombre_equipo = serializers.CharField(max_length=150, min_length=3, trim_whitespace=True)
    id_usuario_lider = serializers.IntegerField()
    id_iniciativa = serializers.IntegerField(required=False, allow_null=True)
    id_usuarios = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )

    def validate(self, data):
        lider_id = data['id_usuario_lider']
        miembros_ids = data['id_usuarios']

        if lider_id not in miembros_ids:
            raise serializers.ValidationError(
                "El estudiante líder debe estar incluido en la lista de miembros."
            )

        if len(miembros_ids) != len(set(miembros_ids)):
            raise serializers.ValidationError(
                "La lista de estudiantes contiene IDs duplicados."
            )

        usuarios = Usuario.objects.filter(id_usuario__in=miembros_ids)

        if usuarios.count() != len(miembros_ids):
            encontrados = set(usuarios.values_list('id_usuario', flat=True))
            faltantes = set(miembros_ids) - encontrados
            raise serializers.ValidationError(
                f"Los siguientes usuarios no existen: {list(faltantes)}"
            )

        data['usuarios_obj'] = list(usuarios)
        return data


class MiembroEquipoSerializer(serializers.Serializer):
    id_usuario = serializers.IntegerField()
    id_estudiante = serializers.IntegerField()
    nombre = serializers.CharField()
    correo = serializers.EmailField()
    codigo = serializers.CharField(allow_null=True)
    semestre = serializers.IntegerField(allow_null=True)
    es_lider = serializers.BooleanField()


class EquipoDetalleSerializer(serializers.Serializer):
    id_equipo = serializers.IntegerField()
    nombre_equipo = serializers.CharField()
    fecha_creacion = serializers.DateTimeField()
    es_lider = serializers.BooleanField()
    lider = serializers.DictField()
    iniciativa = serializers.DictField(allow_null=True, required=False)
    miembros = MiembroEquipoSerializer(many=True)


# ==============================================================================
# GENNOVA-80: Serializadores para Gestión y Asignación de Mentores
# ==============================================================================

class MentorDisponibleSerializer(serializers.ModelSerializer):
    """
    Serializador de lectura para listar mentores disponibles en los dropdowns del frontend.
    Aplanando los datos del usuario asociado (nombre, correo) para facilitar su consumo.
    """
    id_usuario = serializers.IntegerField(source='usuario.id_usuario', read_only=True)
    nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    correo = serializers.EmailField(source='usuario.correo', read_only=True)

    class Meta:
        model = Mentor
        fields = [
            'id_mentor',
            'id_usuario',
            'nombre',
            'correo',
            'area_especializacion',
            'nivel_academico',
            'anios_experiencia',
            'biografia',
            'enlace_perfil',
            'disponibilidad',
            'estado',
        ]


class AsignarMentorSerializer(serializers.Serializer):
    """
    Serializador de entrada (POST) para validar id_proyecto e id_mentor antes de invocar el servicio.
    Garantiza que ambos identificadores existan en la base de datos y que el mentor esté activo.
    """
    id_proyecto = serializers.IntegerField(
        required=True,
        help_text="Identificador único del proyecto (iniciativa aprobada)"
    )
    id_mentor = serializers.IntegerField(
        required=True,
        help_text="Identificador único del mentor institucional"
    )

    def validate_id_proyecto(self, value):
        if not Proyecto.objects.filter(pk=value).exists():
            raise serializers.ValidationError(f"No existe un proyecto con el ID {value}.")
        return value

    def validate_id_mentor(self, value):
        mentor = Mentor.objects.filter(pk=value).select_related('usuario').first()
        if not mentor:
            raise serializers.ValidationError(f"No existe un mentor con el ID {value}.")
        if mentor.estado != 'activo' or (mentor.usuario and mentor.usuario.estado != 'activo'):
            raise serializers.ValidationError("El mentor seleccionado no se encuentra en estado activo.")
        return value


class DesasignarMentorSerializer(serializers.Serializer):
    """
    Serializador opcional para peticiones de desasignación cuando los identificadores se envían en el body.
    """
    id_proyecto = serializers.IntegerField(required=True)
    id_mentor = serializers.IntegerField(required=True)


class ProyectoMentorDetalleSerializer(serializers.ModelSerializer):
    """
    Serializador para la respuesta detallada de una asignación ProyectoMentor.
    """
    id_proyecto = serializers.IntegerField(source='proyecto.id_proyecto', read_only=True)
    nombre_proyecto = serializers.CharField(source='proyecto.nombre_proyecto', read_only=True)
    id_mentor = serializers.IntegerField(source='mentor.id_mentor', read_only=True)
    nombre_mentor = serializers.CharField(source='mentor.usuario.nombre', read_only=True)
    correo_mentor = serializers.CharField(source='mentor.usuario.correo', read_only=True)
    area_especializacion = serializers.CharField(source='mentor.area_especializacion', read_only=True)

    class Meta:
        model = ProyectoMentor
        fields = [
            'id',
            'id_proyecto',
            'nombre_proyecto',
            'id_mentor',
            'nombre_mentor',
            'correo_mentor',
            'area_especializacion',
            'fecha_asignacion',
            'activo',
        ]