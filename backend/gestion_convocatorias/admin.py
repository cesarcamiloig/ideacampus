from django.contrib import admin
from .models import Convocatoria, NotificacionConvocatoria


@admin.register(Convocatoria)
class ConvocatoriaAdmin(admin.ModelAdmin):
    list_display = ('id_convocatoria', 'nombre', 'categoria', 'estado', 'fecha_apertura', 'fecha_cierre', 'creador')
    list_filter = ('estado', 'categoria', 'fecha_apertura', 'fecha_cierre')
    search_fields = ('nombre', 'descripcion')


@admin.register(NotificacionConvocatoria)
class NotificacionConvocatoriaAdmin(admin.ModelAdmin):
    list_display = ('id_notificacion', 'convocatoria', 'usuario', 'titulo', 'tipo', 'leida', 'fecha_creacion')
    list_filter = ('tipo', 'leida', 'fecha_creacion')
    search_fields = ('titulo', 'mensaje', 'usuario__correo')
