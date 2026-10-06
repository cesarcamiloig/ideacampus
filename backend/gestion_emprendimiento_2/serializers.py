from rest_framework import serializers
from gestion_administrativa.models import Usuario


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
    miembros = MiembroEquipoSerializer(many=True)