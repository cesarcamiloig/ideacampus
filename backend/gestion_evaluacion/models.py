from django.core.exceptions import ValidationError
from django.db import models

from gestion_administrativa.models import Usuario
from gestion_emprendimiento_2.models import usuarios_con_rol_activo


class Rubrica(models.Model):
    nombre = models.CharField(max_length=150)
    tipo_iniciativa = models.CharField(max_length=30, unique=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rubrica"

    def __str__(self):
        return self.nombre


class SubRubrica(models.Model):
    rubrica = models.ForeignKey(
        Rubrica, on_delete=models.CASCADE, related_name="subrubricas"
    )
    numero_hito = models.PositiveSmallIntegerField()
    nombre = models.CharField(max_length=150)   # nombre del hito
    descripcion = models.TextField(blank=True)
    ponderacion = models.DecimalField(max_digits=5, decimal_places=2)  # peso del hito en la nota global

    class Meta:
        db_table = "sub_rubrica"
        ordering = ["numero_hito"]
        constraints = [
            models.UniqueConstraint(
                fields=["rubrica", "numero_hito"],
                name="uq_subrubrica_rubrica_hito",
            )
        ]

    def __str__(self):
        return f"Hito {self.numero_hito}: {self.nombre}"


class CriterioRubrica(models.Model):
    subrubrica = models.ForeignKey(
        SubRubrica, on_delete=models.CASCADE, related_name="criterios"
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    ponderacion = models.DecimalField(max_digits=5, decimal_places=2)  # peso dentro del hito
    escala_min = models.PositiveSmallIntegerField(default=1)
    escala_max = models.PositiveSmallIntegerField(default=5)

    class Meta:
        db_table = "criterio_rubrica"

    def __str__(self):
        return self.nombre


class Evaluacion(models.Model):
    proyecto = models.ForeignKey(
        "gestion_emprendimiento_2.Proyecto", on_delete=models.PROTECT, related_name="evaluaciones"
    )
    subrubrica = models.ForeignKey(
        SubRubrica, on_delete=models.PROTECT, related_name="evaluaciones"
    )
    # El evaluador es un Usuario con el rol "evaluador" (no existe modelo propio)
    evaluador = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name="evaluaciones",
        limit_choices_to=usuarios_con_rol_activo("evaluador"),
    )
    nota_final = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    comentario = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "evaluacion"
        constraints = [
            models.UniqueConstraint(
                fields=["proyecto", "subrubrica", "evaluador"],
                name="uq_evaluacion_proyecto_subrubrica_evaluador",
            )
        ]

    def clean(self):
        # Si falta algún campo, su propia validación ya reporta el error
        if not (self.subrubrica_id and self.proyecto_id):
            return
        if self.subrubrica.rubrica.tipo_iniciativa != self.proyecto.iniciativa.tipo:
            raise ValidationError(
                "La subrúbrica no corresponde al tipo de iniciativa del proyecto."
            )

    def __str__(self):
        return f"{self.proyecto} · {self.subrubrica}"


class NotaCriterio(models.Model):
    evaluacion = models.ForeignKey(
        Evaluacion, on_delete=models.CASCADE, related_name="notas"
    )
    criterio = models.ForeignKey(
        CriterioRubrica, on_delete=models.PROTECT, related_name="notas"
    )
    nota = models.DecimalField(max_digits=5, decimal_places=2)
    comentario = models.TextField(blank=True)

    class Meta:
        db_table = "nota_criterio"
        constraints = [
            models.UniqueConstraint(
                fields=["evaluacion", "criterio"],
                name="uq_nota_evaluacion_criterio",
            )
        ]

    def __str__(self):
        return f"{self.criterio}: {self.nota}"



# ---------------------------------------------------------------------------
# HU-11 — Cálculo y Gestión de Madurez Tecnológica (M0-M9)
# ---------------------------------------------------------------------------

class NivelMadurez(models.TextChoices):
    M0 = "M0", "M0: Ideación Inicial"
    M1 = "M1", "M1: Formulación Tecnológica"
    M2 = "M2", "M2: Concepto Validado"
    M3 = "M3", "M3: Prueba de Concepto"
    M4 = "M4", "M4: Prototipo Básico"
    M5 = "M5", "M5: Prototipo de Alta Fidelidad"
    M6 = "M6", "M6: Sistema de Demostración"
    M7 = "M7", "M7: Validación Real"
    M8 = "M8", "M8: Sistema Calificado"
    M9 = "M9", "M9: Transferencia"


class RegistroMadurez(models.Model):
    """
    Registro auditable de evaluación y transición de nivel de madurez (M0 a M9).
    Realizado por el evaluador asignado o por la coordinación académica a partir
    de evidencias validadas por el tutor y/o evaluaciones de hito.
    Inmutable una vez registrado para garantizar trazabilidad ante procesos de acreditación (RNF13).
    """
    proyecto = models.ForeignKey(
        "gestion_emprendimiento_2.Proyecto",
        on_delete=models.CASCADE,
        related_name="registros_madurez",
        db_column="id_proyecto",
    )
    nivel = models.CharField(
        max_length=5,
        choices=NivelMadurez.choices,
        help_text="Nivel de madurez tecnológica (M0 a M9).",
    )
    evaluador = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name="evaluaciones_madurez",
        db_column="id_usuario",
        help_text="Usuario evaluador, coordinador o directivo que certifica el nivel.",
    )
    criterio_cumplido = models.TextField(
        help_text="Criterio o justificación técnica que sustenta el nivel alcanzado.",
    )
    evidencias = models.ManyToManyField(
        "gestion_evidencia.Evidencia",
        blank=True,
        related_name="registros_madurez",
        db_table="registro_madurez_evidencia",
        help_text="Evidencias validadas que respaldan el nivel alcanzado.",
    )
    evaluacion = models.ForeignKey(
        Evaluacion,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="registros_madurez",
        db_column="id_evaluacion",
        help_text="Evaluación formal de rúbrica asociada opcionalmente.",
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "registro_madurez"
        ordering = ["-fecha_registro", "-id"]
        verbose_name = "Registro de Madurez"
        verbose_name_plural = "Registros de Madurez"

    def __str__(self):
        return f"Proyecto #{self.proyecto_id} - Nivel {self.nivel}"
