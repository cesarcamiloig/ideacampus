from rest_framework.permissions import BasePermission


class TieneRolPermitido(BasePermission):
    """
    Permiso reutilizable que verifica que el usuario esté autenticado con JWT
    y que su rol activo coincida con alguno de los roles permitidos en la vista.

    Uso en cualquier APIView o ViewSet:
        permission_classes = [TieneRolPermitido]
        roles_permitidos = ["admin", "coordinador"]
    """
    message = "No tienes permisos con tu rol actual para realizar esta acción."
    roles_permitidos = ()

    def has_permission(self, request, view):
        usuario = getattr(request, "user", None)
        if not usuario or not getattr(usuario, "is_authenticated", False):
            return False

        rol_activo = getattr(usuario, "rol_activo", None)
        if not rol_activo and isinstance(getattr(request, "auth", None), dict):
            rol_activo = request.auth.get("rol")

        roles_vista = getattr(view, "roles_permitidos", None) or self.roles_permitidos
        if not roles_vista:
            return True

        return rol_activo in roles_vista


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
