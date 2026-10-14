from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .jwt_utils import verificar_token
from .models import Usuario


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

        roles_token = payload.get("roles", [])
        if not roles_token:
            raise AuthenticationFailed("El token no contiene roles asignados")

        usuario.roles_activos = roles_token
        return (usuario, payload)  