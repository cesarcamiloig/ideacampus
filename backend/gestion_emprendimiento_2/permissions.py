from rest_framework.permissions import SAFE_METHODS
from gestion_administrativa.permissions import TieneRolPermitido


class EsCoordinador(TieneRolPermitido):
    """
    Permiso que valida que el usuario autenticado tenga el rol de 'Coordinador' activo.
    Acepta tanto 'coordinador' como 'Coordinador' para compatibilidad con el token y BD.
    """
    roles_permitidos = ("coordinador", "Coordinador")


class SoloCoordinadorParaMutaciones(TieneRolPermitido):
    """
    Aplica TieneRolPermitido restringiendo exclusivamente las operaciones
    de mutación (POST, DELETE, PATCH) al rol 'Coordinador'.
    Las operaciones de consulta (GET, HEAD, OPTIONS) se permiten a usuarios autenticados.
    """
    roles_permitidos = ("coordinador", "Coordinador")

    def has_permission(self, request, view):
        usuario = getattr(request, "user", None)
        if not usuario or not getattr(usuario, "is_authenticated", False):
            return False

        if request.method in SAFE_METHODS:
            return True

        return super().has_permission(request, view)


class EsTutorCoordinadorODireccion(TieneRolPermitido):
    """
    GENNOVA-77 / HU-08: Permiso estricto que restringe el acceso a la Línea de Tiempo Evolutiva
    exclusivamente a los roles 'Tutor', 'Coordinador' y 'Direccion'.
    Soporta variantes de casing y nombres usados en el sistema ('tutor', 'Tutor', 'coordinador',
    'Coordinador', 'direccion', 'Direccion', 'direccion_del_programa').
    """
    roles_permitidos = (
        "tutor",
        "Tutor",
        "coordinador",
        "Coordinador",
        "direccion",
        "Direccion",
        "direccion_del_programa",
    )
