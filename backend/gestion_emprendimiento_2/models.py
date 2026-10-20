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
    HU-20: Plan de Trabajo asociado a una iniciativa / proyecto emprendedor.
    Permite organizar y hacer seguimiento a la ejecución técnica mediante
    hitos, actividades y entregables.
    """

    class Estado(models.TextChoices):
        BORRADOR = "borrador", "Borrador"
        EN_PROGRESO = "en_progreso", "En Progreso"
        FINALIZADO = "finalizado", "Finalizado"
        AJUSTADO = "ajustado", "Ajustado"

    id_plan_trabajo = models.AutoField(primary_key=True)
    iniciativa = models.OneToOneField(
        "gestion_convocatorias.Iniciativa",
        on_delete=models.CASCADE,
        db_column="id_iniciativa",
        related_name="plan_trabajo",
    )
    titulo = models.CharField(max_length=200, default="Plan de Trabajo")
    descripcion = models.TextField(blank=True, null=True)
    estado = models.CharField(
        max_length=30, choices=Estado.choices, default=Estado.EN_PROGRESO
    )
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "plan_trabajo"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"Plan de Trabajo #{self.pk} - Iniciativa #{self.iniciativa_id}"

    @property
    def proyecto(self):
        return getattr(self.iniciativa, "proyecto", None)

    @property
    def equipo(self):
        return getattr(self.iniciativa, "equipo", None)


class HitoPlanTrabajo(models.Model):
    """
    HU-20: Hito clave o etapa estructurada dentro del plan de trabajo.
    """

    id_hito = models.AutoField(primary_key=True)
    plan_trabajo = models.ForeignKey(
        PlanTrabajo,
        on_delete=models.CASCADE,
        db_column="id_plan_trabajo",
        related_name="hitos",
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    fecha_limite = models.DateField(null=True, blank=True)
    orden = models.PositiveSmallIntegerField(default=1)
    completado = models.BooleanField(default=False)
    fecha_completado = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "hito_plan_trabajo"
        ordering = ["orden", "fecha_limite"]

    def __str__(self):
        return f"Hito {self.orden}: {self.nombre}"


class ActividadPlanTrabajo(models.Model):
    """
    HU-20: Actividad específica del plan de trabajo con responsable asignado,
    fechas límite y prioridad de ejecución.
    """

    class Prioridad(models.TextChoices):
        ALTA = "alta", "Alta"
        MEDIA = "media", "Media"
        BAJA = "baja", "Baja"

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        EN_PROGRESO = "en_progreso", "En Progreso"
        COMPLETADA = "completada", "Completada"
        CANCELADA = "cancelada", "Cancelada"

    id_actividad = models.AutoField(primary_key=True)
    plan_trabajo = models.ForeignKey(
        PlanTrabajo,
        on_delete=models.CASCADE,
        db_column="id_plan_trabajo",
        related_name="actividades",
    )
    hito = models.ForeignKey(
        HitoPlanTrabajo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="id_hito",
        related_name="actividades",
    )
    responsable = models.ForeignKey(
        Estudiante,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="id_responsable",
        related_name="actividades_asignadas",
    )
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    prioridad = models.CharField(
        max_length=20, choices=Prioridad.choices, default=Prioridad.MEDIA
    )
    estado = models.CharField(
        max_length=30, choices=Estado.choices, default=Estado.PENDIENTE
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "actividad_plan_trabajo"
        ordering = ["fecha_inicio", "fecha_fin", "-prioridad"]

    def __str__(self):
        return f"Actividad #{self.pk}: {self.nombre} ({self.estado})"


class EntregableActividad(models.Model):
    """
    HU-20: Entregable o evidencia verificable asociada a una actividad del plan de trabajo.
    """

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        ENTREGADO = "entregado", "Entregado"
        APROBADO = "aprobado", "Aprobado"
        OBSERVADO = "observado", "Observado"

    id_entregable = models.AutoField(primary_key=True)
    actividad = models.ForeignKey(
        ActividadPlanTrabajo,
        on_delete=models.CASCADE,
        db_column="id_actividad",
        related_name="entregables",
    )
    plan_trabajo = models.ForeignKey(
        PlanTrabajo,
        on_delete=models.CASCADE,
        db_column="id_plan_trabajo",
        related_name="entregables",
    )
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    fecha_limite = models.DateField(null=True, blank=True)
    tipo = models.CharField(max_length=50, default="documento")
    archivo = models.FileField(
        upload_to="entregables/", null=True, blank=True, db_column="url_archivo"
    )
    enlace = models.URLField(max_length=500, blank=True, null=True)
    estado = models.CharField(
        max_length=30, choices=Estado.choices, default=Estado.PENDIENTE
    )
    observaciones = models.TextField(blank=True, null=True)
    fecha_entrega = models.DateTimeField(null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "entregable_actividad"
        ordering = ["fecha_limite", "-fecha_creacion"]

    def __str__(self):
        return f"Entregable: {self.nombre} - Actividad #{self.actividad_id}"
