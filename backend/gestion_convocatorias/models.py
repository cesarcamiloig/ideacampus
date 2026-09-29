from django.db import models

class Convocatoria(models.Model):
    id_convocatoria = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.CharField(max_length=500, null=True, blank=True)
    categoria = models.CharField(max_length=100, null=True, blank=True)
    requisitos_documentacion = models.CharField(max_length=500, null=True, blank=True)
    criterios_evaluacion = models.CharField(max_length=500, null=True, blank=True)
    fecha_apertura = models.DateTimeField()
    fecha_cierre = models.DateTimeField()
    estado = models.CharField(max_length=20, default='borrador')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'convocatoria'

    def __str__(self):
        return self.nombre