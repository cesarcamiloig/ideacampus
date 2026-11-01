import shutil
import tempfile
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from gestion_administrativa.jwt_utils import generar_token
from gestion_administrativa.models import Rol, Usuario, UsuarioRol
from gestion_convocatorias.models import Convocatoria, Iniciativa
from gestion_emprendimiento_2.models import Actividad, EquipoEmprendedor, Estudiante, PlanTrabajo
from gestion_evaluacion.models import Rubrica, SubRubrica

from .models import DocumentoEvidencia, Evidencia

MEDIA_TEMPORAL = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA_TEMPORAL)
class EvidenciaBaseTests(APITestCase):
    """Datos comunes: un titular, un integrante de equipo, un estudiante ajeno y un tutor."""
    URL = "/api/evidencias/"

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA_TEMPORAL, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        rol_estudiante, _ = Rol.objects.get_or_create(nombre_rol="estudiante")
        rol_tutor, _ = Rol.objects.get_or_create(nombre_rol="tutor")

        def crear_usuario(nombre, rol):
            usuario = Usuario.objects.create(
                nombre=nombre, correo=f"{nombre.lower()}@ufps.edu.co", google_id=f"gid-ev-{nombre}"
            )
            UsuarioRol.objects.create(usuario=usuario, rol=rol)
            return usuario

        self.titular = crear_usuario("Titular", rol_estudiante)
        self.integrante = crear_usuario("Integrante", rol_estudiante)
        self.ajeno = crear_usuario("Ajeno", rol_estudiante)
        self.tutor = crear_usuario("Tutor", rol_tutor)

        ahora = timezone.now()
        convocatoria = Convocatoria.objects.create(
            nombre="Convocatoria", fecha_apertura=ahora - timedelta(days=1),
            fecha_cierre=ahora + timedelta(days=5), estado="abierta",
        )
        # Al quedar aprobadas, la señal crea el Proyecto de cada iniciativa
        self.iniciativa = Iniciativa.objects.create(
            convocatoria=convocatoria, usuario=self.titular, nombre="Iniciativa con equipo",
            tipo="emprendimiento", origen_academico="asignatura", estado="aprobada",
        )
        self.iniciativa_sin_equipo = Iniciativa.objects.create(
            convocatoria=convocatoria, usuario=self.titular, nombre="Iniciativa sin equipo",
            tipo="emprendimiento", origen_academico="asignatura", estado="aprobada",
        )

        # Equipo de la primera iniciativa: el integrante es líder y único miembro
        lider = Estudiante.objects.create(usuario=self.integrante)
        equipo = EquipoEmprendedor.objects.create(
            nombre_equipo="Equipo", estudiante_lider=lider, iniciativa=self.iniciativa
        )
        lider.equipo = equipo
        lider.save(update_fields=["equipo"])

        self.hito = SubRubrica.objects.create(
            rubrica=Rubrica.objects.get(tipo_iniciativa="emprendimiento"),
            numero_hito=1, nombre="Hito 1", ponderacion="100",
        )

    def subir(self, usuario, iniciativa, rol="estudiante"):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, rol)}")
        archivo = SimpleUploadedFile("avance.pdf", b"%PDF-1.4 avance", content_type="application/pdf")
        return self.client.post(self.URL, {
            "proyecto": iniciativa.proyecto.pk, "etapa": self.hito.pk, "titulo": "Avance",
            "tipo": "documento", "archivos": [archivo],
        }, format="multipart")


class PermisoSubirEvidenciaTests(EvidenciaBaseTests):
    def test_titular_de_iniciativa_aprobada_puede_subir_sin_equipo(self):
        res = self.subir(self.titular, self.iniciativa_sin_equipo)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

    def test_integrante_del_equipo_puede_subir_aunque_no_sea_titular(self):
        res = self.subir(self.integrante, self.iniciativa)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["usuario_nombre"], "Integrante")

    def test_estudiante_ajeno_no_puede_subir(self):
        res = self.subir(self.ajeno, self.iniciativa)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("proyecto", res.data)
        self.assertFalse(Evidencia.objects.exists())

    def test_integrante_no_puede_subir_a_un_proyecto_de_otro_equipo(self):
        res = self.subir(self.integrante, self.iniciativa_sin_equipo)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_titular_sin_iniciativa_aprobada_ni_equipo_no_puede_subir(self):
        # La iniciativa deja de estar aprobada (sin pasar por la señal) y el titular no está en un equipo
        Iniciativa.objects.filter(pk=self.iniciativa_sin_equipo.pk).update(estado="en_revision")
        res = self.subir(self.titular, self.iniciativa_sin_equipo)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rol_distinto_de_estudiante_recibe_403(self):
        res = self.subir(self.tutor, self.iniciativa, rol="tutor")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_mi_equipo_entrega_el_id_del_proyecto_para_subir_evidencias(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(self.integrante, 'estudiante')}")
        res = self.client.get("/api/equipos/mi-equipo/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["equipo"]["iniciativa"]["id_proyecto"], self.iniciativa.proyecto.pk)


class EvidenciasMiProyectoTests(EvidenciaBaseTests):
    URL_MI_PROYECTO = "/api/evidencias/mi-proyecto/"

    def setUp(self):
        super().setUp()
        # El integrante sube al proyecto de su equipo; el titular, al suyo sin equipo
        self.assertEqual(self.subir(self.integrante, self.iniciativa).status_code, 201)
        self.assertEqual(self.subir(self.titular, self.iniciativa_sin_equipo).status_code, 201)

    def consultar(self, usuario, rol="estudiante", **params):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, rol)}")
        return self.client.get(self.URL_MI_PROYECTO, params)

    def nombres_iniciativa(self, res):
        return sorted(e["iniciativa"] for e in res.data)

    def test_titular_ve_las_evidencias_de_sus_proyectos_incluidas_las_del_equipo(self):
        res = self.consultar(self.titular)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Ve la de su proyecto sin equipo y la que subió el integrante en su otro proyecto
        self.assertEqual(self.nombres_iniciativa(res), ["Iniciativa con equipo", "Iniciativa sin equipo"])

    def test_integrante_solo_ve_las_del_proyecto_de_su_equipo(self):
        res = self.consultar(self.integrante)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.nombres_iniciativa(res), ["Iniciativa con equipo"])

    def test_filtro_por_proyecto_y_estudiante_ajeno(self):
        res = self.consultar(self.titular, proyecto=self.iniciativa_sin_equipo.proyecto.pk)
        self.assertEqual(self.nombres_iniciativa(res), ["Iniciativa sin equipo"])
        self.assertEqual(self.consultar(self.titular, proyecto="abc").data, [])
        self.assertEqual(self.consultar(self.ajeno).data, [])

    def test_tutor_asignado_ve_las_evidencias_del_proyecto_que_retroalimenta(self):
        from gestion_acompaniamiento.models import Tutor

        perfil_tutor = Tutor.objects.create(usuario=self.tutor)
        proyecto = self.iniciativa.proyecto
        proyecto.tutor = perfil_tutor
        proyecto.save(update_fields=["tutor"])

        res = self.consultar(self.tutor, rol="tutor")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Solo el proyecto que tiene asignado, no el otro proyecto del titular
        self.assertEqual(self.nombres_iniciativa(res), ["Iniciativa con equipo"])

    def test_tutor_sin_proyectos_asignados_no_ve_evidencias(self):
        res = self.consultar(self.tutor, rol="tutor")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

    def test_otros_roles_reciben_403_y_sin_token_se_rechaza(self):
        rol_mentor, _ = Rol.objects.get_or_create(nombre_rol="mentor")
        mentor = Usuario.objects.create(nombre="Mentor", correo="mentor@ufps.edu.co", google_id="gid-ev-mentor")
        UsuarioRol.objects.create(usuario=mentor, rol=rol_mentor)
        self.assertEqual(self.consultar(mentor, rol="mentor").status_code, status.HTTP_403_FORBIDDEN)

        self.client.credentials()
        self.assertIn(
            self.client.get(self.URL_MI_PROYECTO).status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )


class DescargaDocumentoEvidenciaTests(EvidenciaBaseTests):
    """El archivo se guarda en la base de datos: lo descargan todos los que tienen acceso al proyecto."""

    def setUp(self):
        super().setUp()
        # El titular sube al proyecto que comparte con el equipo del integrante
        res = self.subir(self.titular, self.iniciativa)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.documento = DocumentoEvidencia.objects.get()

    def descargar(self, usuario, rol="estudiante", documento=None):
        documento = documento or self.documento
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, rol)}")
        return self.client.get(f"{self.URL}documentos/{documento.pk}/descargar/")

    def test_el_contenido_queda_en_la_base_de_datos_y_no_en_disco(self):
        self.assertEqual(bytes(self.documento.contenido), b"%PDF-1.4 avance")
        self.assertFalse(self.documento.archivo)

    def test_la_respuesta_entrega_la_url_de_descarga_de_la_api(self):
        res = self.subir(self.titular, self.iniciativa)
        url = res.data["documentos"][0]["archivo"]
        self.assertTrue(url.endswith(f"/api/evidencias/documentos/{res.data['documentos'][0]['id']}/descargar/"))

    def test_otro_integrante_del_equipo_descarga_el_archivo_de_quien_lo_subio(self):
        res = self.descargar(self.integrante)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.content, b"%PDF-1.4 avance")
        self.assertEqual(res["Content-Type"], "application/pdf")
        self.assertIn('filename="avance.pdf"', res["Content-Disposition"])

    def test_estudiante_ajeno_al_proyecto_recibe_403(self):
        self.assertEqual(self.descargar(self.ajeno).status_code, status.HTTP_403_FORBIDDEN)

    def test_enlace_o_documento_inexistente_da_404(self):
        enlace = DocumentoEvidencia.objects.create(
            evidencia=self.documento.evidencia, enlace="https://example.com"
        )
        self.assertEqual(self.descargar(self.titular, documento=enlace).status_code, status.HTTP_404_NOT_FOUND)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(self.titular, 'estudiante')}")
        self.assertEqual(
            self.client.get(f"{self.URL}documentos/999999/descargar/").status_code, status.HTTP_404_NOT_FOUND
        )

    def test_adjunto_antiguo_cuyo_archivo_no_esta_en_disco_da_404(self):
        antiguo = DocumentoEvidencia.objects.create(
            evidencia=self.documento.evidencia, archivo="evidencias/no-existe.pptx",
            nombre_original="no-existe.pptx",
        )
        res = self.descargar(self.titular, documento=antiguo)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("volver a cargarse", res.data["error"])


class EquipoConMiembroMixin:
    """Agrega al equipo un miembro que no es el líder (en los datos base, el integrante es el líder)."""

    def agregar_miembro(self):
        rol_estudiante = Rol.objects.get(nombre_rol="estudiante")
        self.miembro = Usuario.objects.create(
            nombre="Miembro", correo="miembro@ufps.edu.co", google_id="gid-ev-miembro")
        UsuarioRol.objects.create(usuario=self.miembro, rol=rol_estudiante)
        Estudiante.objects.create(usuario=self.miembro, equipo=self.iniciativa.equipo)

    def crear_otro_equipo(self):
        """El estudiante ajeno pasa a ser líder de un equipo en el otro proyecto."""
        lider = Estudiante.objects.create(usuario=self.ajeno)
        equipo = EquipoEmprendedor.objects.create(
            nombre_equipo="Otro equipo", estudiante_lider=lider, iniciativa=self.iniciativa_sin_equipo)
        lider.equipo = equipo
        lider.save(update_fields=["equipo"])
        return self.iniciativa_sin_equipo.proyecto


class EliminarEvidenciaTests(EquipoConMiembroMixin, EvidenciaBaseTests):
    """El líder elimina todas las evidencias del proyecto; los demás, solo las que subieron."""

    def setUp(self):
        super().setUp()
        self.agregar_miembro()
        # La sube el titular, que no es el líder del equipo
        res = self.subir(self.titular, self.iniciativa)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.evidencia_id = res.data["id"]

    def eliminar(self, usuario, rol="estudiante", evidencia_id=None):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, rol)}")
        return self.client.delete(f"{self.URL}{evidencia_id or self.evidencia_id}/")

    def test_lider_elimina_la_evidencia_aunque_la_haya_subido_otro(self):
        res = self.eliminar(self.integrante)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Evidencia.objects.filter(pk=self.evidencia_id).exists())
        self.assertFalse(DocumentoEvidencia.objects.filter(evidencia_id=self.evidencia_id).exists())

    def test_quien_la_subio_puede_eliminarla_aunque_no_sea_lider(self):
        self.assertEqual(self.eliminar(self.titular).status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Evidencia.objects.filter(pk=self.evidencia_id).exists())

    def test_miembro_no_elimina_la_evidencia_de_otro(self):
        self.assertEqual(self.eliminar(self.miembro).status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Evidencia.objects.filter(pk=self.evidencia_id).exists())

    def test_estudiante_ajeno_y_otros_roles_no_eliminan(self):
        self.assertEqual(self.eliminar(self.ajeno).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.eliminar(self.tutor, rol="tutor").status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Evidencia.objects.filter(pk=self.evidencia_id).exists())

    def test_evidencia_inexistente_da_404(self):
        self.assertEqual(self.eliminar(self.integrante, evidencia_id=999999).status_code, status.HTTP_404_NOT_FOUND)


class EditarEvidenciaTests(EquipoConMiembroMixin, EvidenciaBaseTests):
    def setUp(self):
        super().setUp()
        self.agregar_miembro()
        res = self.subir(self.miembro, self.iniciativa)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.evidencia_id = res.data["id"]

    def editar(self, usuario, datos, rol="estudiante"):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, rol)}")
        return self.client.patch(f"{self.URL}{self.evidencia_id}/", datos, format="multipart")

    def test_quien_la_subio_la_edita(self):
        res = self.editar(self.miembro, {"titulo": "Nuevo título"})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["titulo"], "Nuevo título")
        self.assertEqual(len(res.data["documentos"]), 1)

    def test_lider_edita_la_de_otro_y_reemplaza_los_adjuntos(self):
        res = self.editar(self.integrante, {"enlaces": ["https://example.com/demo"]})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([d["enlace"] for d in res.data["documentos"]], ["https://example.com/demo"])

    def test_otro_integrante_no_edita_la_de_otro(self):
        self.assertEqual(self.editar(self.titular, {"titulo": "X"}).status_code, status.HTTP_403_FORBIDDEN)


class PlanTrabajoTests(EquipoConMiembroMixin, EvidenciaBaseTests):
    """Un plan de trabajo por hito del proyecto; solo el líder lo gestiona."""
    URL_PLANES = "/api/plan-trabajo/"

    def setUp(self):
        super().setUp()
        self.agregar_miembro()
        self.proyecto = self.iniciativa.proyecto

    def crear_plan(self, usuario, **cambios):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, 'estudiante')}")
        datos = {"proyecto": self.proyecto.pk, "hito": self.hito.pk, "titulo": "Plan hito 1", **cambios}
        return self.client.post(self.URL_PLANES, datos, format="json")

    def test_lider_crea_el_plan_pendiente(self):
        res = self.crear_plan(self.integrante)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["estado"], "pendiente")
        self.assertEqual(res.data["total_actividades"], 0)

    def test_quien_no_es_lider_no_crea_planes(self):
        self.assertEqual(self.crear_plan(self.miembro).status_code, status.HTTP_403_FORBIDDEN)

    def test_lider_de_otro_equipo_no_crea_planes_en_un_proyecto_ajeno(self):
        proyecto_propio = self.crear_otro_equipo()
        # En el proyecto de otro equipo: 403 y no se crea nada
        self.assertEqual(self.crear_plan(self.ajeno).status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(PlanTrabajo.objects.filter(proyecto=self.proyecto).exists())
        # En su propio proyecto sí puede
        res = self.crear_plan(self.ajeno, proyecto=proyecto_propio.pk)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

    def test_lider_de_otro_equipo_no_edita_ni_elimina_planes_ajenos(self):
        plan_id = self.crear_plan(self.integrante).data["id_plan_trabajo"]
        self.crear_otro_equipo()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(self.ajeno, 'estudiante')}")
        # Ni siquiera lo ve: no es de sus proyectos
        self.assertEqual(self.client.patch(f"{self.URL_PLANES}{plan_id}/", {"estado": "finalizado"},
                                           format="json").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(f"{self.URL_PLANES}{plan_id}/").status_code,
                         status.HTTP_404_NOT_FOUND)
        self.assertEqual(PlanTrabajo.objects.get(pk=plan_id).estado, "pendiente")

    def test_un_solo_plan_por_hito_del_proyecto(self):
        self.assertEqual(self.crear_plan(self.integrante).status_code, status.HTTP_201_CREATED)
        res = self.crear_plan(self.integrante)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("hito", res.data)

    def test_otro_hito_del_proyecto_tiene_su_propio_plan(self):
        hito_2 = SubRubrica.objects.create(
            rubrica=self.hito.rubrica, numero_hito=2, nombre="Hito 2", ponderacion="0")
        self.assertEqual(self.crear_plan(self.integrante).status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.crear_plan(self.integrante, hito=hito_2.pk).status_code, status.HTTP_201_CREATED)
        self.assertEqual(PlanTrabajo.objects.filter(proyecto=self.proyecto).count(), 2)

    def test_hito_inexistente_o_de_otra_rubrica_da_400(self):
        self.assertIn("hito", self.crear_plan(self.integrante, hito=999999).data)
        rubrica_otra, _ = Rubrica.objects.get_or_create(
            tipo_iniciativa="innovacion", defaults={"nombre": "Innovación"})
        hito_otro = SubRubrica.objects.create(
            rubrica=rubrica_otra, numero_hito=1, nombre="Hito innovación", ponderacion="100")
        res = self.crear_plan(self.integrante, hito=hito_otro.pk)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("hito", res.data)


class ActividadTests(EquipoConMiembroMixin, EvidenciaBaseTests):
    """Solo el líder crea actividades en un plan; la evidencia del responsable la completa."""
    URL_ACTIVIDADES = "/api/actividad/"

    def setUp(self):
        super().setUp()
        self.agregar_miembro()
        self.proyecto = self.iniciativa.proyecto
        self.plan = PlanTrabajo.objects.create(proyecto=self.proyecto, hito=self.hito)

    def crear_actividad(self, usuario, **cambios):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, 'estudiante')}")
        datos = {"plan_trabajo": self.plan.pk, "responsable": self.miembro.pk,
                 "nombre": "Prototipo", "fecha_fin": "2026-12-01", **cambios}
        return self.client.post(self.URL_ACTIVIDADES, datos, format="json")

    def subir_de_actividad(self, usuario, actividad_id):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, 'estudiante')}")
        archivo = SimpleUploadedFile("avance.pdf", b"%PDF-1.4 avance", content_type="application/pdf")
        return self.client.post(self.URL, {
            "proyecto": self.proyecto.pk, "actividad": actividad_id, "titulo": "Avance",
            "tipo": "documento", "archivos": [archivo],
        }, format="multipart")

    def test_lider_crea_la_actividad_pendiente(self):
        res = self.crear_actividad(self.integrante)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["estado"], "pendiente")
        self.assertEqual(res.data["creado_por"], self.integrante.pk)
        self.assertEqual((res.data["proyecto"], res.data["hito"]), (self.proyecto.pk, self.hito.pk))

    def test_el_estado_no_se_puede_enviar(self):
        res = self.crear_actividad(self.integrante, estado="completada")
        self.assertEqual(res.data["estado"], "pendiente")

    def test_quien_no_es_lider_no_crea_actividades(self):
        self.assertEqual(self.crear_actividad(self.miembro).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.crear_actividad(self.titular).status_code, status.HTTP_403_FORBIDDEN)

    def test_lider_de_otro_equipo_no_crea_actividades_en_un_plan_ajeno(self):
        self.crear_otro_equipo()
        # Manda su propio usuario como responsable y el plan de otro proyecto
        res = self.crear_actividad(self.ajeno, responsable=self.ajeno.pk)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Actividad.objects.exists())

    def test_responsable_fuera_del_equipo_da_400(self):
        res = self.crear_actividad(self.integrante, responsable=self.ajeno.pk)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("responsable", res.data)

    def test_plan_de_trabajo_inexistente_da_400(self):
        res = self.crear_actividad(self.integrante, plan_trabajo=999999)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plan_trabajo", res.data)

    def test_evidencia_del_responsable_completa_la_actividad(self):
        actividad_id = self.crear_actividad(self.integrante).data["id"]
        res = self.subir_de_actividad(self.miembro, actividad_id)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["etapa"], self.hito.pk)
        actividad = Actividad.objects.get(pk=actividad_id)
        self.assertEqual(actividad.estado, "completada")
        self.assertIsNotNone(actividad.fecha_completada)

        # Si se elimina su única evidencia, vuelve a quedar pendiente
        self.client.delete(f"{self.URL}{res.data['id']}/")
        actividad.refresh_from_db()
        self.assertEqual(actividad.estado, "pendiente")
        self.assertIsNone(actividad.fecha_completada)

    def test_solo_el_responsable_sube_la_evidencia_de_la_actividad(self):
        actividad_id = self.crear_actividad(self.integrante).data["id"]
        res = self.subir_de_actividad(self.integrante, actividad_id)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("actividad", res.data)
        self.assertEqual(Actividad.objects.get(pk=actividad_id).estado, "pendiente")
