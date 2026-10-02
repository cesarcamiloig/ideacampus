from django.db import models
from gestion_administrativa.models import Usuario


class NivelAcademico(models.TextChoices):
    PREGRADO = "pregrado", "Pregrado"
    ESPECIALIZACION = "especializacion", "Especialización"
    MAESTRIA = "maestria", "Maestría"
    DOCTORADO = "doctorado", "Doctorado"


class PerfilAcademicoBase(models.Model):
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        db_column="id_usuario",
    )
    nivel_academico = models.CharField(max_length=30, choices=NivelAcademico.choices, null=True, blank=True)
    anios_experiencia = models.PositiveSmallIntegerField(null=True, blank=True)
    biografia = models.TextField(blank=True)
    enlace_perfil = models.URLField(max_length=300, blank=True)
    estado = models.CharField(max_length=20, default="activo")

    class Meta:
        abstract = True

class Tutor(PerfilAcademicoBase):   
    id_tutor = models.AutoField(primary_key=True)
    area_conocimiento = models.CharField(max_length=150, blank=True)

    class Meta:
        db_table = "tutor"


class Mentor(PerfilAcademicoBase):
    id_mentor = models.AutoField(primary_key=True)
    area_especializacion = models.CharField(max_length=150, blank=True)
    disponibilidad = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "mentor"