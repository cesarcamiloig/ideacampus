from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from .models import Usuario  # ajusta el import según dónde esté tu models.py

GOOGLE_CLIENT_ID = "260735986909-fu7gptlsfojfho3kmaj212djjf8k6p60.apps.googleusercontent.com"


class GoogleLogin(APIView):
    def post(self, request):
        token = request.data.get("id_token")

        if not token:
            return Response(
                {"error": "id_token es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            idinfo = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                GOOGLE_CLIENT_ID
            )
        except ValueError as e:
            return Response(
                {"error": f"Token inválido: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        google_id = idinfo.get("sub")
        email = idinfo.get("email")
        nombre = idinfo.get("name", "")  # nombre completo que da Google

        usuario, created = Usuario.objects.get_or_create(
            google_id=google_id,
            defaults={
                "nombre": nombre,
                "correo": email,
            }
        )

        # Actualiza el último acceso cada vez que inicia sesión
        usuario.ultimo_acceso = timezone.now()
        usuario.save(update_fields=["ultimo_acceso"])

        return Response({
            "id_usuario": usuario.id_usuario,
            "nombre": usuario.nombre,
            "correo": usuario.correo,
            "google_id": usuario.google_id,
            "created": created,
            "message": "Login exitoso"
        }, status=status.HTTP_200_OK)