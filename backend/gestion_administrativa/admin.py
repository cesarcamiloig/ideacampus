from django.contrib import admin
from .models import (
    Usuario,
    Rol,
    UsuarioRol,
    Permiso,
    RolPermiso,
    VariableCaracterizacion
)

admin.site.register(Usuario)
admin.site.register(Rol)
admin.site.register(UsuarioRol)
admin.site.register(Permiso)
admin.site.register(RolPermiso)
admin.site.register(VariableCaracterizacion)