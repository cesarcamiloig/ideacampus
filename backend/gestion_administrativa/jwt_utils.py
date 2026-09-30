import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings


def generar_token(usuario, rol):
    now = datetime.now(timezone.utc)
    payload = {
        "id_usuario": usuario.id_usuario,
        "correo": usuario.correo,
        "rol": rol,
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