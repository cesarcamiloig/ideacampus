
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

        rol_token = payload.get("rol")
        if rol_token != "estudiante":
            tiene_rol_activo = UsuarioRol.objects.filter(
                usuario=usuario,
                rol__nombre_rol=rol_token,
                estado="activo"
            ).exists()
            if not tiene_rol_activo:
                raise AuthenticationFailed("El rol del token no está asignado o activo")

        return (usuario, None)  # request.user = usuario