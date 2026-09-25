import jwt
from datetime import datetime, timedelta
from django.conf import settings


def generar_token(usuario):
    roles = list(
        usuario.usuariorol_set
        .filter(estado='activo')
        .values_list('rol__nombre_rol', flat=True)
    )

    payload = {
        "id_usuario": usuario.id_usuario,
        "correo": usuario.correo,
        "roles": roles
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