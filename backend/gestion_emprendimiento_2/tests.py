from rest_framework import status
from rest_framework.test import APITestCase

from gestion_administrativa.jwt_utils import generar_token
from gestion_administrativa.models import Rol, Usuario, UsuarioRol
from .models import Estudiante, EquipoEmprendedor


class GestionEquiposEmprendedoresTests(APITestCase):
    def setUp(self):
        # 1. Configurar Roles
        self.rol_estudiante, _ = Rol.objects.get_or_create(
            nombre_rol="estudiante", defaults={"descripcion": "Estudiante"}
        )
        self.rol_coordinador, _ = Rol.objects.get_or_create(
            nombre_rol="coordinador", defaults={"descripcion": "Coordinador"}
        )

        # 2. Configurar Usuarios estudiantes
        self.lider = Usuario.objects.create(
            nombre="Camilo Lider",
            correo="camilo@ufps.edu.co",
            google_id="gid-lider-1",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.lider, rol=self.rol_estudiante, estado="activo")
        self.token_lider = generar_token(self.lider, "estudiante")

        self.miembro1 = Usuario.objects.create(
            nombre="Daniel Miembro",
            correo="daniel@ufps.edu.co",
            google_id="gid-m1",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.miembro1, rol=self.rol_estudiante, estado="activo")
        self.token_miembro1 = generar_token(self.miembro1, "estudiante")

        self.miembro2 = Usuario.objects.create(
            nombre="Miguel Miembro",
            correo="miguel@ufps.edu.co",
            google_id="gid-m2",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.miembro2, rol=self.rol_estudiante, estado="activo")
        self.token_miembro2 = generar_token(self.miembro2, "estudiante")

        self.estudiante_libre = Usuario.objects.create(
            nombre="Andres Libre",
            correo="andres@ufps.edu.co",
            google_id="gid-libre",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.estudiante_libre, rol=self.rol_estudiante, estado="activo")

        # Usuario no estudiante
        self.coordinador = Usuario.objects.create(
            nombre="Coordinadora Maria",
            correo="maria@ufps.edu.co",
            google_id="gid-coord",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.coordinador, rol=self.rol_coordinador, estado="activo")
        self.token_coordinador = generar_token(self.coordinador, "coordinador")

    def test_estudiantes_disponibles(self):
        """Verifica que solo liste estudiantes activos sin equipo, excluyendo al usuario solicitante."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res = self.client.get("/api/estudiantes-disponibles/")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids_en_respuesta = [item["id_usuario"] for item in res.data]

        # Debe incluir a los estudiantes sin equipo
        self.assertIn(self.miembro1.id_usuario, ids_en_respuesta)
        self.assertIn(self.miembro2.id_usuario, ids_en_respuesta)
        self.assertIn(self.estudiante_libre.id_usuario, ids_en_respuesta)

        # NO debe incluir al líder que consulta
        self.assertNotIn(self.lider.id_usuario, ids_en_respuesta)
        # NO debe incluir al coordinador
        self.assertNotIn(self.coordinador.id_usuario, ids_en_respuesta)

    def test_estudiantes_disponibles_filtro_nombre(self):
        """Verifica el filtro por nombre/correo en estudiantes disponibles."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res = self.client.get("/api/estudiantes-disponibles/?nombre=daniel")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["correo"], "daniel@ufps.edu.co")

    def test_crear_equipo_exitoso(self):
        """Verifica la creación exitosa de un equipo con líder y miembros."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")

        payload = {
            "nombre_equipo": "Innovadores UFPS",
            "id_usuario_lider": self.lider.id_usuario,
            "id_usuarios": [
                self.lider.id_usuario,
                self.miembro1.id_usuario,
                self.miembro2.id_usuario,
            ],
        }

        res = self.client.post("/api/equipos/crear/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["nombre_equipo"], "Innovadores UFPS")
        self.assertEqual(res.data["estudiante_lider"], self.lider.id_usuario)

        equipo = EquipoEmprendedor.objects.get(nombre_equipo="Innovadores UFPS")
        self.assertEqual(equipo.miembros.count(), 3)
        self.assertEqual(equipo.estudiante_lider.usuario_id, self.lider.id_usuario)

    def test_crear_equipo_no_lider_falla(self):
        """Verifica que un usuario no pueda registrarse como líder de otra persona."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")

        payload = {
            "nombre_equipo": "Falso Equipo",
            "id_usuario_lider": self.miembro1.id_usuario,  # Pretende que otro sea el líder
            "id_usuarios": [self.miembro1.id_usuario, self.lider.id_usuario],
        }

        res = self.client.post("/api/equipos/crear/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_crear_equipo_duplicado_o_ya_con_equipo_falla(self):
        """Verifica que si un miembro ya pertenece a otro equipo, la creación falle."""
        # Creamos primer equipo
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        payload1 = {
            "nombre_equipo": "Equipo Alfa",
            "id_usuario_lider": self.lider.id_usuario,
            "id_usuarios": [self.lider.id_usuario, self.miembro1.id_usuario],
        }
        res1 = self.client.post("/api/equipos/crear/", payload1, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # El líder intenta crear un segundo equipo -> 400
        payload2 = {
            "nombre_equipo": "Equipo Beta",
            "id_usuario_lider": self.lider.id_usuario,
            "id_usuarios": [self.lider.id_usuario, self.miembro2.id_usuario],
        }
        res2 = self.client.post("/api/equipos/crear/", payload2, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_consultar_mi_equipo(self):
        """Verifica la consulta de 'mi-equipo' cuando no tiene y cuando ya tiene equipo."""
        # 1. Antes de tener equipo
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res_vacio = self.client.get("/api/equipos/mi-equipo/")
        self.assertEqual(res_vacio.status_code, status.HTTP_200_OK)
        self.assertFalse(res_vacio.data["tiene_equipo"])
        self.assertIsNone(res_vacio.data["equipo"])

        # 2. Crear equipo
        payload = {
            "nombre_equipo": "Gennova Team",
            "id_usuario_lider": self.lider.id_usuario,
            "id_usuarios": [self.lider.id_usuario, self.miembro1.id_usuario],
        }
        self.client.post("/api/equipos/crear/", payload, format="json")

        # 3. Consultar como líder
        res_lider = self.client.get("/api/equipos/mi-equipo/")
        self.assertEqual(res_lider.status_code, status.HTTP_200_OK)
        self.assertTrue(res_lider.data["tiene_equipo"])
        self.assertTrue(res_lider.data["equipo"]["es_lider"])
        self.assertEqual(len(res_lider.data["equipo"]["miembros"]), 2)

        # 4. Consultar como miembro
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_miembro1}")
        res_miembro = self.client.get("/api/equipos/mi-equipo/")
        self.assertEqual(res_miembro.status_code, status.HTTP_200_OK)
        self.assertTrue(res_miembro.data["tiene_equipo"])
        self.assertFalse(res_miembro.data["equipo"]["es_lider"])
        self.assertEqual(res_miembro.data["equipo"]["lider"]["correo"], "camilo@ufps.edu.co")

    def test_actualizar_nombre_equipo(self):
        """Solo el líder puede renombrar el equipo."""
        # Crear equipo
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res_crear = self.client.post("/api/equipos/crear/", {
            "nombre_equipo": "Nombre Inicial",
            "id_usuario_lider": self.lider.id_usuario,
            "id_usuarios": [self.lider.id_usuario, self.miembro1.id_usuario],
        }, format="json")
        id_equipo = res_crear.data["id_equipo"]

        # Miembro intenta renombrar -> 403
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_miembro1}")
        res_patch_fail = self.client.patch(f"/api/equipos/{id_equipo}/", {"nombre_equipo": "Hacker Team"}, format="json")
        self.assertEqual(res_patch_fail.status_code, status.HTTP_403_FORBIDDEN)

        # Líder renombra -> 200
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res_patch_ok = self.client.patch(f"/api/equipos/{id_equipo}/", {"nombre_equipo": "Nombre Nuevo"}, format="json")
        self.assertEqual(res_patch_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch_ok.data["nombre_equipo"], "Nombre Nuevo")

    def test_eliminar_miembro(self):
        """El líder puede remover miembros, pero no a sí mismo. Miembros no pueden expulsar a nadie."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res_crear = self.client.post("/api/equipos/crear/", {
            "nombre_equipo": "Equipo A",
            "id_usuario_lider": self.lider.id_usuario,
            "id_usuarios": [self.lider.id_usuario, self.miembro1.id_usuario],
        }, format="json")
        id_equipo = res_crear.data["id_equipo"]

        # Líder no puede eliminarse a sí mismo
        res_del_self = self.client.delete(f"/api/equipos/{id_equipo}/miembros/{self.lider.id_usuario}/")
        self.assertEqual(res_del_self.status_code, status.HTTP_400_BAD_REQUEST)

        # Miembro no puede eliminar
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_miembro1}")
        res_del_perm = self.client.delete(f"/api/equipos/{id_equipo}/miembros/{self.miembro1.id_usuario}/")
        self.assertEqual(res_del_perm.status_code, status.HTTP_403_FORBIDDEN)

        # Líder elimina al miembro -> 200
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res_del_ok = self.client.delete(f"/api/equipos/{id_equipo}/miembros/{self.miembro1.id_usuario}/")
        self.assertEqual(res_del_ok.status_code, status.HTTP_200_OK)

        # Verificar que el miembro ya no tiene equipo
        estudiante_m1 = Estudiante.objects.get(usuario=self.miembro1)
        self.assertIsNone(estudiante_m1.equipo)

    def test_agregar_miembro_a_equipo(self):
        """El líder puede incorporar nuevos estudiantes libres al equipo."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res_crear = self.client.post("/api/equipos/crear/", {
            "nombre_equipo": "Equipo Creciente",
            "id_usuario_lider": self.lider.id_usuario,
            "id_usuarios": [self.lider.id_usuario, self.miembro1.id_usuario],
        }, format="json")
        id_equipo = res_crear.data["id_equipo"]

        # Líder agrega a estudiante libre
        res_add = self.client.post(
            f"/api/equipos/{id_equipo}/miembros/",
            {"id_usuario": self.estudiante_libre.id_usuario},
            format="json"
        )
        self.assertEqual(res_add.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_add.data["miembro"]["correo"], "andres@ufps.edu.co")

        # Verificar en base de datos
        estudiante_libre = Estudiante.objects.get(usuario=self.estudiante_libre)
        self.assertEqual(estudiante_libre.equipo_id, id_equipo)
