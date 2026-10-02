from rest_framework import status
from rest_framework.test import APITestCase
from gestion_administrativa.jwt_utils import generar_token
from gestion_administrativa.models import Rol, Usuario, UsuarioRol
from .models import Tutor, Mentor


class TutorMentorPerfilTests(APITestCase):
    def setUp(self):
        # Configurar roles requeridos
        self.rol_tutor, _ = Rol.objects.get_or_create(
            nombre_rol="tutor", defaults={"descripcion": "Rol de tutor académico"}
        )
        self.rol_mentor, _ = Rol.objects.get_or_create(
            nombre_rol="mentor", defaults={"descripcion": "Rol de mentor"}
        )
        self.rol_estudiante, _ = Rol.objects.get_or_create(
            nombre_rol="estudiante", defaults={"descripcion": "Rol de estudiante"}
        )

        # Usuario Tutor
        self.usuario_tutor = Usuario.objects.create(
            nombre="Profesor Tutor",
            correo="tutor@ufps.edu.co",
            google_id="google-tutor-123",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.usuario_tutor, rol=self.rol_tutor, estado="activo")
        self.token_tutor = generar_token(self.usuario_tutor, "tutor")

        # Usuario Mentor
        self.usuario_mentor = Usuario.objects.create(
            nombre="Experto Mentor",
            correo="mentor@ufps.edu.co",
            google_id="google-mentor-456",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.usuario_mentor, rol=self.rol_mentor, estado="activo")
        self.token_mentor = generar_token(self.usuario_mentor, "mentor")

        # Usuario Estudiante
        self.usuario_estudiante = Usuario.objects.create(
            nombre="Estudiante UFPS",
            correo="estudiante@ufps.edu.co",
            google_id="google-estudiante-789",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.usuario_estudiante, rol=self.rol_estudiante, estado="activo")
        self.token_estudiante = generar_token(self.usuario_estudiante, "estudiante")

    def test_get_perfil_tutor_crea_perfil_inicial(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_tutor}")
        res = self.client.get("/api/tutor/perfil-academico/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["nombre"], "Profesor Tutor")
        self.assertEqual(res.data["correo"], "tutor@ufps.edu.co")
        self.assertEqual(res.data["area_conocimiento"], "")
        self.assertIsNone(res.data["nivel_academico"])
        self.assertTrue(Tutor.objects.filter(usuario=self.usuario_tutor).exists())

    def test_put_perfil_tutor_valido(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_tutor}")
        payload = {
            "area_conocimiento": "Arquitectura de Software",
            "nivel_academico": "maestria",
            "anios_experiencia": 8,
            "biografia": "Docente con 8 años de experiencia en desarrollo.",
            "enlace_perfil": "https://linkedin.com/in/tutor-ufps",
        }
        res = self.client.put("/api/tutor/perfil-academico/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["area_conocimiento"], "Arquitectura de Software")
        self.assertEqual(res.data["nivel_academico"], "maestria")
        self.assertEqual(res.data["anios_experiencia"], 8)

        tutor_bd = Tutor.objects.get(usuario=self.usuario_tutor)
        self.assertEqual(tutor_bd.area_conocimiento, "Arquitectura de Software")
        self.assertEqual(tutor_bd.nivel_academico, "maestria")

    def test_put_perfil_tutor_errores_validacion(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_tutor}")

        # Falta area_conocimiento
        res_sin_area = self.client.put("/api/tutor/perfil-academico/", {
            "area_conocimiento": "",
            "nivel_academico": "pregrado",
            "anios_experiencia": 2,
        }, format="json")
        self.assertEqual(res_sin_area.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("area_conocimiento", res_sin_area.data)

        # Nivel académico no válido
        res_nivel_invalido = self.client.put("/api/tutor/perfil-academico/", {
            "area_conocimiento": "Sistemas",
            "nivel_academico": "postdoctorado_inexistente",
            "anios_experiencia": 2,
        }, format="json")
        self.assertEqual(res_nivel_invalido.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nivel_academico", res_nivel_invalido.data)

        # Años de experiencia superiores a 60
        res_anios_invalidos = self.client.put("/api/tutor/perfil-academico/", {
            "area_conocimiento": "Sistemas",
            "nivel_academico": "pregrado",
            "anios_experiencia": 75,
        }, format="json")
        self.assertEqual(res_anios_invalidos.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("anios_experiencia", res_anios_invalidos.data)

    def test_control_acceso_perfil_tutor(self):
        # Sin token (rechazado por permisos)
        res_anon = self.client.get("/api/tutor/perfil-academico/")
        self.assertEqual(res_anon.status_code, status.HTTP_403_FORBIDDEN)

        # Con token inválido
        res_invalido = self.client.get(
            "/api/tutor/perfil-academico/", HTTP_AUTHORIZATION="Bearer token_invalido_xyz"
        )
        self.assertEqual(res_invalido.status_code, status.HTTP_403_FORBIDDEN)

        # Con rol estudiante
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")
        res_est = self.client.get("/api/tutor/perfil-academico/")
        self.assertEqual(res_est.status_code, status.HTTP_403_FORBIDDEN)

        # Con rol mentor intentando acceder a tutor
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_mentor}")
        res_men = self.client.get("/api/tutor/perfil-academico/")
        self.assertEqual(res_men.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_y_put_perfil_mentor_valido(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_mentor}")

        # GET inicial
        res_get = self.client.get("/api/mentor/perfil-academico/")
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data["nombre"], "Experto Mentor")
        self.assertEqual(res_get.data["area_especializacion"], "")

        # PUT válido
        payload = {
            "area_especializacion": "Finanzas e Innovación Tecnológica",
            "nivel_academico": "especializacion",
            "anios_experiencia": 12,
            "biografia": "Mentor en aceleradoras de negocio.",
            "enlace_perfil": "https://linkedin.com/in/mentor-ufps",
            "disponibilidad": "Viernes 2-6pm",
        }
        res_put = self.client.put("/api/mentor/perfil-academico/", payload, format="json")
        self.assertEqual(res_put.status_code, status.HTTP_200_OK)
        self.assertEqual(res_put.data["area_especializacion"], "Finanzas e Innovación Tecnológica")
        self.assertEqual(res_put.data["disponibilidad"], "Viernes 2-6pm")

        mentor_bd = Mentor.objects.get(usuario=self.usuario_mentor)
        self.assertEqual(mentor_bd.area_especializacion, "Finanzas e Innovación Tecnológica")
        self.assertEqual(mentor_bd.disponibilidad, "Viernes 2-6pm")

    def test_control_acceso_perfil_mentor(self):
        # Con rol tutor intentando acceder a mentor
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_tutor}")
        res = self.client.get("/api/mentor/perfil-academico/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
