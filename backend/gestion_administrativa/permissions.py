from rest_framework.permissions import BasePermission


class TieneRolPermitido(BasePermission):
    """
    Permiso reutilizable que verifica que el usuario esté autenticado con JWT
    y que alguno de sus roles activos coincida con los roles permitidos en la vista.

    Uso en cualquier APIView o ViewSet:
        permission_classes = [TieneRolPermitido]
        roles_permitidos = ["admin", "coordinador"]

    Si la vista no declara roles permitidos, se deniega el acceso.
    """
    message = "No tienes permisos con ninguno de tus roles actuales para realizar esta acción."
    roles_permitidos = ()

    def has_permission(self, request, view):
        usuario = getattr(request, "user", None)
        if not usuario or not getattr(usuario, "is_authenticated", False):
            return False

        roles_usuario = list(getattr(usuario, "roles_activos", None) or [])
        rol_activo = getattr(usuario, "rol_activo", None)
        if rol_activo and rol_activo not in roles_usuario:
            roles_usuario.append(rol_activo)

        auth = getattr(request, "auth", None)
        if not roles_usuario and auth is not None and hasattr(auth, "get"):
            auth_roles = auth.get("roles") or []
            if isinstance(auth_roles, list):
                roles_usuario.extend(auth_roles)
            auth_rol = auth.get("rol")
            if auth_rol and auth_rol not in roles_usuario:
                roles_usuario.append(auth_rol)

        roles_vista = getattr(view, "roles_permitidos", None) or self.roles_permitidos
        if not roles_vista:
            return False

        return any(rol in roles_vista for rol in roles_usuario)


class EsAdmin(TieneRolPermitido):
    roles_permitidos = ("admin",)


class EsDireccionPrograma(TieneRolPermitido):
    roles_permitidos = ("direccion_del_programa",)


class EsCoordinador(TieneRolPermitido):
    roles_permitidos = ("coordinador",)


class EsTutor(TieneRolPermitido):
    roles_permitidos = ("tutor",)


class EsMentor(TieneRolPermitido):
    roles_permitidos = ("mentor",)


class EsEvaluador(TieneRolPermitido):
    roles_permitidos = ("evaluador",)


class EsEstudiante(TieneRolPermitido):
    roles_permitidos = ("estudiante",)