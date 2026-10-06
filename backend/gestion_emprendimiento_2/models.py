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