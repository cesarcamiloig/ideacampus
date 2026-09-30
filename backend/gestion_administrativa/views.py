import os
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from .authentication import JWTAuthentication
from .models import Usuario, UsuarioRol, Rol
from .jwt_utils import generar_token

DEFAULT_GOOGLE_CLIENT_ID = "260735986909-fu7gptlsfojfho3kmaj212djjf8k6p60.apps.googleusercontent.com"
env_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_ID = (
    env_client_id
    if env_client_id and not env_client_id.startswith("tu_client_id")
    else DEFAULT_GOOGLE_CLIENT_ID
)
ALLOWED_EMAIL_DOMAIN = "@ufps.edu.co"
ROLE_ALIASES = {
    "administrador": "admin",
}


class GoogleLogin(APIView):
    def post(self, request):
        token = request.data.get("id_token")
        rol_solicitado = request.data.get("rol")

        if not token:
            return Response(
                {"error": "id_token es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not rol_solicitado:
            return Response(
                {"error": "rol es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )

        rol_normalizado = ROLE_ALIASES.get(rol_solicitado, rol_solicitado)

        try:
            idinfo = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                GOOGLE_CLIENT_ID,
                clock_skew_in_seconds=10
            )
        except ValueError as e:
            return Response(
                {"error": f"Token inválido: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        google_id = idinfo.get("sub")
        email = (idinfo.get("email") or "").strip().lower()
        nombre = idinfo.get("name", "")

        if not email.endswith(ALLOWED_EMAIL_DOMAIN):
            return Response(
                {"error": f"Solo se permiten cuentas institucionales ({ALLOWED_EMAIL_DOMAIN})"},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            rol_estudiante, _ = Rol.objects.get_or_create(
                nombre_rol="estudiante",
                defaults={"descripcion": "Usuario estudiante"}
            )
            try:
                rol = Rol.objects.get(nombre_rol=rol_normalizado)
            except Rol.DoesNotExist:
                return Response(
                    {"error": f"El rol '{rol_solicitado}' no existe"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            usuario, created = Usuario.objects.get_or_create(
                google_id=google_id,
                defaults={"nombre": nombre, "correo": email}
            )

            if created:
                UsuarioRol.objects.get_or_create(
                    usuario=usuario,
                    rol=rol_estudiante,
                    defaults={"estado": "activo"}
                )

            if rol.nombre_rol == "estudiante":
                UsuarioRol.objects.update_or_create(
                    usuario=usuario,
                    rol=rol_estudiante,
                    defaults={"estado": "activo"}
                )

        if rol.nombre_rol != "estudiante":
            tiene_el_rol = UsuarioRol.objects.filter(
                usuario=usuario,
                rol=rol,
                estado="activo"
            ).exists()

            if not tiene_el_rol:
                return Response(
                    {"error": f"No tienes el rol '{rol.nombre_rol}' asignado"},
                    status=status.HTTP_403_FORBIDDEN
                )

        usuario.ultimo_acceso = timezone.now()
        usuario.save(update_fields=["ultimo_acceso"])

        jwt_token = generar_token(usuario, rol.nombre_rol)

        return Response({
            "token": jwt_token,
            "usuario": {
                "nombre": usuario.nombre,
                "correo": usuario.correo,
                "rol": rol.nombre_rol,
            },
            "created": created,
            "message": "Login exitoso"
        }, status=status.HTTP_200_OK)

class AlgunaVistaProtegida(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user  
        return Response({"nombre": usuario.nombre})