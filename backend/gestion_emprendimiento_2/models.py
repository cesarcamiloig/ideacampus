from django.db import models
from gestion_administrativa.models import Usuario  # ajusta el import según dónde esté tu modelo Usuario


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
    # Evaluador, tutor y mentores se asignan manualmente después de crear el proyecto;
    # el coordinador se elige al aprobar la iniciativa.
    # El coordinador es un Usuario con el rol "coordinador" (no existe modelo propio)
    coordinador = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        db_column="id_coordinador",
        null=True,
        blank=True,
        related_name="proyectos_coordinados",
        limit_choices_to=usuarios_con_rol_activo("coordinador"),
    )
    # El evaluador es un Usuario con el rol "evaluador" (no existe modelo propio)
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
        return f"{self.mentor} → {self.proyecto}"