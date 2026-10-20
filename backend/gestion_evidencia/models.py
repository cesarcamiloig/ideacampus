from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models

from gestion_administrativa.models import Usuario


def validar_tamano_archivo(archivo):
    if archivo.size > 10 * 1024 * 1024:
        raise ValidationError("El archivo no puede superar los 10 MB.")


class Evidencia(models.Model):
    class Tipo(models.TextChoices):
        DOCUMENTO = "documento", "Documento"
        ENLACE = "enlace", "Enlace"
        PROTOTIPO = "prototipo", "Prototipo"
        PRESENTACION = "presentacion", "Presentación"

    proyecto = models.ForeignKey(
        "gestion_emprendimiento_2.Proyecto",
        on_delete=models.PROTECT,
        related_name="evidencias",
        db_column="id_proyecto",
    )
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name="evidencias",
        db_column="id_usuario",
    )
    etapa = models.ForeignKey(
        "gestion_evaluacion.SubRubrica",  # el hito = la etapa finalizada
        on_delete=models.PROTECT,
        related_name="evidencias",
        db_column="id_etapa",
    )
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "evidencia"
        ordering = ["-creado"]

    def clean(self):
        # La etapa debe ser un hito de la rúbrica del tipo de este proyecto
        if self.etapa_id and self.proyecto_id:
            tipo_proyecto = self.proyecto.iniciativa.tipo
            if self.etapa.rubrica.tipo_iniciativa != tipo_proyecto:
                raise ValidationError(
                    {"etapa": "La etapa no pertenece a la rúbrica de este tipo de proyecto."}
                )

    def __str__(self):
        return f"{self.titulo} - Proyecto #{self.proyecto_id}"


class DocumentoEvidencia(models.Model):
    evidencia = models.ForeignKey(
        Evidencia,
        on_delete=models.CASCADE,
        db_column="id_evidencia",
        related_name="documentos",
    )
    # Archivo subido (PDF, DOCX, PPTX, PNG, JPG): su contenido se guarda en la base de datos
    # para que cualquiera con acceso lo descargue, sin depender del disco de quien lo subió.
    contenido = models.BinaryField(null=True, blank=True, editable=False)
    tipo_contenido = models.CharField(max_length=100, blank=True)
    # Ruta en disco de los adjuntos subidos antes de guardar el contenido en la base de datos
    archivo = models.FileField(
        upload_to="evidencias/",
        db_column="url_archivo",
        null=True,
        blank=True,
        validators=[
            FileExtensionValidator(["pdf", "docx", "pptx", "png", "jpg", "jpeg"]),
            validar_tamano_archivo,
        ],
    )
    nombre_original = models.CharField(max_length=255, blank=True)
    extension = models.CharField(max_length=10, null=True, blank=True)
    tamano_bytes = models.BigIntegerField(null=True, blank=True)
    # ...o enlace externo (prototipo, video, carpeta)
    enlace = models.URLField(max_length=500, null=True, blank=True)
    fecha_carga = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "documento_evidencia"
        ordering = ["-fecha_carga"]

    @property
    def es_archivo(self):
        return not self.enlace

    def clean(self):
        # Exactamente uno: archivo o enlace
        tiene_archivo = self.contenido is not None or bool(self.archivo)
        if tiene_archivo == bool(self.enlace):
            raise ValidationError("Cada adjunto debe ser un archivo o un enlace, no ambos ni ninguno.")

    def __str__(self):
        return f"{self.nombre_original or self.enlace} - Evidencia #{self.evidencia_id}"