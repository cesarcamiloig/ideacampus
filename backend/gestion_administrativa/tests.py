from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from .jwt_utils import verificar_token
from .models import Rol, Usuario, UsuarioRol
from .views import AlgunaVistaProtegida, GoogleLogin


class AuthTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.login_view = GoogleLogin.as_view()
        self.protected_view = AlgunaVistaProtegida.as_view()
        self.rol_estudiante, _ = Rol.objects.get_or_create(
            nombre_rol="estudiante",
            defaults={"descripcion": "Rol de estudiante"},
        )
        self.rol_admin, _ = Rol.objects.get_or_create(
            nombre_rol="admin",
            defaults={"descripcion": "Rol de administrador"},
        )

    def test_requiere_id_token_y_rol(self):
        req_no_token = self.factory.post("/api/auth/google/", {}, format="json")
        res_no_token = self.login_view(req_no_token)
        self.assertEqual(res_no_token.status_code, 400)
        self.assertEqual(res_no_token.data["error"], "id_token es requerido")

        req_no_rol = self.factory.post("/api/auth/google/", {"id_token": "abc"}, format="json")
        res_no_rol = self.login_view(req_no_rol)
        self.assertEqual(res_no_rol.status_code, 400)
        self.assertEqual(res_no_rol.data["error"], "rol es requerido")

    @patch("gestion_administrativa.views.google_id_token.verify_oauth2_token")
    def test_rechaza_correo_no_institucional(self, mock_verify):
        mock_verify.return_value = {
            "sub": "google-externo-1",
            "email": "externo@gmail.com",
            "name": "Usuario Externo",
        }
        req = self.factory.post(
            "/api/auth/google/",
            {"id_token": "valid_token", "rol": "estudiante"},
            format="json",
        )
        res = self.login_view(req)
        self.assertEqual(res.status_code, 403)
        self.assertIn("@ufps.edu.co", res.data["error"])

    @patch("gestion_administrativa.views.google_id_token.verify_oauth2_token")
    def test_login_exitoso_estudiante_y_acceso_jwt(self, mock_verify):
        mock_verify.return_value = {
            "sub": "google-ufps-1",
            "email": "estudiante@ufps.edu.co",
            "name": "Estudiante UFPS",
        }
        req = self.factory.post(
            "/api/auth/google/",
            {"id_token": "valid_token", "rol": "estudiante"},
            format="json",
        )
        res = self.login_view(req)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["created"])
        self.assertEqual(res.data["usuario"]["rol"], "estudiante")

        token = res.data["token"]
        payload = verificar_token(token)
        self.assertIsNotNone(payload)
        self.assertIn("exp", payload)

        req_prot = self.factory.get("/protected/", HTTP_AUTHORIZATION=f"Bearer {token}")
        res_prot = self.protected_view(req_prot)
        self.assertEqual(res_prot.status_code, 200)
        self.assertEqual(res_prot.data["nombre"], "Estudiante UFPS")

    @patch("gestion_administrativa.views.google_id_token.verify_oauth2_token")
    def test_control_acceso_rol_admin(self, mock_verify):
        mock_verify.return_value = {
            "sub": "google-ufps-2",
            "email": "docente@ufps.edu.co",
            "name": "Docente UFPS",
        }
        req_forbidden = self.factory.post(
            "/api/auth/google/",
            {"id_token": "valid_token", "rol": "admin"},
            format="json",
        )
        res_forbidden = self.login_view(req_forbidden)
        self.assertEqual(res_forbidden.status_code, 403)

        usuario = Usuario.objects.get(correo="docente@ufps.edu.co")
        UsuarioRol.objects.create(usuario=usuario, rol=self.rol_admin, estado="activo")

        req_ok = self.factory.post(
            "/api/auth/google/",
            {"id_token": "valid_token", "rol": "administrador"},
            format="json",
        )
        res_ok = self.login_view(req_ok)
        self.assertEqual(res_ok.status_code, 200)
        self.assertEqual(res_ok.data["usuario"]["rol"], "admin")
