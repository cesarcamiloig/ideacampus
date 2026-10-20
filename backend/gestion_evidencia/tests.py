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
from gestion_emprendimiento_2.models import EquipoEmprendedor, Estudiante
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


class EliminarEvidenciaTests(EvidenciaBaseTests):
    """Solo el líder del equipo del proyecto elimina evidencias (en los datos base, el integrante es el líder)."""

    def setUp(self):
        super().setUp()
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

    def test_quien_no_es_lider_recibe_403_aunque_la_haya_subido(self):
        res = self.eliminar(self.titular)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Evidencia.objects.filter(pk=self.evidencia_id).exists())

    def test_estudiante_ajeno_y_otros_roles_no_eliminan(self):
        self.assertEqual(self.eliminar(self.ajeno).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.eliminar(self.tutor, rol="tutor").status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Evidencia.objects.filter(pk=self.evidencia_id).exists())

    def test_proyecto_sin_equipo_no_tiene_lider_que_elimine(self):
        res = self.subir(self.titular, self.iniciativa_sin_equipo)
        self.assertEqual(self.eliminar(self.titular, evidencia_id=res.data["id"]).status_code, status.HTTP_403_FORBIDDEN)

    def test_evidencia_inexistente_da_404(self):
        self.assertEqual(self.eliminar(self.integrante, evidencia_id=999999).status_code, status.HTTP_404_NOT_FOUND)
