from django.core.exceptions import ValidationError
from django.db import models
from gestion_administrativa.models import Usuario


class Estudiante(models.Model):
    id_estudiante = models.AutoField(primary_key=True)
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        db_column='id_usuario'
    )
    equipo = models.ForeignKey(
        'EquipoEmprendedor',
        on_delete=models.SET_NULL,
        db_column='id_equipo',
        null=True,
        blank=True,
        related_name='miembros'
    )
    codigo = models.CharField(max_length=20, unique=True, null=True, blank=True)
    semestre = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'estudiante_emprendedor'

    def __str__(self):
        nombre = self.usuario.nombre
        return f"{nombre} ({self.codigo})" if self.codigo else nombre


class EquipoEmprendedor(models.Model):
    id_equipo = models.AutoField(primary_key=True)
    estudiante_lider = models.OneToOneField(
        Estudiante,
        on_delete=models.CASCADE,
        db_column='id_estudiante_lider',
        related_name='equipo_liderado'
    )
    nombre_equipo = models.CharField(max_length=150)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    iniciativa = models.OneToOneField(
        'gestion_convocatorias.Iniciativa',
        on_delete=models.SET_NULL,
        db_column='id_iniciativa',
        null=True,
        blank=True,
        related_name='equipo'
    )

    class Meta:
        db_table = 'equipo_emprendedor'

    def __str__(self):
        return self.nombre_equipo


def usuarios_con_rol_activo(nombre_rol):
    """Filtro de usuarios activos que tienen el rol indicado activo."""
    return models.Q(
        estado="activo",
        usuariorol__rol__nombre_rol=nombre_rol,
        usuariorol__estado="activo",
    )


class Proyecto(models.Model):
    class Estado(models.TextChoices):
        ACTIVO = "activo", "Activo"
        PAUSADO = "pausado", "Pausado"
        FINALIZADO = "finalizado", "Finalizado"
        CANCELADO = "cancelado", "Cancelado"

    id_proyecto = models.AutoField(primary_key=True)
    iniciativa = models.OneToOneField(
        "gestion_convocatorias.Iniciativa",
        on_delete=models.PROTECT,
        db_column="id_iniciativa",
        related_name="proyecto",
    )
    nombre_proyecto = models.CharField(max_length=150)
    descripcion = models.CharField(max_length=1000, null=True, blank=True)
    coordinador = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        db_column="id_coordinador",
        null=True,
        blank=True,
        related_name="proyectos_coordinados",
        limit_choices_to=usuarios_con_rol_activo("coordinador"),
    )
    evaluador = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        db_column="id_evaluador",
        null=True,
        blank=True,
        related_name="proyectos_evaluados",
        limit_choices_to=usuarios_con_rol_activo("evaluador"),
    )
    tutor = models.ForeignKey(
        "gestion_acompaniamiento.Tutor",
        on_delete=models.SET_NULL,
        db_column="id_tutor",
        null=True,
        blank=True,
        related_name="proyectos",
    )
    mentores = models.ManyToManyField(
        "gestion_acompaniamiento.Mentor",
        through="ProyectoMentor",
        related_name="proyectos",
    )
    estado = models.CharField(
        max_length=30, choices=Estado.choices, default=Estado.ACTIVO
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "proyecto"

    def __str__(self):
        return f"Proyecto #{self.pk} - {self.nombre_proyecto}"

    @property
    def equipo(self):
        """Equipo emprendedor de la iniciativa (se registra después de aprobarla, HU-04)."""
        return getattr(self.iniciativa, 'equipo', None)


class ProyectoMentor(models.Model):
    proyecto = models.ForeignKey(
        Proyecto,
        on_delete=models.CASCADE,
        db_column="id_proyecto",
        related_name="asignaciones_mentor",
    )
    mentor = models.ForeignKey(
        "gestion_acompaniamiento.Mentor",
        on_delete=models.PROTECT,
        db_column="id_mentor",
        related_name="asignaciones_proyecto",
    )
    fecha_asignacion = models.DateField()
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "proyecto_mentor"
        constraints = [
            models.UniqueConstraint(
                fields=["proyecto", "mentor"], name="uq_proyecto_mentor"
            )
        ]

    def __str__(self):
        return f"{self.mentor} -> {self.proyecto}"


class PlanTrabajo(models.Model):
    """
    HU-20: Plan de trabajo de un proyecto para uno de los hitos de su rúbrica.
    Un proyecto tiene un plan por hito, y cada plan agrupa sus actividades.
    """

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        EN_CURSO = "en_curso", "En curso"
        FINALIZADO = "finalizado", "Finalizado"

    id_plan_trabajo = models.AutoField(primary_key=True)
    proyecto = models.ForeignKey(
        Proyecto,
        on_delete=models.CASCADE,
        db_column="id_proyecto",
        related_name="planes_trabajo",
    )
    hito = models.ForeignKey(
        "gestion_evaluacion.SubRubrica",
        on_delete=models.PROTECT,
        db_column="id_hito",
        related_name="planes_trabajo",
    )
    titulo = models.CharField(max_length=200, default="Plan de Trabajo")
    descripcion = models.TextField(blank=True, null=True)
    estado = models.CharField(
        max_length=30, choices=Estado.choices, default=Estado.PENDIENTE
    )
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "plan_trabajo"
        ordering = ["hito__numero_hito"]
        constraints = [
            models.UniqueConstraint(
                fields=["proyecto", "hito"], name="uq_plan_trabajo_proyecto_hito"
            )
        ]

    def clean(self):
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValidationError(
                {"fecha_fin": "No puede ser anterior a la fecha de inicio."}
            )
        if self.hito_id and self.proyecto_id:
            if self.hito.rubrica.tipo_iniciativa != self.proyecto.iniciativa.tipo:
                raise ValidationError(
                    {"hito": "El hito no pertenece a la rúbrica de este tipo de proyecto."}
                )

    def __str__(self):
        return f"{self.titulo} - Proyecto #{self.proyecto_id} / Hito #{self.hito_id}"


class Actividad(models.Model):
    """
    HU-20: Actividad de un plan de trabajo con un responsable del equipo.
    Se completa cuando el responsable sube su evidencia.
    """

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        COMPLETADA = "completada", "Completada"

    plan_trabajo = models.ForeignKey(
        PlanTrabajo,
        on_delete=models.CASCADE,
        related_name="actividades",
        db_column="id_plan_trabajo",
    )
    responsable = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name="actividades_asignadas",
        db_column="id_responsable",
    )
    creado_por = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name="actividades_creadas",
        db_column="id_creado_por",
    )
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    entregable = models.CharField(max_length=300, blank=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField()
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
    )
    fecha_completada = models.DateField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "actividad"
        ordering = ["fecha_fin"]

    def clean(self):
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValidationError(
                {"fecha_fin": "No puede ser anterior a la fecha de inicio."}
            )

    def __str__(self):
        return f"{self.nombre} - Plan #{self.plan_trabajo_id}"
