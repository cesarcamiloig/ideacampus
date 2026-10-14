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


def obtener_roles_activos(usuario):
    return list(
        UsuarioRol.objects.filter(usuario=usuario, estado="activo")
        .select_related("rol")
        .values_list("rol__nombre_rol", flat=True)
    )


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

            usuario, created = Usuario.objects.get_or_create(
                google_id=google_id,
                defaults={"nombre": nombre, "correo": email}
            )

            if usuario.estado != "activo":
                return Response(
                    {"error": "Tu cuenta de usuario se encuentra inactiva"},
                    status=status.HTTP_403_FORBIDDEN
                )

            UsuarioRol.objects.get_or_create(
                usuario=usuario,
                rol=rol_estudiante,
                defaults={"estado": "activo"}
            )

        usuario.ultimo_acceso = timezone.now()
        usuario.save(update_fields=["ultimo_acceso"])

        jwt_token = generar_token(usuario)
        roles_asignados = obtener_roles_activos(usuario)

        return Response({
            "token": jwt_token,
            "usuario": {
                "id_usuario": usuario.id_usuario,
                "nombre": usuario.nombre,
                "correo": usuario.correo,
                "roles": roles_asignados,
            },
            "created": created,
            "message": "Login exitoso"
        }, status=status.HTTP_200_OK)


class PerfilUsuarioView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        roles_activos = getattr(usuario, "roles_activos", [])
        return Response({
            "id_usuario": usuario.id_usuario,
            "nombre": usuario.nombre,
            "correo": usuario.correo,
            "roles": roles_activos,
        })


AlgunaVistaProtegida = PerfilUsuarioView


# =========================================================================
# Vistas HU-18: Módulo de Administración Paramétrica (Protegidas con EsAdmin)
# =========================================================================

from .permissions import EsAdmin
from .models import VariableCaracterizacion, PeriodoAcademico
from .serializers import (
    VariableCaracterizacionSerializer,
    PeriodoAcademicoSerializer,
    RolCatalogoSerializer,
    UsuarioAdminSerializer,
    AsignarRolesUsuarioSerializer,
)


class VariableListCreateView(APIView):
    permission_classes = [EsAdmin]

    def get(self, request):
        variables = VariableCaracterizacion.objects.all().order_by("id_variable")
        serializer = VariableCaracterizacionSerializer(variables, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = VariableCaracterizacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variable = serializer.save()
        return Response(
            VariableCaracterizacionSerializer(variable).data,
            status=status.HTTP_201_CREATED,
        )


class VariableDetailView(APIView):
    permission_classes = [EsAdmin]

    def get_object(self, pk):
        try:
            return VariableCaracterizacion.objects.get(id_variable=pk)
        except VariableCaracterizacion.DoesNotExist:
            return None

    def put(self, request, pk):
        variable = self.get_object(pk)
        if not variable:
            return Response(
                {"error": "Variable de caracterización no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = VariableCaracterizacionSerializer(variable, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        variable = serializer.save()
        return Response(VariableCaracterizacionSerializer(variable).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        variable = self.get_object(pk)
        if not variable:
            return Response(
                {"error": "Variable de caracterización no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if "isActive" in request.data:
            variable.estado = "activo" if request.data["isActive"] else "inactivo"
        elif "estado" in request.data:
            variable.estado = request.data["estado"]
        else:
            variable.estado = "inactivo" if variable.estado == "activo" else "activo"

        variable.save(update_fields=["estado"])
        return Response(VariableCaracterizacionSerializer(variable).data, status=status.HTTP_200_OK)


class PeriodoListCreateView(APIView):
    permission_classes = [EsAdmin]

    def get(self, request):
        periodos = PeriodoAcademico.objects.all().order_by("-anio", "-semestre")
        serializer = PeriodoAcademicoSerializer(periodos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PeriodoAcademicoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            es_vigente = serializer.validated_data.get("es_vigente", False)
            if es_vigente:
                PeriodoAcademico.objects.filter(es_vigente=True).update(es_vigente=False)
            periodo = serializer.save()

        return Response(
            PeriodoAcademicoSerializer(periodo).data,
            status=status.HTTP_201_CREATED,
        )


class PeriodoDetailView(APIView):
    permission_classes = [EsAdmin]

    def get_object(self, pk):
        try:
            return PeriodoAcademico.objects.get(id_periodo=pk)
        except PeriodoAcademico.DoesNotExist:
            return None

    def put(self, request, pk):
        periodo = self.get_object(pk)
        if not periodo:
            return Response(
                {"error": "Periodo académico no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = PeriodoAcademicoSerializer(periodo, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if serializer.validated_data.get("es_vigente"):
                PeriodoAcademico.objects.exclude(id_periodo=periodo.id_periodo).filter(
                    es_vigente=True
                ).update(es_vigente=False)
            periodo = serializer.save()

        return Response(PeriodoAcademicoSerializer(periodo).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        periodo = self.get_object(pk)
        if not periodo:
            return Response(
                {"error": "Periodo académico no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if "isActive" in request.data:
            nuevo_activo = bool(request.data["isActive"])
            periodo.estado = "activo" if nuevo_activo else "inactivo"
            if not nuevo_activo and periodo.es_vigente:
                periodo.es_vigente = False
        elif "estado" in request.data:
            periodo.estado = request.data["estado"]
            if periodo.estado != "activo" and periodo.es_vigente:
                periodo.es_vigente = False
        else:
            if periodo.estado == "activo":
                periodo.estado = "inactivo"
                periodo.es_vigente = False
            else:
                periodo.estado = "activo"

        periodo.save(update_fields=["estado", "es_vigente"])
        return Response(PeriodoAcademicoSerializer(periodo).data, status=status.HTTP_200_OK)


class PeriodoHacerVigenteView(APIView):
    permission_classes = [EsAdmin]

    def post(self, request, pk):
        try:
            periodo = PeriodoAcademico.objects.get(id_periodo=pk)
        except PeriodoAcademico.DoesNotExist:
            return Response(
                {"error": "Periodo académico no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            PeriodoAcademico.objects.exclude(id_periodo=periodo.id_periodo).filter(
                es_vigente=True
            ).update(es_vigente=False)
            periodo.es_vigente = True
            periodo.estado = "activo"
            periodo.save(update_fields=["es_vigente", "estado"])

        return Response(PeriodoAcademicoSerializer(periodo).data, status=status.HTTP_200_OK)


class RolCatalogoListView(APIView):
    permission_classes = [EsAdmin]

    def get(self, request):
        roles = Rol.objects.all().order_by("id_rol")
        serializer = RolCatalogoSerializer(roles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UsuarioAdminListView(APIView):
    permission_classes = [EsAdmin]

    def get(self, request):
        usuarios = (
            Usuario.objects.all()
            .prefetch_related("usuariorol_set__rol")
            .order_by("id_usuario")
        )
        serializer = UsuarioAdminSerializer(usuarios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UsuarioRolesUpdateView(APIView):
    permission_classes = [EsAdmin]

    def put(self, request, pk):
        try:
            usuario = Usuario.objects.get(id_usuario=pk)
        except Usuario.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AsignarRolesUsuarioSerializer(
            data=request.data, context={"usuario": usuario}
        )
        serializer.is_valid(raise_exception=True)
        roles_solicitados = serializer.validated_data["roles"]

        with transaction.atomic():
            roles_objetos = {
                r.nombre_rol: r
                for r in Rol.objects.filter(nombre_rol__in=roles_solicitados)
            }

            UsuarioRol.objects.filter(usuario=usuario).exclude(
                rol__nombre_rol__in=roles_solicitados
            ).exclude(rol__nombre_rol="admin").update(estado="inactivo")

            for nombre_rol, rol_obj in roles_objetos.items():
                UsuarioRol.objects.update_or_create(
                    usuario=usuario,
                    rol=rol_obj,
                    defaults={"estado": "activo"},
                )

        return Response(
            UsuarioAdminSerializer(usuario).data,
            status=status.HTTP_200_OK,
        )


class UsuarioAdminDetailView(APIView):
    permission_classes = [EsAdmin]

    def patch(self, request, pk):
        try:
            usuario = Usuario.objects.get(id_usuario=pk)
        except Usuario.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if "isActive" in request.data:
            usuario.estado = "activo" if request.data["isActive"] else "inactivo"
            usuario.save(update_fields=["estado"])
        elif "estado" in request.data:
            usuario.estado = request.data["estado"]
            usuario.save(update_fields=["estado"])

        return Response(
            UsuarioAdminSerializer(usuario).data,
            status=status.HTTP_200_OK,
        )