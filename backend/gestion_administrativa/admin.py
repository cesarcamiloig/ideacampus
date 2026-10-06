from django.contrib import admin
from .models import (
    Usuario,
    Rol,
    UsuarioRol,
    Permiso,
    RolPermiso,
    VariableCaracterizacion,
    PeriodoAcademico,
)


@admin.register(UsuarioRol)
class UsuarioRolAdmin(admin.ModelAdmin):
    list_display = ("usuario", "rol", "estado", "fecha_asignacion")
    list_filter = ("rol", "estado")
    search_fields = ("usuario__nombre", "usuario__correo")
    list_select_related = ("usuario", "rol")


admin.site.register(Usuario)
admin.site.register(Rol)
admin.site.register(Permiso)
admin.site.register(RolPermiso)
admin.site.register(VariableCaracterizacion)
admin.site.register(PeriodoAcademico)