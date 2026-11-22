from django.contrib import admin

from .models import PublicacionCatalogo


@admin.register(PublicacionCatalogo)
class PublicacionCatalogoAdmin(admin.ModelAdmin):
    list_display = ("iniciativa", "publicada", "autorizado_por", "fecha_publicacion")
    list_filter = ("publicada",)
