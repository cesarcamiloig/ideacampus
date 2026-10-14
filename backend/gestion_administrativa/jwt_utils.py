import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from .models import UsuarioRol


def generar_token(usuario):
    now = datetime.now(timezone.utc)

    roles_activos = list(
        UsuarioRol.objects.filter(usuario=usuario, estado="activo")
        .select_related("rol")
        .values_list("rol__nombre_rol", flat=True)
    )

    payload = {
        "id_usuario": usuario.id_usuario,
        "correo": usuario.correo,
        "roles": roles_activos,
        "iat": now,
        "exp": now + timedelta(hours=getattr(settings, "JWT_EXP_DELTA_HOURS", 24)),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token


def verificar_token(token):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # token expirado
    except jwt.InvalidTokenError:
        return None  # token inválido