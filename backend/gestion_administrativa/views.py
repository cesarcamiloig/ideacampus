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

GOOGLE_CLIENT_ID = "260735986909-fu7gptlsfojfho3kmaj212djjf8k6p60.apps.googleusercontent.com"


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
        email = idinfo.get("email")
        nombre = idinfo.get("name", "")

        with transaction.atomic():
            rol_estudiante, _ = Rol.objects.get_or_create(
                nombre_rol="estudiante",
                defaults={"descripcion": "Usuario estudiante"}
            )
            try:
                rol = Rol.objects.get(nombre_rol=rol_solicitado)
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

            if rol_solicitado == "estudiante":
                UsuarioRol.objects.update_or_create(
                    usuario=usuario,
                    rol=rol_estudiante,
                    defaults={"estado": "activo"}
                )

        if rol_solicitado != "estudiante":
            tiene_el_rol = UsuarioRol.objects.filter(
                usuario=usuario,
                rol=rol,
                estado="activo"
            ).exists()

            if not tiene_el_rol:
                return Response(
                    {"error": f"No tienes el rol '{rol_solicitado}' asignado"},
                    status=status.HTTP_403_FORBIDDEN
                )

        usuario.ultimo_acceso = timezone.now()
        usuario.save(update_fields=["ultimo_acceso"])

        jwt_token = generar_token(usuario, rol_solicitado)  

        return Response({
            "token": jwt_token,
            "usuario": {
                "nombre": usuario.nombre,
                "correo": usuario.correo,
                "rol": rol_solicitado,  
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