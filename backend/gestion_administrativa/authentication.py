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

        roles_token = payload.get("roles")
        if not isinstance(roles_token, list):
            # Tokens emitidos antes de quitar "rol" del token
            roles_token = [payload["rol"]] if payload.get("rol") else []

        if not roles_token:
            raise AuthenticationFailed("El token no contiene roles asignados")

        # Los roles se vuelven a leer de la BD en cada petición: un rol retirado deja de valer
        # aunque el token todavía lo traiga
        roles_bd = list(
            UsuarioRol.objects.filter(usuario=usuario, estado="activo")
            .select_related("rol")
            .order_by("pk")
            .values_list("rol__nombre_rol", flat=True)
        )

        tiene_estudiante_inactivo = UsuarioRol.objects.filter(
            usuario=usuario, rol__nombre_rol="estudiante", estado="inactivo"
        ).exists()

        roles_vigentes = list(
            dict.fromkeys(
                roles_bd
                + [
                    r
                    for r in roles_token
                    if (r == "estudiante" and not tiene_estudiante_inactivo) or r in roles_bd
                ]
            )
        )
        if not roles_vigentes:
            raise AuthenticationFailed("El usuario no posee roles activos asignados")

        # Los permisos dependen de todos los roles vigentes. El rol activo solo indica desde qué
        # rol se consulta (p. ej. "mis proyectos" como tutor o como estudiante): lo envía la
        # interfaz en X-Rol-Activo y solo se acepta si es uno de los roles vigentes. Sin cabecera
        # se usa el rol asignado más antiguo.
        rol_solicitado = (request.headers.get("X-Rol-Activo") or "").strip().lower()
        rol_activo = rol_solicitado if rol_solicitado in roles_vigentes else roles_vigentes[0]

        usuario.rol_activo = rol_activo
        usuario.roles_activos = roles_vigentes
        usuario.roles_asignados = roles_vigentes
        payload["rol"] = rol_activo
        payload["roles"] = roles_vigentes

        return (usuario, payload)  # request.user = usuario, request.auth = payload