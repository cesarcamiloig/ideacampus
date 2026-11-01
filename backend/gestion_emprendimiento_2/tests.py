from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from gestion_administrativa.jwt_utils import generar_token
from gestion_administrativa.models import Rol, Usuario, UsuarioRol
from gestion_acompaniamiento.models import Tutor
from gestion_convocatorias.models import Convocatoria, Iniciativa
from .models import (
    Estudiante,
    EquipoEmprendedor,
    Proyecto,
)


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

        # 3. Convocatoria e Iniciativa aprobada perteneciente al líder
        from datetime import timedelta
        from django.utils import timezone
        from gestion_convocatorias.models import Convocatoria, Iniciativa

        now = timezone.now()
        self.convocatoria = Convocatoria.objects.create(
            nombre="Convocatoria 2026",
            fecha_apertura=now - timedelta(days=1),
            fecha_cierre=now + timedelta(days=20),
            estado="abierta",
        )
        self.iniciativa_aprobada = Iniciativa.objects.create(
            convocatoria=self.convocatoria,
            usuario=self.lider,
            nombre="Plataforma de Innovación",
            tipo="emprendimiento",
            origen_academico="asignatura",
            estado="aprobada"
        )

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

    def test_crear_equipo_con_iniciativa_no_aprobada_falla(self):
        """Un estudiante NO puede registrar un equipo si su iniciativa está pendiente o rechazada."""
        from gestion_convocatorias.models import Iniciativa
        iniciativa_pendiente = Iniciativa.objects.create(
            convocatoria=self.convocatoria,
            usuario=self.lider,
            nombre="Iniciativa En Espera",
            tipo="emprendimiento",
            origen_academico="asignatura",
            estado="pendiente"
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        payload = {
            "nombre_equipo": "Equipo No Permitido",
            "id_usuario_lider": self.lider.id_usuario,
            "id_iniciativa": iniciativa_pendiente.id_iniciativa,
            "id_usuarios": [self.lider.id_usuario, self.miembro1.id_usuario],
        }
        res = self.client.post("/api/equipos/crear/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("aprobada", res.data["error"])

    def test_crear_equipo_con_iniciativa_de_otro_estudiante_falla(self):
        """Un estudiante NO puede crear un equipo usando la iniciativa de otro estudiante."""
        from gestion_convocatorias.models import Iniciativa
        iniciativa_ajena = Iniciativa.objects.create(
            convocatoria=self.convocatoria,
            usuario=self.miembro1,
            nombre="Iniciativa de Daniel",
            tipo="emprendimiento",
            origen_academico="asignatura",
            estado="aprobada"
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        payload = {
            "nombre_equipo": "Equipo Con Iniciativa Ajena",
            "id_usuario_lider": self.lider.id_usuario,
            "id_iniciativa": iniciativa_ajena.id_iniciativa,
            "id_usuarios": [self.lider.id_usuario, self.miembro1.id_usuario],
        }
        res = self.client.post("/api/equipos/crear/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("tú mismo", res.data["error"])

    def test_eliminar_equipo_por_lider_exitoso(self):
        """El líder puede eliminar su equipo y liberar a los integrantes."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res_crear = self.client.post("/api/equipos/crear/", {
            "nombre_equipo": "Equipo Para Eliminar",
            "id_usuario_lider": self.lider.id_usuario,
            "id_iniciativa": self.iniciativa_aprobada.id_iniciativa,
            "id_usuarios": [self.lider.id_usuario, self.miembro1.id_usuario],
        }, format="json")
        id_equipo = res_crear.data["id_equipo"]

        # Líder elimina su equipo vía /api/equipos/<id>/
        res_del = self.client.delete(f"/api/equipos/{id_equipo}/")
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertFalse(EquipoEmprendedor.objects.filter(id_equipo=id_equipo).exists())

        # Los estudiantes quedan sin equipo
        self.assertIsNone(Estudiante.objects.get(usuario=self.lider).equipo)
        self.assertIsNone(Estudiante.objects.get(usuario=self.miembro1).equipo)

    def test_eliminar_equipo_por_miembro_no_lider_falla(self):
        """Un integrante que no es líder NO puede eliminar el equipo."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        res_crear = self.client.post("/api/equipos/crear/", {
            "nombre_equipo": "Equipo Fuerte",
            "id_usuario_lider": self.lider.id_usuario,
            "id_iniciativa": self.iniciativa_aprobada.id_iniciativa,
            "id_usuarios": [self.lider.id_usuario, self.miembro1.id_usuario],
        }, format="json")
        id_equipo = res_crear.data["id_equipo"]

        # Miembro intenta eliminar
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_miembro1}")
        res_del = self.client.delete(f"/api/equipos/{id_equipo}/")
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(EquipoEmprendedor.objects.filter(id_equipo=id_equipo).exists())


class AsignacionEvaluadorProyectoTests(APITestCase):
    def setUp(self):
        from datetime import timedelta
        from django.utils import timezone
        from gestion_convocatorias.models import Convocatoria, Iniciativa

        rol_evaluador, _ = Rol.objects.get_or_create(nombre_rol="evaluador", defaults={"descripcion": "Evaluador"})
        rol_estudiante, _ = Rol.objects.get_or_create(nombre_rol="estudiante", defaults={"descripcion": "Estudiante"})
        rol_direccion, _ = Rol.objects.get_or_create(
            nombre_rol="direccion_del_programa", defaults={"descripcion": "Dirección de Programa"}
        )

        self.evaluador = Usuario.objects.create(
            nombre="Eva Evaluadora", correo="eva@ufps.edu.co", google_id="gid-eva", estado="activo"
        )
        UsuarioRol.objects.create(usuario=self.evaluador, rol=rol_evaluador, estado="activo")

        self.evaluador_inactivo = Usuario.objects.create(
            nombre="Ivan Inactivo", correo="ivan@ufps.edu.co", google_id="gid-ivan", estado="activo"
        )
        UsuarioRol.objects.create(usuario=self.evaluador_inactivo, rol=rol_evaluador, estado="inactivo")

        self.estudiante = Usuario.objects.create(
            nombre="Sara Estudiante", correo="sara@ufps.edu.co", google_id="gid-sara", estado="activo"
        )
        UsuarioRol.objects.create(usuario=self.estudiante, rol=rol_estudiante, estado="activo")
        self.token_estudiante = generar_token(self.estudiante, "estudiante")

        direccion = Usuario.objects.create(
            nombre="Diana Direccion", correo="diana@ufps.edu.co", google_id="gid-diana", estado="activo"
        )
        UsuarioRol.objects.create(usuario=direccion, rol=rol_direccion, estado="activo")
        self.token_direccion = generar_token(direccion, "direccion_del_programa")

        now = timezone.now()
        conv = Convocatoria.objects.create(
            nombre="Convocatoria Abierta",
            fecha_apertura=now - timedelta(days=2),
            fecha_cierre=now + timedelta(days=10),
            estado="abierta",
        )
        iniciativa = Iniciativa.objects.create(
            convocatoria=conv, usuario=self.estudiante, nombre="Huerta Inteligente",
            tipo="emprendimiento", origen_academico="asignatura", estado="aprobada",
        )
        self.proyecto = Proyecto.objects.get(iniciativa=iniciativa)
        self.url = f"/api/proyectos/{self.proyecto.id_proyecto}/evaluador/"

    def test_lista_solo_evaluadores_activos(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_direccion}")
        res = self.client.get("/api/proyectos/evaluadores/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [e["id_usuario"] for e in res.data]
        self.assertEqual(ids, [self.evaluador.id_usuario])

    def test_direccion_asigna_y_quita_evaluador(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_direccion}")
        res = self.client.patch(self.url, {"id_evaluador": self.evaluador.id_usuario}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.evaluador, self.evaluador)

        res = self.client.patch(self.url, {"id_evaluador": None}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.proyecto.refresh_from_db()
        self.assertIsNone(self.proyecto.evaluador)

    def test_rechaza_usuarios_sin_rol_evaluador_activo(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_direccion}")
        for usuario in (self.estudiante, self.evaluador_inactivo):
            res = self.client.patch(self.url, {"id_evaluador": usuario.id_usuario}, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.proyecto.refresh_from_db()
        self.assertIsNone(self.proyecto.evaluador)

    def test_estudiante_no_puede_asignar_evaluador(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")
        res = self.client.patch(self.url, {"id_evaluador": self.evaluador.id_usuario}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_modelo_valida_rol_evaluador(self):
        """La validación del modelo (usada por el admin) solo acepta evaluadores activos."""
        from django.core.exceptions import ValidationError
        self.proyecto.evaluador = self.estudiante
        with self.assertRaises(ValidationError):
            self.proyecto.full_clean()
        self.proyecto.evaluador = self.evaluador
        self.proyecto.full_clean()


class AsignacionTutorProyectoTests(APITestCase):
    """
    HU-05: Pruebas unitarias y de integración para la asignación manual de tutores
    a iniciativas validadas y proyectos institucionales.
    Cubre escenarios exitosos y fallidos (permisos, estados inválidos, alertas).
    """

    def setUp(self):
        self.rol_estudiante, _ = Rol.objects.get_or_create(
            nombre_rol="estudiante", defaults={"descripcion": "Estudiante"}
        )
        self.rol_coordinador, _ = Rol.objects.get_or_create(
            nombre_rol="coordinador", defaults={"descripcion": "Coordinador"}
        )
        self.rol_direccion, _ = Rol.objects.get_or_create(
            nombre_rol="direccion_del_programa", defaults={"descripcion": "Dirección"}
        )
        self.rol_tutor, _ = Rol.objects.get_or_create(
            nombre_rol="tutor", defaults={"descripcion": "Tutor Académico"}
        )

        # 1. Usuarios con roles
        self.estudiante = Usuario.objects.create(
            nombre="Camilo Estudiante",
            correo="camilo@ufps.edu.co",
            google_id="gid-camilo",
            estado="activo",
        )
        UsuarioRol.objects.create(
            usuario=self.estudiante, rol=self.rol_estudiante, estado="activo"
        )
        self.token_estudiante = generar_token(self.estudiante, "estudiante")

        self.coordinador = Usuario.objects.create(
            nombre="Claudia Coordinadora",
            correo="claudia@ufps.edu.co",
            google_id="gid-claudia",
            estado="activo",
        )
        UsuarioRol.objects.create(
            usuario=self.coordinador, rol=self.rol_coordinador, estado="activo"
        )
        self.token_coordinador = generar_token(self.coordinador, "coordinador")

        self.direccion = Usuario.objects.create(
            nombre="Diana Dirección",
            correo="diana_dir@ufps.edu.co",
            google_id="gid-diana-dir",
            estado="activo",
        )
        UsuarioRol.objects.create(
            usuario=self.direccion, rol=self.rol_direccion, estado="activo"
        )
        self.token_direccion = generar_token(self.direccion, "direccion_del_programa")

        # 2. Tutores (uno activo, uno inactivo)
        from gestion_acompaniamiento.models import Tutor

        self.usuario_tutor = Usuario.objects.create(
            nombre="Profesor Carlos Tutor",
            correo="carlostutor@ufps.edu.co",
            google_id="gid-carlos-tutor",
            estado="activo",
        )
        UsuarioRol.objects.create(
            usuario=self.usuario_tutor, rol=self.rol_tutor, estado="activo"
        )
        self.tutor_activo = Tutor.objects.create(
            usuario=self.usuario_tutor,
            area_conocimiento="Ingeniería de Software",
            nivel_academico="maestria",
            estado="activo",
        )

        self.usuario_tutor_inactivo = Usuario.objects.create(
            nombre="Profesor Inactivo",
            correo="inactivo@ufps.edu.co",
            google_id="gid-inactivo",
            estado="inactivo",
        )
        UsuarioRol.objects.create(
            usuario=self.usuario_tutor_inactivo, rol=self.rol_tutor, estado="inactivo"
        )
        self.tutor_inactivo = Tutor.objects.create(
            usuario=self.usuario_tutor_inactivo,
            area_conocimiento="Base de Datos",
            estado="inactivo",
        )

        # 3. Convocatoria e Iniciativa Validada (Aprobada) con Proyecto
        now = timezone.now()
        self.conv = Convocatoria.objects.create(
            nombre="Convocatoria 2026-I",
            fecha_apertura=now - timedelta(days=5),
            fecha_cierre=now + timedelta(days=20),
            estado="abierta",
        )
        self.iniciativa_aprobada = Iniciativa.objects.create(
            convocatoria=self.conv,
            usuario=self.estudiante,
            nombre="Plataforma de AgroTech",
            tipo="innovacion",
            origen_academico="asignatura",
            estado="aprobada",
        )
        self.proyecto = Proyecto.objects.get(iniciativa=self.iniciativa_aprobada)
        self.url = f"/api/proyectos/{self.proyecto.id_proyecto}/tutor/"

    def test_listado_tutores_disponibles_solo_activos(self):
        """Verifica que el endpoint /api/proyectos/tutores/ liste solo tutores activos con rol tutor."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.get("/api/proyectos/tutores/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids_tutores = [t["id_tutor"] for t in res.data]
        self.assertIn(self.tutor_activo.id_tutor, ids_tutores)
        self.assertNotIn(self.tutor_inactivo.id_tutor, ids_tutores)

    def test_asignacion_y_desasignacion_exitosa_por_coordinador(self):
        """Escenario exitoso: Coordinador asigna un tutor académico y luego lo desasigna."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")

        # Asignar
        res = self.client.patch(self.url, {"id_tutor": self.tutor_activo.id_tutor}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id_tutor"], self.tutor_activo.id_tutor)
        self.assertEqual(res.data["tutor_nombre"], "Profesor Carlos Tutor")
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.tutor, self.tutor_activo)

        # Desasignar (id_tutor: null)
        res_desasig = self.client.patch(self.url, {"id_tutor": None}, format="json")
        self.assertEqual(res_desasig.status_code, status.HTTP_200_OK)
        self.assertIsNone(res_desasig.data["id_tutor"])
        self.proyecto.refresh_from_db()
        self.assertIsNone(self.proyecto.tutor)

    def test_asignacion_exitosa_por_direccion_del_programa(self):
        """Escenario exitoso: Dirección del Programa asigna tutor a iniciativa validada."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_direccion}")
        res = self.client.patch(self.url, {"id_tutor": self.tutor_activo.id_tutor}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.tutor, self.tutor_activo)

    def test_emite_alerta_y_notificacion_al_asignar_tutor(self):
        """HU-05 + HU-12: Asignar un tutor genera una alerta automática de acompañamiento."""
        from gestion_convocatorias.models import AlertaRol, NotificacionConvocatoria

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.patch(self.url, {"id_tutor": self.tutor_activo.id_tutor}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 1. Alerta automática para el tutor
        alerta = AlertaRol.objects.filter(
            usuario=self.usuario_tutor,
            tipo="compromiso_tutoria",
        ).first()
        self.assertIsNotNone(alerta)
        self.assertIn("Asignación de Tutoría", alerta.titulo)
        self.assertEqual(alerta.rol_destinatario, "tutor")

        # 2. Notificación para el estudiante autor
        notif = NotificacionConvocatoria.objects.filter(
            usuario=self.estudiante,
            titulo="Tutor Académico Asignado",
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn("Profesor Carlos Tutor", notif.mensaje)

    def test_asignacion_falla_por_permisos_estudiante(self):
        """Escenario fallido: Un estudiante no tiene permisos para asignar tutores."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")
        res = self.client.patch(self.url, {"id_tutor": self.tutor_activo.id_tutor}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.proyecto.refresh_from_db()
        self.assertIsNone(self.proyecto.tutor)

    def test_asignacion_falla_con_tutor_invalido_o_inactivo(self):
        """Escenario fallido: Se rechaza la asignación de tutores inexistentes o inactivos."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")

        # ID que no existe
        res_inexistente = self.client.patch(self.url, {"id_tutor": 999999}, format="json")
        self.assertEqual(res_inexistente.status_code, status.HTTP_400_BAD_REQUEST)

        # Tutor inactivo
        res_inactivo = self.client.patch(
            self.url, {"id_tutor": self.tutor_inactivo.id_tutor}, format="json"
        )
        self.assertEqual(res_inactivo.status_code, status.HTTP_400_BAD_REQUEST)

        # Usuario con perfil Tutor pero sin rol institucional de tutor (un estudiante)
        tutor_sin_rol = Tutor.objects.create(
            usuario=self.estudiante,
            area_conocimiento="Ninguna",
            estado="activo",
        )
        res_no_tutor = self.client.patch(
            self.url, {"id_tutor": tutor_sin_rol.id_tutor}, format="json"
        )
        self.assertEqual(res_no_tutor.status_code, status.HTTP_400_BAD_REQUEST)

    def test_asignacion_falla_si_iniciativa_no_esta_validada_o_aprobada(self):
        """Escenario fallido: No se puede asignar tutor si la iniciativa no está validada/aprobada."""
        self.iniciativa_aprobada.estado = "en_revision"
        self.iniciativa_aprobada.save(update_fields=["estado"])

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.patch(self.url, {"id_tutor": self.tutor_activo.id_tutor}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("validadas y aprobadas", res.data["error"])

    def test_asignacion_falla_falta_campo_id_tutor(self):
        """Escenario fallido: La petición no envía 'id_tutor'."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.patch(self.url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("id_tutor", res.data["error"])

    def test_asignacion_falla_proyecto_inexistente(self):
        """Escenario fallido: Proyecto con id inexistente retorna 404."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.patch(
            "/api/proyectos/999999/tutor/", {"id_tutor": self.tutor_activo.id_tutor}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_asignacion_a_traves_de_iniciativa_action(self):
        """Verifica la asignación y consulta a través de /api/iniciativas/<id>/tutor/."""
        url_iniciativa = f"/api/iniciativas/{self.iniciativa_aprobada.id_iniciativa}/tutor/"
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")

        # Asignar mediante action de iniciativa
        res_patch = self.client.patch(
            url_iniciativa, {"id_tutor": self.tutor_activo.id_tutor}, format="json"
        )
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)

        # Consultar mediante GET
        res_get = self.client.get(url_iniciativa)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data["id_tutor"], self.tutor_activo.id_tutor)
        self.assertEqual(res_get.data["tutor_nombre"], "Profesor Carlos Tutor")


# ==============================================================================
# GENNOVA-80: Tests de Asignación y Gestión de Mentores en Proyectos
# ==============================================================================

class AsignarMentorProyectoTests(APITestCase):
    def setUp(self):
        from datetime import timedelta
        from django.utils import timezone
        from gestion_convocatorias.models import Convocatoria, Iniciativa
        from gestion_acompaniamiento.models import Mentor
        from .models import ProyectoMentor

        # 1. Configurar Roles
        self.rol_coordinador, _ = Rol.objects.get_or_create(
            nombre_rol="coordinador", defaults={"descripcion": "Coordinador"}
        )
        self.rol_estudiante, _ = Rol.objects.get_or_create(
            nombre_rol="estudiante", defaults={"descripcion": "Estudiante"}
        )
        self.rol_mentor, _ = Rol.objects.get_or_create(
            nombre_rol="mentor", defaults={"descripcion": "Mentor"}
        )

        # 2. Usuarios
        self.coordinador = Usuario.objects.create(
            nombre="Coordinador Carlos",
            correo="carlos.coord@ufps.edu.co",
            google_id="gid-coord-80",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.coordinador, rol=self.rol_coordinador, estado="activo")
        self.token_coordinador = generar_token(self.coordinador, "coordinador")

        self.estudiante = Usuario.objects.create(
            nombre="Estudiante Pedro",
            correo="pedro.est@ufps.edu.co",
            google_id="gid-est-80",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.estudiante, rol=self.rol_estudiante, estado="activo")
        self.token_estudiante = generar_token(self.estudiante, "estudiante")

        # Usuarios y perfiles de Mentores
        self.u_mentor1 = Usuario.objects.create(
            nombre="Dra. Elena Mentor",
            correo="elena.mentor@ufps.edu.co",
            google_id="gid-mentor-1",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.u_mentor1, rol=self.rol_mentor, estado="activo")
        self.mentor1 = Mentor.objects.create(
            usuario=self.u_mentor1,
            area_especializacion="Inteligencia Artificial",
            nivel_academico="doctorado",
            anios_experiencia=8,
            disponibilidad="10 horas/semana",
            estado="activo",
        )

        self.u_mentor2 = Usuario.objects.create(
            nombre="Ing. Roberto Mentor",
            correo="roberto.mentor@ufps.edu.co",
            google_id="gid-mentor-2",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.u_mentor2, rol=self.rol_mentor, estado="activo")
        self.mentor2 = Mentor.objects.create(
            usuario=self.u_mentor2,
            area_especializacion="Finanzas y Modelo de Negocio",
            nivel_academico="maestria",
            anios_experiencia=5,
            disponibilidad="5 horas/semana",
            estado="activo",
        )

        self.u_mentor_inactivo = Usuario.objects.create(
            nombre="Inactivo Mentor",
            correo="inactivo@ufps.edu.co",
            google_id="gid-mentor-inactivo",
            estado="inactivo",
        )
        self.mentor_inactivo = Mentor.objects.create(
            usuario=self.u_mentor_inactivo,
            area_especializacion="Marketing",
            estado="inactivo",
        )

        # 3. Convocatoria, Iniciativa y Proyecto
        now = timezone.now()
        conv = Convocatoria.objects.create(
            nombre="Convocatoria 2026-I",
            fecha_apertura=now - timedelta(days=2),
            fecha_cierre=now + timedelta(days=10),
            estado="abierta",
        )
        self.iniciativa = Iniciativa.objects.create(
            convocatoria=conv,
            usuario=self.estudiante,
            nombre="Plataforma de AgroTecnología",
            tipo="emprendimiento",
            origen_academico="asignatura",
            estado="aprobada",
        )
        # El signal o service crea el Proyecto al aprobarse la iniciativa
        self.proyecto = Proyecto.objects.get(iniciativa=self.iniciativa)

    def test_listar_mentores_disponibles(self):
        """El coordinador puede listar mentores activos; excluye inactivos."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.get("/api/proyectos/mentores/disponibles/")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids_mentores = [m["id_mentor"] for m in res.data]
        self.assertIn(self.mentor1.id_mentor, ids_mentores)
        self.assertIn(self.mentor2.id_mentor, ids_mentores)
        self.assertNotIn(self.mentor_inactivo.id_mentor, ids_mentores)

    def test_filtrar_mentores_disponibles_excluye_asignados(self):
        """Al filtrar con id_proyecto, excluye mentores ya asignados activamente a ese proyecto."""
        from .services import asignar_mentor_a_proyecto
        asignar_mentor_a_proyecto(self.proyecto.id_proyecto, self.mentor1.id_mentor)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.get(f"/api/proyectos/mentores/disponibles/?id_proyecto={self.proyecto.id_proyecto}")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids_mentores = [m["id_mentor"] for m in res.data]
        self.assertNotIn(self.mentor1.id_mentor, ids_mentores)
        self.assertIn(self.mentor2.id_mentor, ids_mentores)

    def test_coordinador_asigna_mentor_exitosamente(self):
        """El coordinador puede asignar un mentor a un proyecto (HTTP 201)."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        payload = {
            "id_proyecto": self.proyecto.id_proyecto,
            "id_mentor": self.mentor1.id_mentor,
        }
        res = self.client.post("/api/proyectos/asignar-mentor/", payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("asignacion", res.data)
        self.assertTrue(res.data["asignacion"]["activo"])
        self.assertEqual(res.data["asignacion"]["id_mentor"], self.mentor1.id_mentor)

    def test_asignar_mentor_ya_activo_retorna_400(self):
        """Si el mentor ya está activo en el proyecto, lanza error de validación (HTTP 400)."""
        from .services import asignar_mentor_a_proyecto
        asignar_mentor_a_proyecto(self.proyecto.id_proyecto, self.mentor1.id_mentor)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        payload = {
            "id_proyecto": self.proyecto.id_proyecto,
            "id_mentor": self.mentor1.id_mentor,
        }
        res = self.client.post("/api/proyectos/asignar-mentor/", payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", str(res.data))

    def test_desasignar_mentor_elimina_el_registro(self):
        """DELETE desasigna al mentor eliminando su registro de proyecto_mentor."""
        from .models import ProyectoMentor
        from .services import asignar_mentor_a_proyecto
        asignacion, _ = asignar_mentor_a_proyecto(self.proyecto.id_proyecto, self.mentor1.id_mentor)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.delete(f"/api/proyectos/{self.proyecto.id_proyecto}/mentores/{self.mentor1.id_mentor}/")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(ProyectoMentor.objects.filter(proyecto=self.proyecto, mentor=self.mentor1).exists())
        # La respuesta conserva el formato: id original y activo=False
        self.assertEqual(res.data["asignacion"]["id"], asignacion.pk)
        self.assertFalse(res.data["asignacion"]["activo"])

    def test_reasignar_mentor_quitado_crea_una_asignacion_nueva(self):
        """Tras quitar al mentor, volver a asignarlo crea un registro nuevo (201)."""
        from .models import ProyectoMentor
        from .services import asignar_mentor_a_proyecto, desasignar_mentor_de_proyecto
        asignar_mentor_a_proyecto(self.proyecto.id_proyecto, self.mentor1.id_mentor)
        desasignar_mentor_de_proyecto(self.proyecto.id_proyecto, self.mentor1.id_mentor)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        payload = {
            "id_proyecto": self.proyecto.id_proyecto,
            "id_mentor": self.mentor1.id_mentor,
        }
        res = self.client.post("/api/proyectos/asignar-mentor/", payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ProyectoMentor.objects.get(proyecto=self.proyecto, mentor=self.mentor1).activo)

    def test_reactivar_registro_inactivo_heredado(self):
        """Un registro inactivo de cuando la desasignación era soft delete se reactiva (200)."""
        from .models import ProyectoMentor
        rel = ProyectoMentor.objects.create(
            proyecto=self.proyecto, mentor=self.mentor1, fecha_asignacion="2026-01-15", activo=False
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        payload = {
            "id_proyecto": self.proyecto.id_proyecto,
            "id_mentor": self.mentor1.id_mentor,
        }
        res = self.client.post("/api/proyectos/asignar-mentor/", payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        rel.refresh_from_db()
        self.assertTrue(rel.activo)

    def test_desasignar_mentor_ya_inactivo_retorna_400(self):
        """Intentar desasignar un mentor que ya fue quitado retorna HTTP 400."""
        from .services import asignar_mentor_a_proyecto, desasignar_mentor_de_proyecto
        asignar_mentor_a_proyecto(self.proyecto.id_proyecto, self.mentor1.id_mentor)
        desasignar_mentor_de_proyecto(self.proyecto.id_proyecto, self.mentor1.id_mentor)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.patch(f"/api/proyectos/{self.proyecto.id_proyecto}/mentores/{self.mentor1.id_mentor}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_usuario_no_coordinador_es_rechazado_403(self):
        """Un usuario sin rol 'coordinador' (ej. estudiante) recibe HTTP 403 Forbidden."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")
        payload = {
            "id_proyecto": self.proyecto.id_proyecto,
            "id_mentor": self.mentor1.id_mentor,
        }
        res = self.client.post("/api/proyectos/asignar-mentor/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res_del = self.client.delete(f"/api/proyectos/{self.proyecto.id_proyecto}/mentores/{self.mentor1.id_mentor}/")
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

    def test_listado_de_iniciativas_resume_los_roles_del_proyecto(self):
        """El listado trae id_proyecto y qué roles tiene asignados, para avisar los que faltan."""
        from .services import asignar_mentor_a_proyecto

        def resumen():
            res = self.client.get("/api/iniciativas/")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            lista = res.data if isinstance(res.data, list) else res.data["results"]
            fila = next(i for i in lista if i["id_iniciativa"] == self.proyecto.iniciativa_id)
            return fila["proyecto"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        self.assertEqual(
            resumen(),
            {"id_proyecto": self.proyecto.id_proyecto, "tiene_tutor": False, "tiene_evaluador": False, "mentores_asignados": 0},
        )
        asignar_mentor_a_proyecto(self.proyecto.id_proyecto, self.mentor1.id_mentor)
        self.assertEqual(resumen()["mentores_asignados"], 1)

    def test_asignar_mentor_inexistente_retorna_400(self):
        """Validación de serializador y servicio ante IDs inexistentes."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        payload = {
            "id_proyecto": 99999,
            "id_mentor": self.mentor1.id_mentor,
        }
        res = self.client.post("/api/proyectos/asignar-mentor/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

