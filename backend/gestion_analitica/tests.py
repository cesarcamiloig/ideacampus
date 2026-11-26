from datetime import date, timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from gestion_acompaniamiento.models import Mentor, Tutor
from gestion_administrativa.jwt_utils import generar_token
from gestion_administrativa.models import PeriodoAcademico, Rol, Usuario, UsuarioRol
from gestion_convocatorias.models import Convocatoria, Iniciativa
from gestion_emprendimiento_2.models import (
    Actividad,
    EquipoEmprendedor,
    Estudiante,
    PlanTrabajo,
    Proyecto,
    ProyectoMentor,
)
from gestion_evaluacion.models import Evaluacion, RegistroMadurez, Rubrica, SubRubrica

URL_PROYECTOS = reverse("analitica_proyectos")
URL_METRICAS = reverse("analitica_metricas")
URL_FILTROS = reverse("analitica_filtros")


class DashboardAnaliticaTests(APITestCase):
    """HU-14: Dashboard de indicadores con filtros para Dirección del Programa."""

    @classmethod
    def setUpTestData(cls):
        cls.contador = 0
        cls.direccion = cls._usuario("Directora", "direccion_del_programa")
        cls.coordinador = cls._usuario("Coordinador", "coordinador")
        cls.evaluador = cls._usuario("Evaluador", "evaluador")

        cls.periodo_2025 = PeriodoAcademico.objects.create(
            id_periodo="2025-2", anio=2025, semestre="2", nombre="2025-II",
            fecha_inicio=date(2025, 8, 1), fecha_fin=date(2025, 12, 15),
        )
        cls.periodo_2026 = PeriodoAcademico.objects.create(
            id_periodo="2026-1", anio=2026, semestre="1", nombre="2026-I",
            fecha_inicio=date(2026, 2, 1), fecha_fin=date(2026, 6, 30), es_vigente=True,
        )
        ahora = timezone.now()
        cls.conv_2025 = Convocatoria.objects.create(
            nombre="Convocatoria 2025-II", fecha_apertura=ahora - timedelta(days=200),
            fecha_cierre=ahora - timedelta(days=150), estado="cerrada", periodo=cls.periodo_2025,
        )
        cls.conv_2026 = Convocatoria.objects.create(
            nombre="Convocatoria 2026-I", fecha_apertura=ahora - timedelta(days=10),
            fecha_cierre=ahora + timedelta(days=10), estado="abierta", periodo=cls.periodo_2026,
        )

        cls.usuario_tutor_a = cls._usuario("Tutor Ana", "tutor")
        cls.tutor_a = Tutor.objects.create(usuario=cls.usuario_tutor_a, area_conocimiento="Software")
        cls.usuario_tutor_b = cls._usuario("Tutor Beto", "tutor")
        cls.tutor_b = Tutor.objects.create(usuario=cls.usuario_tutor_b)
        cls.mentor = Mentor.objects.create(usuario=cls._usuario("Mentor Mario", "mentor"))

        # P1: emprendimiento 2026-I, activo, tutor A, equipo con 2 integrantes, nivel M3
        cls.lider_1, cls.p1 = cls._proyecto(
            "App Agro", cls.conv_2026, "emprendimiento", "semillero", "Agrotech", semestre=7
        )
        cls.integrante = cls._usuario("Integrante Iris", "estudiante")
        Estudiante.objects.create(
            usuario=cls.integrante, codigo="1150002", semestre=5,
            equipo=cls.lider_1.equipo_liderado,
        )
        cls.p1.tutor = cls.tutor_a
        cls.p1.save()
        ProyectoMentor.objects.create(proyecto=cls.p1, mentor=cls.mentor, fecha_asignacion=date.today())
        RegistroMadurez.objects.create(
            proyecto=cls.p1, nivel="M1", evaluador=cls.evaluador, criterio_cumplido="Formulado"
        )
        RegistroMadurez.objects.create(
            proyecto=cls.p1, nivel="M3", evaluador=cls.evaluador, criterio_cumplido="PoC"
        )

        # P2: innovación 2026-I, finalizado, tutor B, nivel M0 (sin registros)
        cls.lider_2, cls.p2 = cls._proyecto(
            "Sensor IoT", cls.conv_2026, "innovacion", "integrador", "IoT", semestre=9
        )
        cls.p2.tutor = cls.tutor_b
        cls.p2.estado = Proyecto.Estado.FINALIZADO
        cls.p2.save()

        # P3: emprendimiento 2025-II, pausado, sin tutor
        cls.lider_3, cls.p3 = cls._proyecto(
            "Tienda Verde", cls.conv_2025, "emprendimiento", "asignatura", "agrotech", semestre=7
        )
        cls.p3.estado = Proyecto.Estado.PAUSADO
        cls.p3.save()

        # Iniciativa no aprobada: no es proyecto y no debe aparecer
        Iniciativa.objects.create(
            convocatoria=cls.conv_2026, usuario=cls.lider_3.usuario, nombre="Pendiente",
            tipo="emprendimiento", origen_academico="asignatura", estado="pendiente",
        )

        # Evaluación, actividades de P1
        rubrica, _ = Rubrica.objects.get_or_create(
            tipo_iniciativa="emprendimiento", defaults={"nombre": "Rúbrica emprendimiento"}
        )
        cls.hito_1 = hito = SubRubrica.objects.get_or_create(
            rubrica=rubrica, numero_hito=1, defaults={"nombre": "Hito 1", "ponderacion": 100}
        )[0]
        Evaluacion.objects.create(
            proyecto=cls.p1, subrubrica=hito, evaluador=cls.evaluador, nota_final=Decimal("4.20")
        )
        plan = PlanTrabajo.objects.create(proyecto=cls.p1, hito=hito)
        Actividad.objects.create(
            plan_trabajo=plan, responsable=cls.lider_1.usuario, creado_por=cls.usuario_tutor_a,
            nombre="Encuesta", fecha_fin=date.today() + timedelta(days=5),
            estado=Actividad.Estado.COMPLETADA,
        )
        Actividad.objects.create(
            plan_trabajo=plan, responsable=cls.lider_1.usuario, creado_por=cls.usuario_tutor_a,
            nombre="Prototipo", fecha_fin=date.today() - timedelta(days=1),
        )

    @classmethod
    def _usuario(cls, nombre, rol):
        cls.contador += 1
        usuario = Usuario.objects.create(
            nombre=nombre, correo=f"u{cls.contador}@ufps.edu.co", google_id=f"gid-{cls.contador}"
        )
        rol_obj, _ = Rol.objects.get_or_create(nombre_rol=rol)
        UsuarioRol.objects.create(usuario=usuario, rol=rol_obj, estado="activo")
        return usuario

    @classmethod
    def _proyecto(cls, nombre, convocatoria, tipo, origen, sector, semestre):
        usuario = cls._usuario(f"Líder {nombre}", "estudiante")
        estudiante = Estudiante.objects.create(
            usuario=usuario, codigo=f"11500{cls.contador:02d}", semestre=semestre
        )
        iniciativa = Iniciativa.objects.create(
            convocatoria=convocatoria, usuario=usuario, nombre=nombre, tipo=tipo,
            origen_academico=origen, sector_tecnologico=sector, etapa_actual="Validación",
            estado="pendiente",
        )
        equipo = EquipoEmprendedor.objects.create(
            estudiante_lider=estudiante, nombre_equipo=f"Equipo {nombre}", iniciativa=iniciativa
        )
        estudiante.equipo = equipo
        estudiante.save()
        # Aprobar la iniciativa crea su proyecto (signal de gestion_emprendimiento_2)
        iniciativa.estado = "aprobada"
        iniciativa.save()
        estudiante.refresh_from_db()
        return estudiante, Proyecto.objects.get(iniciativa=iniciativa)

    def setUp(self):
        self.autenticar(self.direccion, "direccion_del_programa")

    def autenticar(self, usuario, rol):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, rol)}")

    def ids(self, params=None):
        respuesta = self.client.get(URL_PROYECTOS, params or {})
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK, respuesta.data)
        return {fila["id_proyecto"] for fila in respuesta.data["results"]}

    # ---- Acceso -----------------------------------------------------------

    def test_sin_token_es_rechazado(self):
        self.client.credentials()
        for url in (URL_PROYECTOS, URL_METRICAS, URL_FILTROS):
            self.assertIn(
                self.client.get(url).status_code,
                (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
            )

    def test_roles_distintos_a_direccion_no_acceden(self):
        for usuario, rol in (
            (self.coordinador, "coordinador"),
            (self.usuario_tutor_a, "tutor"),
            (self.lider_1.usuario, "estudiante"),
        ):
            self.autenticar(usuario, rol)
            for url in (URL_PROYECTOS, URL_METRICAS, URL_FILTROS):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)

    def test_solo_lectura(self):
        self.assertEqual(
            self.client.post(URL_PROYECTOS, {}).status_code, status.HTTP_405_METHOD_NOT_ALLOWED
        )

    # ---- Listado y filtros --------------------------------------------------

    def test_listado_sin_filtros_incluye_activos_e_historicos(self):
        respuesta = self.client.get(URL_PROYECTOS)
        self.assertEqual(respuesta.data["count"], 3)
        fila = next(f for f in respuesta.data["results"] if f["id_proyecto"] == self.p1.pk)
        self.assertEqual(fila["periodo"], {"id": "2026-1", "nombre": "2026-I"})
        self.assertEqual(fila["tutor"]["id"], self.tutor_a.pk)
        self.assertEqual(fila["integrantes"], 2)
        self.assertEqual(fila["nivel_madurez"], "M3")
        self.assertEqual(fila["vigencia"], "activo")

    def test_filtro_periodo_y_anio(self):
        self.assertEqual(self.ids({"periodo": "2026-1"}), {self.p1.pk, self.p2.pk})
        self.assertEqual(self.ids({"anio": "2025"}), {self.p3.pk})

    def test_filtro_cohorte(self):
        self.assertEqual(self.ids({"cohorte": self.conv_2025.pk}), {self.p3.pk})

    def test_filtro_estudiante_lider_o_integrante(self):
        self.assertEqual(self.ids({"estudiante": self.integrante.pk}), {self.p1.pk})
        self.assertEqual(self.ids({"estudiante": self.lider_2.usuario_id}), {self.p2.pk})

    def test_filtro_tutor_y_con_tutor(self):
        self.assertEqual(self.ids({"tutor": self.tutor_b.pk}), {self.p2.pk})
        self.assertEqual(self.ids({"con_tutor": "false"}), {self.p3.pk})

    def test_filtro_vigencia_y_estado(self):
        self.assertEqual(self.ids({"vigencia": "activos"}), {self.p1.pk})
        self.assertEqual(self.ids({"vigencia": "inactivos"}), {self.p2.pk, self.p3.pk})
        self.assertEqual(self.ids({"estado": "pausado,finalizado"}), {self.p2.pk, self.p3.pk})

    def test_filtro_tipo_emprendimiento_o_innovacion(self):
        self.assertEqual(self.ids({"tipo": "innovacion"}), {self.p2.pk})
        self.assertEqual(self.ids({"tipo": "emprendimiento"}), {self.p1.pk, self.p3.pk})

    def test_filtros_de_caracterizacion(self):
        # El sector se compara sin distinguir mayúsculas ("Agrotech" y "agrotech")
        self.assertEqual(self.ids({"sector_tecnologico": "AGROTECH"}), {self.p1.pk, self.p3.pk})
        self.assertEqual(self.ids({"origen_academico": "integrador"}), {self.p2.pk})
        self.assertEqual(self.ids({"semestre": "5"}), {self.p1.pk})
        self.assertEqual(self.ids({"nivel_madurez": "m3"}), {self.p1.pk})
        self.assertEqual(self.ids({"mentor": self.mentor.pk}), {self.p1.pk})

    def test_filtros_combinados(self):
        params = {"tipo": "emprendimiento", "vigencia": "inactivos", "periodo": "2025-2"}
        self.assertEqual(self.ids(params), {self.p3.pk})
        params = {"tipo": "emprendimiento", "periodo": "2026-1", "tutor": self.tutor_b.pk}
        self.assertEqual(self.ids(params), set())

    def test_filtros_aplicados_en_respuesta(self):
        respuesta = self.client.get(URL_PROYECTOS, {"tipo": "innovacion", "vigencia": "inactivos"})
        self.assertEqual(
            respuesta.data["filtros_aplicados"], {"tipo": ["innovacion"], "vigencia": "inactivos"}
        )

    def test_parametros_invalidos_responden_400(self):
        respuesta = self.client.get(
            URL_PROYECTOS,
            {"tipo": "otro", "tutor": "abc", "fecha_desde": "25-01-2026", "nivel_madurez": "M12"},
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        for campo in ("tipo", "tutor", "fecha_desde", "nivel_madurez"):
            self.assertIn(campo, respuesta.data)
        self.assertEqual(
            self.client.get(URL_PROYECTOS, {"ordering": "clave"}).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_ordenamiento_y_paginacion(self):
        respuesta = self.client.get(URL_PROYECTOS, {"ordering": "nombre", "page_size": 2})
        self.assertEqual(respuesta.data["count"], 3)
        self.assertEqual(
            [f["nombre_proyecto"] for f in respuesta.data["results"]], ["App Agro", "Sensor IoT"]
        )
        self.assertIsNotNone(respuesta.data["next"])

    # ---- Métricas -----------------------------------------------------------

    def test_metricas_generales(self):
        datos = self.client.get(URL_METRICAS).data
        resumen = datos["resumen"]
        self.assertEqual(resumen["total_proyectos"], 3)
        self.assertEqual(resumen["proyectos_activos"], 1)
        self.assertEqual(resumen["proyectos_inactivos"], 2)
        self.assertEqual(resumen["proyectos_con_tutor"], 2)
        self.assertEqual(resumen["estudiantes_vinculados"], 4)
        self.assertEqual(resumen["tutores_vinculados"], 2)
        self.assertEqual(resumen["mentores_vinculados"], 1)

        por_tipo = {f["valor"]: f["total"] for f in datos["por_tipo"]}
        self.assertEqual(por_tipo, {"emprendimiento": 2, "innovacion": 1})
        por_periodo = {f["valor"]: f["total"] for f in datos["por_periodo"]}
        self.assertEqual(por_periodo, {"2026-1": 2, "2025-2": 1})

        madurez = {f["nivel"]: f["total"] for f in datos["madurez"]["distribucion"]}
        self.assertEqual(madurez["M3"], 1)
        self.assertEqual(madurez["M0"], 2)
        self.assertEqual(datos["madurez"]["nivel_promedio"], 1.0)

        self.assertEqual(datos["evaluacion"]["nota_promedio"], 4.2)
        seguimiento = datos["seguimiento"]
        self.assertEqual(seguimiento["actividades_total"], 2)
        self.assertEqual(seguimiento["actividades_completadas"], 1)
        self.assertEqual(seguimiento["actividades_vencidas"], 1)
        self.assertEqual(seguimiento["tasa_cumplimiento_actividades"], 50.0)

    def test_metricas_respetan_filtros(self):
        datos = self.client.get(URL_METRICAS, {"tipo": "innovacion"}).data
        self.assertEqual(datos["filtros_aplicados"], {"tipo": ["innovacion"]})
        self.assertEqual(datos["resumen"]["total_proyectos"], 1)
        self.assertEqual(datos["resumen"]["proyectos_activos"], 0)
        self.assertEqual(datos["evaluacion"]["evaluaciones_registradas"], 0)
        self.assertIsNone(datos["evaluacion"]["nota_promedio"])
        self.assertEqual(datos["seguimiento"]["actividades_total"], 0)

    def test_metricas_sin_resultados(self):
        datos = self.client.get(URL_METRICAS, {"periodo": "1999-1"}).data
        self.assertEqual(datos["resumen"]["total_proyectos"], 0)
        self.assertEqual(datos["resumen"]["tasa_actividad"], 0.0)
        self.assertIsNone(datos["madurez"]["nivel_promedio"])

    # ---- Aprobación por hitos ------------------------------------------------

    def _preparar_aprobacion(self):
        """
        Rúbrica de emprendimiento con 2 hitos (P1 ya tiene el hito 1 con 4.20).
          P1: hito 2 promediado entre dos evaluadores 3.00 y 2.99 -> 2.995 -> 3.00: APROBADO
          P3: hito 1 = 4.50 y hito 2 = 2.50: NO (un hito < 3)
          P2 (innovación, 1 hito): sin calificar: NO (faltan hitos)
        """
        rubrica_e = self.hito_1.rubrica
        hito_2 = SubRubrica.objects.create(rubrica=rubrica_e, numero_hito=2, nombre="Hito 2", ponderacion=50)
        otro_evaluador = self._usuario("Evaluador Dos", "evaluador")
        Evaluacion.objects.create(proyecto=self.p1, subrubrica=hito_2, evaluador=self.evaluador, nota_final=Decimal("3.00"))
        Evaluacion.objects.create(proyecto=self.p1, subrubrica=hito_2, evaluador=otro_evaluador, nota_final=Decimal("2.99"))
        Evaluacion.objects.create(proyecto=self.p3, subrubrica=self.hito_1, evaluador=self.evaluador, nota_final=Decimal("4.50"))
        Evaluacion.objects.create(proyecto=self.p3, subrubrica=hito_2, evaluador=self.evaluador, nota_final=Decimal("2.50"))
        rubrica_i, _ = Rubrica.objects.get_or_create(tipo_iniciativa="innovacion", defaults={"nombre": "Innovación"})
        SubRubrica.objects.get_or_create(rubrica=rubrica_i, numero_hito=1, defaults={"nombre": "Hito 1", "ponderacion": 100})
        return hito_2

    def test_filtro_aprobado_hitos(self):
        self._preparar_aprobacion()
        self.assertEqual(self.ids({"aprobado_hitos": "true"}), {self.p1.pk})
        self.assertEqual(self.ids({"aprobado_hitos": "false"}), {self.p2.pk, self.p3.pk})
        # Combinable con los demás filtros
        self.assertEqual(self.ids({"aprobado_hitos": "true", "periodo": "2025-2"}), set())

    def test_no_basta_con_un_hito_aprobado(self):
        # Con solo el hito 1 de P1 calificado (4.20) y existiendo un hito 2, P1 no está aprobado
        SubRubrica.objects.create(rubrica=self.hito_1.rubrica, numero_hito=2, nombre="Hito 2", ponderacion=50)
        self.assertEqual(self.ids({"aprobado_hitos": "true"}), set())

    def test_evaluacion_sin_nota_no_cuenta_como_calificada(self):
        self._preparar_aprobacion()
        # P2 pasa a tener su único hito con una evaluación aún sin nota_final
        hito_innovacion = SubRubrica.objects.get(rubrica__tipo_iniciativa="innovacion", numero_hito=1)
        Evaluacion.objects.create(proyecto=self.p2, subrubrica=hito_innovacion, evaluador=self.evaluador)
        self.assertNotIn(self.p2.pk, self.ids({"aprobado_hitos": "true"}))

    def test_aprobado_hitos_en_listado_y_metricas(self):
        self._preparar_aprobacion()
        filas = {f["id_proyecto"]: f["aprobado_hitos"] for f in self.client.get(URL_PROYECTOS).data["results"]}
        self.assertEqual(filas, {self.p1.pk: True, self.p2.pk: False, self.p3.pk: False})
        resumen = self.client.get(URL_METRICAS).data["resumen"]
        self.assertEqual(resumen["proyectos_aprobados_hitos"], 1)
        self.assertEqual(resumen["tasa_aprobacion_hitos"], 33.33)
        self.assertEqual(
            self.client.get(URL_PROYECTOS, {"aprobado_hitos": "si"}).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # ---- Opciones de filtros --------------------------------------------------

    def test_opciones_de_filtros(self):
        datos = self.client.get(URL_FILTROS).data
        self.assertEqual({p["id"] for p in datos["periodos"]}, {"2025-2", "2026-1"})
        self.assertEqual(len(datos["cohortes"]), 2)
        self.assertEqual({t["id"] for t in datos["tutores"]}, {self.tutor_a.pk, self.tutor_b.pk})
        self.assertIn(self.integrante.pk, {e["id"] for e in datos["estudiantes"]})
        self.assertEqual(len(datos["sectores_tecnologicos"]), 2)  # Agrotech/agrotech cuentan como uno
        self.assertEqual({t["valor"] for t in datos["tipos"]}, {"emprendimiento", "innovacion"})
        self.assertEqual(len(datos["niveles_madurez"]), 10)
