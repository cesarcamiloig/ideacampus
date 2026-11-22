from django.db import models

from gestion_administrativa.models import Usuario


# ---------------------------------------------------------------------------
# HU-15 — Catálogo público de iniciativas autorizadas
# ---------------------------------------------------------------------------

# Solo las iniciativas aprobadas pueden autorizarse para el catálogo público
ESTADOS_AUTORIZABLES = ("aprobada", "aceptada")


class PublicacionCatalogo(models.Model):
    """
    Autorización del coordinador para difundir una iniciativa aprobada en el catálogo público,
    con el resumen y los resultados que se muestran a cualquier visitante (sin datos personales).
    Despublicar la conserva con su texto para volver a publicarla después.
    """
    iniciativa = models.OneToOneField(
        "gestion_convocatorias.Iniciativa",
        on_delete=models.CASCADE,
        db_column="id_iniciativa",
        related_name="publicacion_catalogo",
    )
    publicada = models.BooleanField(default=False)
    resumen_publico = models.TextField(help_text="Descripción de la iniciativa para el público general.")
    resultados = models.TextField(blank=True, help_text="Resultados o logros alcanzados que se quieren difundir.")
    autorizado_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="id_autorizado_por",
        related_name="publicaciones_catalogo",
    )
    fecha_publicacion = models.DateTimeField(null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "publicacion_catalogo"
        ordering = ["-fecha_publicacion", "-id"]
        verbose_name = "Publicación en Catálogo"
        verbose_name_plural = "Publicaciones en Catálogo"

    def __str__(self):
        estado = "Publicada" if self.publicada else "No publicada"
        return f"[{estado}] Iniciativa #{self.iniciativa_id}"
