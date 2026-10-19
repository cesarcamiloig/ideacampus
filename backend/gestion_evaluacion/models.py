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