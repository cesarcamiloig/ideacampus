from rest_framework.permissions import BasePermission


class TieneRolPermitido(BasePermission):
    """
    Permiso reutilizable que verifica que el usuario esté autenticado con JWT
    y que al menos uno de sus roles (dentro del token) esté en los roles
    permitidos definidos en la vista.

    Uso en cualquier APIView o ViewSet:
        permission_classes = [TieneRolPermitido]
        roles_permitidos = ["admin", "coordinador"]
    """
    message = "No tienes permisos con ninguno de tus roles actuales para realizar esta acción."
    roles_permitidos = ()

    def has_permission(self, request, view):
        usuario = getattr(request, "user", None)
        if not usuario or not getattr(usuario, "is_authenticated", False):
            return False

        roles_usuario = getattr(usuario, "roles_activos", None)
        if roles_usuario is None and isinstance(getattr(request, "auth", None), dict):
            roles_usuario = request.auth.get("roles", [])

        roles_usuario = roles_usuario or []

        roles_vista = getattr(view, "roles_permitidos", None) or self.roles_permitidos
        if not roles_vista:
            return True

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