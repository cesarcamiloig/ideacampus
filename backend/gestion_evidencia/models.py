from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
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


# ---------------------------------------------------------------------------
# HU-19 — Registro y validación de avance de la iniciativa
# ---------------------------------------------------------------------------

class RegistroAvance(models.Model):
    """
    Registro formal del avance de un proyecto en una etapa (hito de la rúbrica),
    respaldado por la evidencia publicada en esa etapa e incluyendo descripción del
    progreso, dificultades, riesgos y recomendaciones.
    Lo crea el estudiante o el tutor que acompaña el proyecto.
    """

    class EstadoAvance(models.TextChoices):
        EN_PROGRESO = "en_progreso", "En Progreso"
        COMPLETADO = "completado", "Completado"
        CON_RETRASO = "con_retraso", "Con Retraso"
        BLOQUEADO = "bloqueado", "Bloqueado"

    proyecto = models.ForeignKey(
        "gestion_emprendimiento_2.Proyecto",
        on_delete=models.PROTECT,
        related_name="registros_avance",
        db_column="id_proyecto",
    )
    etapa = models.ForeignKey(
        "gestion_evaluacion.SubRubrica",
        on_delete=models.PROTECT,
        related_name="registros_avance",
        db_column="id_etapa",
        help_text="Hito de la rúbrica al que corresponde este registro de avance.",
    )
    registrado_por = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name="registros_avance",
        db_column="id_usuario",
    )
    evidencias = models.ManyToManyField(
        Evidencia,
        related_name="registros_avance",
        db_table="registro_avance_evidencia",
        help_text="Evidencia publicada del proyecto en esta etapa que respalda el avance.",
    )
    estado_avance = models.CharField(
        max_length=20,
        choices=EstadoAvance.choices,
        default=EstadoAvance.EN_PROGRESO,
    )
    porcentaje_avance = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Porcentaje de avance estimado (0–100).",
    )
    descripcion_avance = models.TextField(
        help_text="Descripción del avance logrado en esta etapa.",
    )
    dificultades = models.TextField(
        blank=True,
        help_text="Obstáculos o dificultades encontradas durante el desarrollo.",
    )
    riesgos = models.TextField(
        blank=True,
        help_text="Riesgos identificados que podrían afectar el proyecto.",
    )
    recomendaciones = models.TextField(
        blank=True,
        help_text="Recomendaciones o acciones de mejora propuestas.",
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "registro_avance"
        ordering = ["-fecha_registro", "-id"]
        verbose_name = "Registro de Avance"
        verbose_name_plural = "Registros de Avance"

    @property
    def estado_validacion(self):
        # La última retroalimentación del tutor es la vigente; las anteriores quedan como historial
        retroalimentaciones = self.retroalimentaciones.all()
        if not retroalimentaciones:
            return "pendiente"
        return "aprobado" if retroalimentaciones[0].aprobado else "observado"

    def clean(self):
        if self.etapa_id and self.proyecto_id:
            tipo_proyecto = self.proyecto.iniciativa.tipo
            if self.etapa.rubrica.tipo_iniciativa != tipo_proyecto:
                raise ValidationError(
                    {"etapa": "La etapa no pertenece a la rúbrica de este tipo de proyecto."}
                )

    def __str__(self):
        return f"Avance Proyecto #{self.proyecto_id} – Etapa {self.etapa_id} ({self.get_estado_avance_display()})"


class RetroalimentacionAvance(models.Model):
    """
    Retroalimentación que el tutor asignado deja sobre un registro de avance del equipo.
    """
    registro_avance = models.ForeignKey(
        RegistroAvance,
        on_delete=models.CASCADE,
        related_name="retroalimentaciones",
        db_column="id_registro_avance",
    )
    tutor = models.ForeignKey(
        "gestion_acompaniamiento.Tutor",
        on_delete=models.PROTECT,
        related_name="retroalimentaciones_avance",
        db_column="id_tutor",
    )
    comentario = models.TextField(help_text="Retroalimentación del tutor sobre el avance registrado.")
    aprobado = models.BooleanField(
        default=False,
        help_text="Indica si el tutor valida (aprueba) el avance declarado.",
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "retroalimentacion_avance"
        ordering = ["-fecha", "-id"]
        verbose_name = "Retroalimentación de Avance"
        verbose_name_plural = "Retroalimentaciones de Avance"

    def __str__(self):
        estado = "Aprobado" if self.aprobado else "Observado"
        return f"[{estado}] Registro #{self.registro_avance_id} – Tutor #{self.tutor_id}"
