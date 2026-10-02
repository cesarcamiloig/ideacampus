from django.db import models
from gestion_administrativa.models import Usuario, PeriodoAcademico


class Convocatoria(models.Model):
    ESTADOS = (
        ('borrador', 'Borrador'),
        ('publicada', 'Publicada'),
        ('abierta', 'Abierta'),
        ('cerrada', 'Cerrada'),
        ('cancelada', 'Cancelada'),
    )

    id_convocatoria = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(null=True, blank=True)
    categoria = models.CharField(max_length=100, null=True, blank=True)
    requisitos_documentacion = models.TextField(null=True, blank=True)
    criterios_evaluacion = models.TextField(null=True, blank=True)
    fecha_apertura = models.DateTimeField()
    fecha_cierre = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='borrador')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    creador = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_creador',
        related_name='convocatorias_creadas'
    )
    periodo = models.ForeignKey(
        PeriodoAcademico,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_periodo',
        related_name='convocatorias'
    )

    class Meta:
        db_table = 'convocatoria'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.nombre} ({self.estado})"


class NotificacionConvocatoria(models.Model):
    TIPOS = (
        ('apertura', 'Apertura de Convocatoria'),
        ('cierre_proximo', 'Cierre Próximo de Convocatoria'),
        ('cerrada', 'Convocatoria Cerrada'),
        ('actualizacion', 'Actualización de Convocatoria'),
    )

    id_notificacion = models.AutoField(primary_key=True)
    convocatoria = models.ForeignKey(
        Convocatoria,
        on_delete=models.CASCADE,
        db_column='id_convocatoria',
        related_name='notificaciones'
    )
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='notificaciones_convocatoria'
    )
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=30, choices=TIPOS, default='apertura')
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificacion_convocatoria'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.titulo} - Para: {self.usuario.correo} ({'Leída' if self.leida else 'No leída'})"