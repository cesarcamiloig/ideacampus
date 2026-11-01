from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from gestion_administrativa.models import Usuario
from gestion_acompaniamiento.models import Mentor
from gestion_evaluacion.models import SubRubrica
from .models import Actividad, PlanTrabajo, Proyecto, ProyectoMentor
from .services import es_integrante_del_equipo, es_lider_del_proyecto


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
# HU-20: Planes de trabajo (uno por hito) y sus actividades
# ==============================================================================

def validar_fechas(attrs, instancia):
    fecha_inicio = attrs.get("fecha_inicio", getattr(instancia, "fecha_inicio", None))
    fecha_fin = attrs.get("fecha_fin", getattr(instancia, "fecha_fin", None))
    if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
        raise serializers.ValidationError(
            {"fecha_fin": "No puede ser anterior a la fecha de inicio."})


def validar_lider(usuario, proyecto):
    if not es_lider_del_proyecto(usuario, proyecto):
        raise PermissionDenied("Solo el líder del equipo puede gestionar el plan de trabajo del proyecto.")


class PlanTrabajoSerializer(serializers.ModelSerializer):
    proyecto = serializers.PrimaryKeyRelatedField(
        queryset=Proyecto.objects.select_related("iniciativa"))
    hito = serializers.PrimaryKeyRelatedField(
        queryset=SubRubrica.objects.select_related("rubrica"),
        error_messages={"does_not_exist": "El hito {pk_value} no existe."})
    proyecto_nombre = serializers.CharField(source="proyecto.nombre_proyecto", read_only=True)
    hito_nombre = serializers.CharField(source="hito.nombre", read_only=True)
    numero_hito = serializers.IntegerField(source="hito.numero_hito", read_only=True)
    total_actividades = serializers.SerializerMethodField()
    actividades_completadas = serializers.SerializerMethodField()

    class Meta:
        model = PlanTrabajo
        fields = ["id_plan_trabajo", "proyecto", "proyecto_nombre", "hito", "hito_nombre",
                  "numero_hito", "titulo", "descripcion", "estado", "fecha_inicio", "fecha_fin",
                  "total_actividades", "actividades_completadas",
                  "fecha_creacion", "fecha_actualizacion"]
        read_only_fields = ["fecha_creacion", "fecha_actualizacion"]
        # La unicidad proyecto + hito se valida abajo con un mensaje propio
        validators = []

    def get_total_actividades(self, obj):
        return obj.actividades.count()

    def get_actividades_completadas(self, obj):
        return obj.actividades.filter(estado=Actividad.Estado.COMPLETADA).count()

    def validate(self, attrs):
        instancia = self.instance
        if instancia:
            for campo in ("proyecto", "hito"):
                if campo in attrs and getattr(attrs[campo], "pk") != getattr(instancia, f"{campo}_id"):
                    raise serializers.ValidationError(
                        {campo: f"No se puede cambiar el {campo} de un plan de trabajo."})
        proyecto = attrs.get("proyecto", getattr(instancia, "proyecto", None))
        hito = attrs.get("hito", getattr(instancia, "hito", None))

        validar_lider(self.context["request"].user, proyecto)

        if hito.rubrica.tipo_iniciativa != proyecto.iniciativa.tipo:
            raise serializers.ValidationError(
                {"hito": "El hito no pertenece a la rúbrica de este tipo de proyecto."})
        if not instancia and PlanTrabajo.objects.filter(proyecto=proyecto, hito=hito).exists():
            raise serializers.ValidationError(
                {"hito": "El proyecto ya tiene un plan de trabajo para este hito."})

        validar_fechas(attrs, instancia)
        return attrs


class ActividadSerializer(serializers.ModelSerializer):
    plan_trabajo = serializers.PrimaryKeyRelatedField(
        queryset=PlanTrabajo.objects.select_related("proyecto__iniciativa", "hito"),
        error_messages={"does_not_exist": "El plan de trabajo {pk_value} no existe."})
    responsable = serializers.PrimaryKeyRelatedField(queryset=Usuario.objects.all())
    proyecto = serializers.IntegerField(source="plan_trabajo.proyecto_id", read_only=True)
    hito = serializers.IntegerField(source="plan_trabajo.hito_id", read_only=True)
    hito_nombre = serializers.CharField(source="plan_trabajo.hito.nombre", read_only=True)
    responsable_nombre = serializers.CharField(source="responsable.nombre", read_only=True)
    creado_por_nombre = serializers.CharField(source="creado_por.nombre", read_only=True)

    class Meta:
        model = Actividad
        fields = ["id", "plan_trabajo", "proyecto", "hito", "hito_nombre",
                  "responsable", "responsable_nombre", "creado_por", "creado_por_nombre",
                  "nombre", "descripcion", "entregable", "fecha_inicio", "fecha_fin",
                  "estado", "fecha_completada", "creado"]
        # El estado arranca en "pendiente" y solo cambia al subir la evidencia
        read_only_fields = ["creado_por", "estado", "fecha_completada", "creado"]

    def validate(self, attrs):
        instancia = self.instance
        plan = attrs.get("plan_trabajo", getattr(instancia, "plan_trabajo", None))
        if instancia and plan.pk != instancia.plan_trabajo_id:
            raise serializers.ValidationError(
                {"plan_trabajo": "No se puede cambiar el plan de trabajo de una actividad."})
        proyecto = plan.proyecto

        validar_lider(self.context["request"].user, proyecto)

        responsable = attrs.get("responsable", getattr(instancia, "responsable", None))
        if not es_integrante_del_equipo(responsable, proyecto):
            raise serializers.ValidationError(
                {"responsable": "El responsable debe ser integrante del equipo del proyecto."})

        validar_fechas(attrs, instancia)
        return attrs

    def create(self, validated_data):
        return Actividad.objects.create(creado_por=self.context["request"].user, **validated_data)


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
