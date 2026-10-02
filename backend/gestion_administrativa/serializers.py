from rest_framework import serializers
from .models import VariableCaracterizacion, PeriodoAcademico, Usuario, Rol, UsuarioRol


class VariableCaracterizacionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="id_variable", read_only=True)
    name = serializers.CharField(source="nombre")
    description = serializers.CharField(
        source="descripcion", required=False, allow_blank=True, allow_null=True
    )
    type = serializers.CharField(source="tipo_dato", default="Texto", required=False)
    isActive = serializers.SerializerMethodField()
    createdAt = serializers.SerializerMethodField()
    hasActiveInitiatives = serializers.SerializerMethodField()

    class Meta:
        model = VariableCaracterizacion
        fields = [
            "id",
            "id_variable",
            "name",
            "nombre",
            "description",
            "descripcion",
            "type",
            "tipo_dato",
            "opciones",
            "obligatoria",
            "orden",
            "estado",
            "isActive",
            "createdAt",
            "hasActiveInitiatives",
        ]
        extra_kwargs = {
            "nombre": {"required": False},
            "tipo_dato": {"required": False},
        }

    def get_isActive(self, obj):
        return obj.estado == "activo"

    def get_createdAt(self, obj):
        # Como VariableCaracterizacion no tiene auto_now_add histórico, devolvemos fecha estándar
        return "15/05/2026"

    def get_hasActiveInitiatives(self, obj):
        return False

    def validate(self, attrs):
        # Soporta name o nombre
        nombre = attrs.get("nombre")
        if not nombre:
            raise serializers.ValidationError({"name": "El nombre de la variable es obligatorio."})
        if len(nombre.strip()) < 3:
            raise serializers.ValidationError({"name": "El nombre debe tener al menos 3 caracteres."})

        # Asignar tipo_dato por defecto si no viene
        if not attrs.get("tipo_dato"):
            attrs["tipo_dato"] = "Texto"

        return attrs


class PeriodoAcademicoSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="id_periodo", required=False)
    year = serializers.IntegerField(source="anio")
    semester = serializers.CharField(source="semestre")
    name = serializers.CharField(source="nombre")
    startDate = serializers.DateField(source="fecha_inicio")
    endDate = serializers.DateField(source="fecha_fin")
    isActive = serializers.SerializerMethodField()
    isCurrent = serializers.BooleanField(source="es_vigente", default=False, required=False)

    class Meta:
        model = PeriodoAcademico
        fields = [
            "id",
            "id_periodo",
            "year",
            "anio",
            "semester",
            "semestre",
            "name",
            "nombre",
            "startDate",
            "fecha_inicio",
            "endDate",
            "fecha_fin",
            "isCurrent",
            "es_vigente",
            "estado",
            "isActive",
        ]
        extra_kwargs = {
            "id_periodo": {"required": False},
            "anio": {"required": False},
            "semestre": {"required": False},
            "nombre": {"required": False},
            "fecha_inicio": {"required": False},
            "fecha_fin": {"required": False},
            "es_vigente": {"required": False},
        }

    def get_isActive(self, obj):
        return obj.estado == "activo"

    def validate(self, attrs):
        fecha_inicio = attrs.get("fecha_inicio")
        fecha_fin = attrs.get("fecha_fin")

        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError(
                {"endDate": "La fecha de fin debe ser posterior a la fecha de inicio."}
            )

        # Generar id_periodo automáticamente si no viene
        if not attrs.get("id_periodo"):
            anio = attrs.get("anio")
            semestre = str(attrs.get("semestre", "")).replace("°", "").replace("º", "").strip()
            attrs["id_periodo"] = f"PER-{anio}-{semestre}"

        return attrs


class RolCatalogoSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="nombre_rol")
    name = serializers.SerializerMethodField()
    description = serializers.CharField(source="descripcion")
    isAssignable = serializers.SerializerMethodField()
    usersCount = serializers.SerializerMethodField()

    class Meta:
        model = Rol
        fields = [
            "id",
            "id_rol",
            "name",
            "nombre_rol",
            "description",
            "descripcion",
            "isAssignable",
            "usersCount",
        ]

    def get_name(self, obj):
        nombres = {
            "admin": "Administrador / Superadmin",
            "coordinador": "Coordinador de Emprendimiento",
            "tutor": "Tutor Académico",
            "mentor": "Mentor Especializado",
            "evaluador": "Evaluador",
            "estudiante": "Estudiante Emprendedor",
            "direccion_del_programa": "Dirección de Programa",
        }
        return nombres.get(obj.nombre_rol, obj.nombre_rol.replace("_", " ").title())

    def get_isAssignable(self, obj):
        return obj.nombre_rol != "admin"

    def get_usersCount(self, obj):
        return UsuarioRol.objects.filter(rol=obj, estado="activo").count()


class UsuarioAdminSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    id_usuario = serializers.IntegerField(read_only=True)
    name = serializers.CharField(source="nombre")
    email = serializers.EmailField(source="correo")
    roles = serializers.SerializerMethodField()
    isActive = serializers.SerializerMethodField()
    lastLogin = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id",
            "id_usuario",
            "name",
            "nombre",
            "email",
            "correo",
            "roles",
            "isActive",
            "estado",
            "lastLogin",
            "ultimo_acceso",
        ]

    def get_id(self, obj):
        return f"USR-{obj.id_usuario:06d}"

    def get_roles(self, obj):
        return list(
            UsuarioRol.objects.filter(usuario=obj, estado="activo")
            .select_related("rol")
            .values_list("rol__nombre_rol", flat=True)
        )

    def get_isActive(self, obj):
        return obj.estado == "activo"

    def get_lastLogin(self, obj):
        if not obj.ultimo_acceso:
            return "Sin acceso"
        return obj.ultimo_acceso.strftime("%d/%m/%Y")


class AsignarRolesUsuarioSerializer(serializers.Serializer):
    roles = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
        help_text="Lista de códigos de roles a asignar (ej. ['tutor', 'mentor'])",
    )

    def validate_roles(self, roles):
        roles_normalizados = [r.strip().lower() for r in roles]

        # Validar existencia de cada rol
        roles_en_bd = set(
            Rol.objects.filter(nombre_rol__in=roles_normalizados).values_list("nombre_rol", flat=True)
        )
        inexistentes = set(roles_normalizados) - roles_en_bd
        if inexistentes:
            raise serializers.ValidationError(
                f"Los siguientes roles no existen en el sistema: {', '.join(inexistentes)}"
            )

        # Regla de seguridad de la HU-18: Admin no puede ser asignado desde este panel
        if "admin" in roles_normalizados:
            usuario = self.context.get("usuario")
            es_ya_admin = (
                usuario
                and UsuarioRol.objects.filter(usuario=usuario, rol__nombre_rol="admin", estado="activo").exists()
            )
            if not es_ya_admin:
                raise serializers.ValidationError(
                    "Por directriz de seguridad institucional, el rol de Administrador no puede ser delegado desde este panel."
                )

        return roles_normalizados
