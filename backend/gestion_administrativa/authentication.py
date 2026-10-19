from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .jwt_utils import verificar_token
from .models import Usuario, UsuarioRol


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None  # no intenta autenticar si no hay header

        token = auth_header.split(" ")[1]
        payload = verificar_token(token)

        if payload is None:
            raise AuthenticationFailed("Token inválido o expirado")

        try:
            usuario = Usuario.objects.get(id_usuario=payload["id_usuario"])
        except Usuario.DoesNotExist:
            raise AuthenticationFailed("Usuario no encontrado")

        if usuario.estado != "activo":
            raise AuthenticationFailed("El usuario se encuentra inactivo")

        rol_token = payload.get("rol")
        roles_token = payload.get("roles")
        if not isinstance(roles_token, list):
            roles_token = [rol_token] if rol_token else []

        if not roles_token and not rol_token:
            raise AuthenticationFailed("El token no contiene roles asignados")

        roles_bd = list(
            UsuarioRol.objects.filter(usuario=usuario, estado="activo")
            .select_related("rol")
            .values_list("rol__nombre_rol", flat=True)
        )

        # Validar que el rol principal del token (si no es estudiante) siga activo en BD
        if rol_token and rol_token != "estudiante":
            if rol_token not in roles_bd:
                raise AuthenticationFailed("El rol del token no está asignado o activo")

        roles_vigentes = list(dict.fromkeys(roles_bd + ([r for r in roles_token if r == "estudiante" or r in roles_bd])))
        if not roles_vigentes:
            raise AuthenticationFailed("El usuario no posee roles activos asignados")

        rol_activo = rol_token if (rol_token in roles_vigentes) else roles_vigentes[0]

        usuario.rol_activo = rol_activo
        usuario.roles_activos = roles_vigentes
        usuario.roles_asignados = roles_vigentes
        payload["rol"] = rol_activo
        payload["roles"] = roles_vigentes

        return (usuario, payload)  # request.user = usuario, request.auth = payload