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


class EntregableSerializer(serializers.ModelSerializer):
    """
    HU-20: Serializador para entregables y evidencias asociadas a actividades.
    """
    id_actividad = serializers.IntegerField(source="actividad_id", read_only=True)
    id_plan_trabajo = serializers.IntegerField(source="plan_trabajo_id", read_only=True)
    actividad_nombre = serializers.CharField(source="actividad.nombre", read_only=True)

    class Meta:
        from .models import EntregableActividad
        model = EntregableActividad
        fields = [
            "id_entregable",
            "id_actividad",
            "actividad_nombre",
            "id_plan_trabajo",
            "nombre",
            "descripcion",
            "fecha_limite",
            "tipo",
            "archivo",
            "enlace",
            "estado",
            "observaciones",
            "fecha_entrega",
            "fecha_creacion",
        ]
        read_only_fields = ["id_entregable", "fecha_creacion"]


class ActividadPlanTrabajoSerializer(serializers.ModelSerializer):
    """
    HU-20: Serializador de actividades del plan de trabajo con responsable y entregables.
    """
    id_plan_trabajo = serializers.IntegerField(source="plan_trabajo_id", read_only=True)
    id_hito = serializers.IntegerField(source="hito_id", required=False, allow_null=True)
    hito_nombre = serializers.CharField(source="hito.nombre", read_only=True)
    id_responsable = serializers.IntegerField(source="responsable_id", required=False, allow_null=True)
    responsable_nombre = serializers.CharField(source="responsable.usuario.nombre", read_only=True)
    responsable_correo = serializers.CharField(source="responsable.usuario.correo", read_only=True)
    entregables = EntregableSerializer(many=True, read_only=True)

    class Meta:
        from .models import ActividadPlanTrabajo
        model = ActividadPlanTrabajo
        fields = [
            "id_actividad",
            "id_plan_trabajo",
            "id_hito",
            "hito_nombre",
            "id_responsable",
            "responsable_nombre",
            "responsable_correo",
            "nombre",
            "descripcion",
            "fecha_inicio",
            "fecha_fin",
            "prioridad",
            "estado",
            "entregables",
            "fecha_creacion",
            "fecha_actualizacion",
        ]
        read_only_fields = ["id_actividad", "fecha_creacion", "fecha_actualizacion"]

    def validate(self, attrs):
        inicio = attrs.get("fecha_inicio")
        fin = attrs.get("fecha_fin")
        if inicio and fin and fin < inicio:
            raise serializers.ValidationError(
                {"fecha_fin": "La fecha de finalización no puede ser anterior a la fecha de inicio."}
            )
        return attrs


class HitoPlanTrabajoSerializer(serializers.ModelSerializer):
    """
    HU-20: Serializador de hitos o fases del plan de trabajo.
    """
    id_plan_trabajo = serializers.IntegerField(source="plan_trabajo_id", read_only=True)
    total_actividades = serializers.SerializerMethodField()
    actividades_completadas = serializers.SerializerMethodField()

    class Meta:
        from .models import HitoPlanTrabajo
        model = HitoPlanTrabajo
        fields = [
            "id_hito",
            "id_plan_trabajo",
            "nombre",
            "descripcion",
            "fecha_limite",
            "orden",
            "completado",
            "fecha_completado",
            "total_actividades",
            "actividades_completadas",
        ]
        read_only_fields = ["id_hito"]

    def get_total_actividades(self, obj):
        return obj.actividades.count()

    def get_actividades_completadas(self, obj):
        return obj.actividades.filter(estado="completada").count()


class PlanTrabajoDetalleSerializer(serializers.ModelSerializer):
    """
    HU-20: Serializador detallado del Plan de Trabajo completo para seguimiento y gestión.
    """
    id_iniciativa = serializers.IntegerField(source="iniciativa_id", read_only=True)
    iniciativa_nombre = serializers.CharField(source="iniciativa.nombre", read_only=True)
    id_proyecto = serializers.SerializerMethodField()
    id_equipo = serializers.SerializerMethodField()
    equipo_nombre = serializers.SerializerMethodField()
    hitos = HitoPlanTrabajoSerializer(many=True, read_only=True)
    actividades = ActividadPlanTrabajoSerializer(many=True, read_only=True)
    entregables = EntregableSerializer(many=True, read_only=True)
    total_actividades = serializers.SerializerMethodField()
    actividades_completadas = serializers.SerializerMethodField()
    porcentaje_avance = serializers.SerializerMethodField()

    class Meta:
        from .models import PlanTrabajo
        model = PlanTrabajo
        fields = [
            "id_plan_trabajo",
            "id_iniciativa",
            "iniciativa_nombre",
            "id_proyecto",
            "id_equipo",
            "equipo_nombre",
            "titulo",
            "descripcion",
            "estado",
            "fecha_inicio",
            "fecha_fin",
            "total_actividades",
            "actividades_completadas",
            "porcentaje_avance",
            "hitos",
            "actividades",
            "entregables",
            "fecha_creacion",
            "fecha_actualizacion",
        ]
        read_only_fields = ["id_plan_trabajo", "fecha_creacion", "fecha_actualizacion"]

    def get_id_proyecto(self, obj):
        p = obj.proyecto
        return p.id_proyecto if p else None

    def get_id_equipo(self, obj):
        e = obj.equipo
        return e.id_equipo if e else None

    def get_equipo_nombre(self, obj):
        e = obj.equipo
        return e.nombre_equipo if e else None

    def get_total_actividades(self, obj):
        return obj.actividades.count()

    def get_actividades_completadas(self, obj):
        return obj.actividades.filter(estado="completada").count()

    def get_porcentaje_avance(self, obj):
        total = obj.actividades.count()
        if total == 0:
            return 0.0
        completadas = obj.actividades.filter(estado="completada").count()
        return round((completadas / total) * 100.0, 1)


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


# ==============================================================================
# GENNOVA-77 / GENNOVA-78: Serializador para Línea de Tiempo Evolutiva (HU-08)
# ==============================================================================

class EtapaLineaTiempoSerializer(serializers.Serializer):
    """
    GENNOVA-77 / GENNOVA-78: Serializador de lectura para formatear las etapas
    o hitos evolutivos de la línea de tiempo de un proyecto/iniciativa.
    Garantiza los campos requeridos por negocio: fecha, estado, responsable y observaciones.
    """
    id_etapa = serializers.IntegerField(required=False, allow_null=True)
    nombre = serializers.CharField(max_length=250, required=False, allow_blank=True)
    fecha = serializers.DateTimeField(allow_null=True, required=False)
    estado = serializers.CharField(max_length=50)
    responsable = serializers.CharField(max_length=200, allow_null=True, allow_blank=True)
    observaciones = serializers.CharField(allow_null=True, allow_blank=True)
    tipo_evento = serializers.CharField(max_length=50, required=False, allow_blank=True)
    orden = serializers.IntegerField(required=False, allow_null=True)
