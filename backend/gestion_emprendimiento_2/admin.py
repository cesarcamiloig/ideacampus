from django.contrib import admin

from .models import (
    Estudiante,
    EquipoEmprendedor,
    Proyecto
)

admin.site.register(Estudiante)
admin.site.register(EquipoEmprendedor)
admin.site.register(Proyecto)
