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
    PlanTrabajo,
    HitoPlanTrabajo,
    ActividadPlanTrabajo,
    EntregableActividad,
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
        self.assertEqual(res_get.data["tutor_nombre"], "Profesor Carlos Tutor")


class PlanTrabajoEntregablesTests(APITestCase):
    """
    HU-20: Pruebas backend para la Gestión del Plan de Trabajo y Entregables (GENNOVA-89).
    Valida:
    - Definición y consulta del plan de trabajo por estudiante o equipo emprendedor.
    - Creación y actualización de hitos clave.
    - Definición de actividades con responsables, fechas y validación de integrantes.
    - Control de entregables asociados a actividades y retroalimentación de tutores.
    - Reglas de negocio (fechas válidas, permisos de acceso, avance porcentual).
    """

    def setUp(self):
        # Roles
        self.rol_estudiante, _ = Rol.objects.get_or_create(nombre_rol="estudiante")
        self.rol_coordinador, _ = Rol.objects.get_or_create(nombre_rol="coordinador")
        self.rol_tutor, _ = Rol.objects.get_or_create(nombre_rol="tutor")

        # Usuarios
        self.lider = Usuario.objects.create(
            nombre="Ana Líder", correo="ana@ufps.edu.co", google_id="ana-1", estado="activo"
        )
        UsuarioRol.objects.create(usuario=self.lider, rol=self.rol_estudiante, estado="activo")
        self.token_lider = generar_token(self.lider, "estudiante")
        self.estudiante_lider = Estudiante.objects.create(usuario=self.lider, codigo="1151001", semestre=8)

        self.miembro = Usuario.objects.create(
            nombre="Luis Miembro", correo="luis@ufps.edu.co", google_id="luis-1", estado="activo"
        )
        UsuarioRol.objects.create(usuario=self.miembro, rol=self.rol_estudiante, estado="activo")
        self.token_miembro = generar_token(self.miembro, "estudiante")
        self.estudiante_miembro = Estudiante.objects.create(usuario=self.miembro, codigo="1151002", semestre=7)

        self.ajeno = Usuario.objects.create(
            nombre="Estudiante Ajeno", correo="ajeno@ufps.edu.co", google_id="ajeno-1", estado="activo"
        )
        UsuarioRol.objects.create(usuario=self.ajeno, rol=self.rol_estudiante, estado="activo")
        self.token_ajeno = generar_token(self.ajeno, "estudiante")
        self.estudiante_ajeno = Estudiante.objects.create(usuario=self.ajeno, codigo="1151003", semestre=6)

        self.coordinador = Usuario.objects.create(
            nombre="Coordinadora Claudia", correo="coord@ufps.edu.co", google_id="coord-1", estado="activo"
        )
        UsuarioRol.objects.create(usuario=self.coordinador, rol=self.rol_coordinador, estado="activo")
        self.token_coordinador = generar_token(self.coordinador, "coordinador")

        self.tutor_user = Usuario.objects.create(
            nombre="Tutor Roberto", correo="tutor_rob@ufps.edu.co", google_id="tutor-rob-1", estado="activo"
        )
        UsuarioRol.objects.create(usuario=self.tutor_user, rol=self.rol_tutor, estado="activo")
        self.token_tutor = generar_token(self.tutor_user, "tutor")
        self.tutor = Tutor.objects.create(usuario=self.tutor_user, area_conocimiento="DevOps", estado="activo")

        # Convocatoria, Iniciativa y Equipo Emprendedor
        now = timezone.now()
        self.conv = Convocatoria.objects.create(
            nombre="Convocatoria 2026-I",
            fecha_apertura=now - timedelta(days=5),
            fecha_cierre=now + timedelta(days=20),
            estado="abierta",
        )
        self.iniciativa = Iniciativa.objects.create(
            convocatoria=self.conv,
            usuario=self.lider,
            nombre="Sistema Solar IoT",
            tipo="innovacion",
            origen_academico="asignatura",
            estado="aprobada",
        )
        self.equipo = EquipoEmprendedor.objects.create(
            estudiante_lider=self.estudiante_lider,
            nombre_equipo="Equipo Solar Tech",
            iniciativa=self.iniciativa,
        )
        self.estudiante_lider.equipo = self.equipo
        self.estudiante_lider.save(update_fields=["equipo"])
        self.estudiante_miembro.equipo = self.equipo
        self.estudiante_miembro.save(update_fields=["equipo"])

        self.proyecto = Proyecto.objects.get(iniciativa=self.iniciativa)
        self.proyecto.tutor = self.tutor
        self.proyecto.save(update_fields=["tutor"])

    def test_estudiante_crea_y_consulta_plan_trabajo(self):
        """Estudiante líder inicializa y consulta el plan de trabajo de su iniciativa."""
        url = f"/api/iniciativas/{self.iniciativa.id_iniciativa}/plan-trabajo/"
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")

        # GET: autocrea el plan inicial si no existía
        res_get = self.client.get(url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data["id_iniciativa"], self.iniciativa.id_iniciativa)
        self.assertEqual(res_get.data["iniciativa_nombre"], "Sistema Solar IoT")
        self.assertEqual(res_get.data["equipo_nombre"], "Equipo Solar Tech")
        id_plan = res_get.data["id_plan_trabajo"]

        # POST: actualiza metadatos del plan
        payload = {
            "titulo": "Plan de Ejecución Fase 1",
            "descripcion": "Desarrollo del prototipo funcional y pruebas de campo",
            "fecha_inicio": "2026-03-01",
            "fecha_fin": "2026-08-30",
            "estado": "en_progreso",
        }
        res_post = self.client.post(url, payload, format="json")
        self.assertEqual(res_post.status_code, status.HTTP_200_OK)
        self.assertEqual(res_post.data["titulo"], "Plan de Ejecución Fase 1")
        self.assertEqual(res_post.data["estado"], "en_progreso")

        # Consulta a través del proyecto
        url_proy = f"/api/proyectos/{self.proyecto.id_proyecto}/plan-trabajo/"
        res_proy = self.client.get(url_proy)
        self.assertEqual(res_proy.status_code, status.HTTP_200_OK)
        self.assertEqual(res_proy.data["id_plan_trabajo"], id_plan)

    def test_estudiante_define_hitos_en_plan_trabajo(self):
        """Estudiante define hitos y los marca como completados."""
        plan = PlanTrabajo.objects.create(iniciativa=self.iniciativa, titulo="Plan Base")
        url_hitos = f"/api/planes-trabajo/{plan.id_plan_trabajo}/hitos/"
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")

        # Crear hito
        payload_hito = {
            "nombre": "Hito 1: Prototipo Electrónico",
            "descripcion": "Diseño de PCB y sensores conectados",
            "fecha_limite": "2026-04-15",
            "orden": 1,
        }
        res_crear = self.client.post(url_hitos, payload_hito, format="json")
        self.assertEqual(res_crear.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_crear.data["nombre"], "Hito 1: Prototipo Electrónico")
        self.assertFalse(res_crear.data["completado"])
        id_hito = res_crear.data["id_hito"]

        # Marcar hito completado
        url_detalle_hito = f"/api/hitos/{id_hito}/"
        res_patch = self.client.patch(url_detalle_hito, {"completado": True}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertTrue(res_patch.data["completado"])

    def test_estudiante_define_actividad_con_responsable_y_fechas(self):
        """Estudiante crea actividad con responsable del equipo y recibe alerta automática."""
        plan = PlanTrabajo.objects.create(iniciativa=self.iniciativa, titulo="Plan Base")
        hito = HitoPlanTrabajo.objects.create(plan_trabajo=plan, nombre="Hito A", orden=1)
        url_actividades = f"/api/planes-trabajo/{plan.id_plan_trabajo}/actividades/"

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        payload_actividad = {
            "nombre": "Adquisición de Sensores y Placas",
            "descripcion": "Cotización y compra de componentes en Cúcuta",
            "id_hito": hito.id_hito,
            "id_responsable": self.estudiante_miembro.id_estudiante,
            "fecha_inicio": "2026-03-10",
            "fecha_fin": "2026-03-25",
            "prioridad": "alta",
            "estado": "en_progreso",
        }
        res = self.client.post(url_actividades, payload_actividad, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["responsable_nombre"], "Luis Miembro")
        self.assertEqual(res.data["prioridad"], "alta")
        id_actividad = res.data["id_actividad"]

        # Verificar alerta automática emitida al responsable (HU-12)
        from gestion_convocatorias.models import AlertaRol
        alerta = AlertaRol.objects.filter(usuario=self.miembro, titulo__icontains="Nueva Actividad Asignada").first()
        self.assertIsNotNone(alerta)
        self.assertIn("Adquisición de Sensores", alerta.mensaje)

        # Modificar estado de actividad a completada
        url_det = f"/api/actividades/{id_actividad}/"
        res_comp = self.client.patch(url_det, {"estado": "completada"}, format="json")
        self.assertEqual(res_comp.status_code, status.HTTP_200_OK)
        self.assertEqual(res_comp.data["estado"], "completada")

    def test_validacion_fechas_actividad_fecha_fin_anterior_a_inicio(self):
        """Rechaza actividades con fecha de fin anterior a la fecha de inicio."""
        plan = PlanTrabajo.objects.create(iniciativa=self.iniciativa, titulo="Plan Base")
        url_actividades = f"/api/planes-trabajo/{plan.id_plan_trabajo}/actividades/"

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        payload_invalido = {
            "nombre": "Actividad con fechas inconsistentes",
            "fecha_inicio": "2026-05-20",
            "fecha_fin": "2026-05-10",  # Anterior a fecha_inicio
        }
        res = self.client.post(url_actividades, payload_invalido, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fecha_fin", res.data)

    def test_validacion_responsable_debe_pertenecer_al_equipo(self):
        """Rechaza asignar como responsable a un estudiante que no pertenece al equipo."""
        plan = PlanTrabajo.objects.create(iniciativa=self.iniciativa, titulo="Plan Base")
        url_actividades = f"/api/planes-trabajo/{plan.id_plan_trabajo}/actividades/"

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        payload = {
            "nombre": "Actividad asignada a estudiante ajeno",
            "id_responsable": self.estudiante_ajeno.id_estudiante,
        }
        res = self.client.post(url_actividades, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("integrante activo del equipo emprendedor", res.data["error"])

    def test_estudiante_define_entregable_asociado_a_actividad(self):
        """Estudiante crea entregable para una actividad y lo marca como entregado."""
        plan = PlanTrabajo.objects.create(iniciativa=self.iniciativa, titulo="Plan Base")
        actividad = ActividadPlanTrabajo.objects.create(plan_trabajo=plan, nombre="Desarrollo de Firmware")
        url_entregables = f"/api/actividades/{actividad.id_actividad}/entregables/"

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        payload_entregable = {
            "nombre": "Repositorio y Código Fuente v1.0",
            "descripcion": "Commit inicial con lectura de sensores",
            "fecha_limite": "2026-04-30",
            "tipo": "software",
            "enlace": "https://github.com/ufps/solar-firmware",
        }
        res = self.client.post(url_entregables, payload_entregable, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["nombre"], "Repositorio y Código Fuente v1.0")
        id_entregable = res.data["id_entregable"]

        # Marcar entregado
        url_det_ent = f"/api/entregables/{id_entregable}/"
        res_entrega = self.client.patch(url_det_ent, {"estado": "entregado"}, format="json")
        self.assertEqual(res_entrega.status_code, status.HTTP_200_OK)
        self.assertEqual(res_entrega.data["estado"], "entregado")
        self.assertIsNotNone(res_entrega.data["fecha_entrega"])

    def test_tutor_o_coordinador_consulta_y_retroalimenta_entregable(self):
        """Tutor asignado consulta el plan de trabajo y añade retroalimentación a un entregable."""
        plan = PlanTrabajo.objects.create(iniciativa=self.iniciativa, titulo="Plan Base")
        actividad = ActividadPlanTrabajo.objects.create(plan_trabajo=plan, nombre="Diseño de Arquitectura")
        entregable = EntregableActividad.objects.create(
            actividad=actividad,
            plan_trabajo=plan,
            nombre="Diagrama C4 y Especificación",
            estado="entregado",
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_tutor}")

        # Tutor consulta plan
        url_plan = f"/api/iniciativas/{self.iniciativa.id_iniciativa}/plan-trabajo/"
        res_get = self.client.get(url_plan)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)

        # Tutor retroalimenta y aprueba entregable
        url_entregable = f"/api/entregables/{entregable.id_entregable}/"
        res_patch = self.client.patch(
            url_entregable,
            {
                "observaciones": "Excelente definición de componentes de telemetría. Aprobado para implementación.",
                "estado": "aprobado",
            },
            format="json",
        )
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data["estado"], "aprobado")
        self.assertIn("Excelente definición", res_patch.data["observaciones"])

    def test_usuario_no_autorizado_es_rechazado(self):
        """Estudiante no relacionado con la iniciativa no puede consultar ni modificar el plan."""
        plan = PlanTrabajo.objects.create(iniciativa=self.iniciativa, titulo="Plan Privado")
        url = f"/api/iniciativas/{self.iniciativa.id_iniciativa}/plan-trabajo/"

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_ajeno}")
        res_get = self.client.get(url)
        self.assertEqual(res_get.status_code, status.HTTP_403_FORBIDDEN)

        res_post = self.client.post(url, {"titulo": "Plan Ilegítimo"}, format="json")
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_calculo_porcentaje_avance_y_metricas_en_plan(self):
        """Verifica el cálculo de avance porcentual según actividades completadas."""
        plan = PlanTrabajo.objects.create(iniciativa=self.iniciativa, titulo="Plan Métricas")
        ActividadPlanTrabajo.objects.create(plan_trabajo=plan, nombre="Act 1", estado="completada")
        ActividadPlanTrabajo.objects.create(plan_trabajo=plan, nombre="Act 2", estado="completada")
        ActividadPlanTrabajo.objects.create(plan_trabajo=plan, nombre="Act 3", estado="en_progreso")
        ActividadPlanTrabajo.objects.create(plan_trabajo=plan, nombre="Act 4", estado="pendiente")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_lider}")
        url = f"/api/iniciativas/{self.iniciativa.id_iniciativa}/plan-trabajo/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_actividades"], 4)
        self.assertEqual(res.data["actividades_completadas"], 2)
        self.assertEqual(res.data["porcentaje_avance"], 50.0)


