from django.contrib import admin
from .models import (
    Convocatoria,
    NotificacionConvocatoria,
    Iniciativa,
    DocumentoPostulacion

)

admin.site.register(Convocatoria)
admin.site.register(NotificacionConvocatoria)
admin.site.register(Iniciativa)
admin.site.register(DocumentoPostulacion)