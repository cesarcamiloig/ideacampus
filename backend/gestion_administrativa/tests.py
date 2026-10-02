from unittest.mock import patch
from django.test import TestCase
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from .jwt_utils import generar_token, verificar_token
from .models import Rol, Usuario, UsuarioRol
from .permissions import EsAdmin, TieneRolPermitido
from .views import AlgunaVistaProtegida, GoogleLogin, PerfilUsuarioView


class VistaSoloAdmin(APIView):
    permission_classes = [EsAdmin]

    def get(self, request):
        return Response({"ok": True, "rol": request.user.rol_activo})


class VistaMultiRol(APIView):
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ["admin", "coordinador"]

    def get(self, request):
        return Response({"ok": True, "rol": request.user.rol_activo})


class AuthTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.login_view = GoogleLogin.as_view()
        self.protected_view = AlgunaVistaProtegida.as_view()
        self.me_view = PerfilUsuarioView.as_view()
        self.admin_only_view = VistaSoloAdmin.as_view()
        self.multi_role_view = VistaMultiRol.as_view()
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
    def test_login_exitoso_estudiante_y_endpoint_me(self, mock_verify):
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
        self.assertIn("estudiante", res.data["usuario"]["roles_asignados"])
        self.assertIn("id_usuario", res.data["usuario"])

        token = res.data["token"]
        payload = verificar_token(token)
        self.assertIsNotNone(payload)
        self.assertIn("exp", payload)

        req_me = self.factory.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {token}")
        res_me = self.me_view(req_me)
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.data["nombre"], "Estudiante UFPS")
        self.assertEqual(res_me.data["rol"], "estudiante")
        self.assertIn("estudiante", res_me.data["roles_asignados"])

        # Un estudiante no puede acceder a VistaSoloAdmin (403)
        req_admin = self.factory.get("/admin-only/", HTTP_AUTHORIZATION=f"Bearer {token}")
        res_admin = self.admin_only_view(req_admin)
        self.assertEqual(res_admin.status_code, 403)

    @patch("gestion_administrativa.views.google_id_token.verify_oauth2_token")
    def test_control_acceso_rol_admin_y_permisos(self, mock_verify):
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
        self.assertCountEqual(res_ok.data["usuario"]["roles_asignados"], ["estudiante", "admin"])

        token_admin = res_ok.data["token"]
        req_admin = self.factory.get("/admin-only/", HTTP_AUTHORIZATION=f"Bearer {token_admin}")
        res_admin = self.admin_only_view(req_admin)
        self.assertEqual(res_admin.status_code, 200)
        self.assertEqual(res_admin.data["rol"], "admin")

        req_multi = self.factory.get("/multi/", HTTP_AUTHORIZATION=f"Bearer {token_admin}")
        res_multi = self.multi_role_view(req_multi)
        self.assertEqual(res_multi.status_code, 200)


from rest_framework import status
from rest_framework.test import APITestCase
from .models import VariableCaracterizacion, PeriodoAcademico


class AdminParametrosTests(APITestCase):
    def setUp(self):
        self.rol_admin, _ = Rol.objects.get_or_create(
            nombre_rol="admin", defaults={"descripcion": "Administrador"}
        )
        self.rol_tutor, _ = Rol.objects.get_or_create(
            nombre_rol="tutor", defaults={"descripcion": "Tutor"}
        )
        self.rol_mentor, _ = Rol.objects.get_or_create(
            nombre_rol="mentor", defaults={"descripcion": "Mentor"}
        )
        self.rol_estudiante, _ = Rol.objects.get_or_create(
            nombre_rol="estudiante", defaults={"descripcion": "Estudiante"}
        )

        # Usuario Admin
        self.admin_user = Usuario.objects.create(
            nombre="Admin General",
            correo="admin@ufps.edu.co",
            google_id="google-admin-1",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.admin_user, rol=self.rol_admin, estado="activo")
        self.token_admin = generar_token(self.admin_user, "admin")

        # Usuario Regular (Estudiante)
        self.estudiante_user = Usuario.objects.create(
            nombre="Estudiante Regular",
            correo="estudiante2@ufps.edu.co",
            google_id="google-est-2",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.estudiante_user, rol=self.rol_estudiante, estado="activo")
        self.token_estudiante = generar_token(self.estudiante_user, "estudiante")

    def test_admin_variables_crud_y_toggle(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_admin}")

        # Crear variable
        payload = {
            "name": "SECTOR_TECNOLOGICO",
            "description": "Sector de la iniciativa",
            "type": "Texto",
        }
        res_create = self.client.post("/api/parametros/variables/", payload, format="json")
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        var_id = res_create.data["id"]
        self.assertEqual(res_create.data["name"], "SECTOR_TECNOLOGICO")
        self.assertTrue(res_create.data["isActive"])

        # Listar variables
        res_list = self.client.get("/api/parametros/variables/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertTrue(any(v["id"] == var_id for v in res_list.data))

        # Actualizar variable
        res_update = self.client.put(
            f"/api/parametros/variables/{var_id}/",
            {"name": "SECTOR_PRODUCTIVO", "description": "Actualizado"},
            format="json",
        )
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data["name"], "SECTOR_PRODUCTIVO")

        # Toggle isActive
        res_toggle = self.client.patch(
            f"/api/parametros/variables/{var_id}/",
            {"isActive": False},
            format="json",
        )
        self.assertEqual(res_toggle.status_code, status.HTTP_200_OK)
        self.assertFalse(res_toggle.data["isActive"])

    def test_admin_periodos_crud_y_vigente(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_admin}")

        # Crear periodo 1 (vigente)
        payload1 = {
            "year": 2026,
            "semester": "1°",
            "name": "Ciclo 2026-I",
            "startDate": "2026-02-15",
            "endDate": "2026-07-15",
            "isCurrent": True,
        }
        res_p1 = self.client.post("/api/parametros/periodos/", payload1, format="json")
        self.assertEqual(res_p1.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_p1.data["isCurrent"])
        id_p1 = res_p1.data["id"]

        # Crear periodo 2
        payload2 = {
            "year": 2026,
            "semester": "2°",
            "name": "Ciclo 2026-II",
            "startDate": "2026-08-01",
            "endDate": "2026-12-15",
        }
        res_p2 = self.client.post("/api/parametros/periodos/", payload2, format="json")
        self.assertEqual(res_p2.status_code, status.HTTP_201_CREATED)
        id_p2 = res_p2.data["id"]

        # Periodo 1 sigue vigente y periodo 2 no
        p1_bd = PeriodoAcademico.objects.get(id_periodo=id_p1)
        p2_bd = PeriodoAcademico.objects.get(id_periodo=id_p2)
        self.assertTrue(p1_bd.es_vigente)
        self.assertFalse(p2_bd.es_vigente)

        # Hacer vigente periodo 2
        res_vigente = self.client.post(f"/api/parametros/periodos/{id_p2}/hacer-vigente/")
        self.assertEqual(res_vigente.status_code, status.HTTP_200_OK)
        self.assertTrue(res_vigente.data["isCurrent"])

        p1_bd.refresh_from_db()
        p2_bd.refresh_from_db()
        self.assertFalse(p1_bd.es_vigente)
        self.assertTrue(p2_bd.es_vigente)

        # Error si endDate < startDate
        res_error = self.client.post("/api/parametros/periodos/", {
            "year": 2027,
            "semester": "1°",
            "name": "Ciclo Invalido",
            "startDate": "2027-10-01",
            "endDate": "2027-01-01",
        }, format="json")
        self.assertEqual(res_error.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_roles_y_usuarios_asignacion(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_admin}")

        # Catálogo de roles
        res_cat = self.client.get("/api/parametros/roles/")
        self.assertEqual(res_cat.status_code, status.HTTP_200_OK)
        roles_ids = [r["id"] for r in res_cat.data]
        self.assertIn("admin", roles_ids)
        self.assertIn("tutor", roles_ids)

        # Listar usuarios
        res_users = self.client.get("/api/parametros/usuarios/")
        self.assertEqual(res_users.status_code, status.HTTP_200_OK)
        self.assertTrue(any(u["id_usuario"] == self.estudiante_user.id_usuario for u in res_users.data))

        # Asignar roles (tutor y mentor) al estudiante
        res_asig = self.client.put(
            f"/api/parametros/usuarios/{self.estudiante_user.id_usuario}/roles/",
            {"roles": ["tutor", "mentor"]},
            format="json",
        )
        self.assertEqual(res_asig.status_code, status.HTTP_200_OK)
        self.assertIn("tutor", res_asig.data["roles"])
        self.assertIn("mentor", res_asig.data["roles"])

        # Intentar asignar rol admin desde el panel operativo (debe ser rechazado)
        res_block_admin = self.client.put(
            f"/api/parametros/usuarios/{self.estudiante_user.id_usuario}/roles/",
            {"roles": ["admin", "tutor"]},
            format="json",
        )
        self.assertEqual(res_block_admin.status_code, status.HTTP_400_BAD_REQUEST)

        # Toggle isActive del usuario
        res_patch_user = self.client.patch(
            f"/api/parametros/usuarios/{self.estudiante_user.id_usuario}/",
            {"isActive": False},
            format="json",
        )
        self.assertEqual(res_patch_user.status_code, status.HTTP_200_OK)
        self.assertFalse(res_patch_user.data["isActive"])
        self.estudiante_user.refresh_from_db()
        self.assertEqual(self.estudiante_user.estado, "inactivo")

    def test_permisos_restringidos_solo_admin(self):
        # Con token de estudiante, el acceso a todos los endpoints de administración debe dar 403
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")

        res_var = self.client.get("/api/parametros/variables/")
        self.assertEqual(res_var.status_code, status.HTTP_403_FORBIDDEN)

        res_per = self.client.get("/api/parametros/periodos/")
        self.assertEqual(res_per.status_code, status.HTTP_403_FORBIDDEN)

        res_rol = self.client.get("/api/parametros/roles/")
        self.assertEqual(res_rol.status_code, status.HTTP_403_FORBIDDEN)

        res_usr = self.client.get("/api/parametros/usuarios/")
        self.assertEqual(res_usr.status_code, status.HTTP_403_FORBIDDEN)


