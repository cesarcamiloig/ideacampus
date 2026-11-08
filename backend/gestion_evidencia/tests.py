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

from .models import DocumentoEvidencia, Evidencia, RegistroAvance, RetroalimentacionAvance

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


# ===========================================================================
# HU-19 — Tests de Registro de Avance
# ===========================================================================

class RegistroAvanceBaseTests(EvidenciaBaseTests):
    """Fixture base reutilizable para los tests de RegistroAvance."""
    URL_AVANCE = "/api/registros-avance/"

    def autenticar(self, usuario, rol="estudiante"):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, rol)}")

    def publicar_evidencia(self, proyecto, etapa=None):
        return Evidencia.objects.create(
            proyecto=proyecto, usuario=self.titular, etapa=etapa or self.hito,
            titulo="Evidencia publicada", tipo="enlace",
        )

    def crear_registro(self, usuario, proyecto, etapa=None, rol="estudiante", **extra):
        self.autenticar(usuario, rol)
        etapa = etapa or self.hito
        payload = {
            "proyecto": proyecto.pk,
            "etapa": etapa.pk,
            "evidencias": [self.publicar_evidencia(proyecto, etapa).pk],
            "estado_avance": "en_progreso",
            "porcentaje_avance": 30,
            "descripcion_avance": "Avanzamos en el diseño de la base de datos.",
            "dificultades": "Falta de acceso a servidores de prueba.",
            "riesgos": "Posible retraso si no se resuelven los permisos.",
            "recomendaciones": "Solicitar acceso a TI con dos semanas de anticipación.",
            **extra,
        }
        return self.client.post(self.URL_AVANCE, payload, format="json")


class RegistroAvanceCrearTests(RegistroAvanceBaseTests):

    def test_estudiante_titular_puede_crear_registro_de_avance(self):
        res = self.crear_registro(self.titular, self.iniciativa_sin_equipo.proyecto)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(RegistroAvance.objects.count(), 1)
        self.assertEqual(res.data["descripcion_avance"], "Avanzamos en el diseño de la base de datos.")
        self.assertEqual(res.data["dificultades"], "Falta de acceso a servidores de prueba.")
        self.assertEqual(res.data["riesgos"], "Posible retraso si no se resuelven los permisos.")
        self.assertEqual(res.data["recomendaciones"], "Solicitar acceso a TI con dos semanas de anticipación.")

    def test_integrante_del_equipo_puede_crear_registro(self):
        res = self.crear_registro(self.integrante, self.iniciativa.proyecto)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["registrado_por_nombre"], "Integrante")

    def test_estudiante_ajeno_no_puede_crear_registro(self):
        res = self.crear_registro(self.ajeno, self.iniciativa.proyecto)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("proyecto", res.data)
        self.assertFalse(RegistroAvance.objects.exists())

    def test_etapa_incorrecta_da_error_de_validacion(self):
        # Crear una SubRubrica de otro tipo de iniciativa
        rubrica_innovacion, _ = Rubrica.objects.get_or_create(tipo_iniciativa="innovacion")
        hito_otro = SubRubrica.objects.create(
            rubrica=rubrica_innovacion, numero_hito=99,
            nombre="Hito Innovación", ponderacion="100",
        )
        res = self.crear_registro(self.titular, self.iniciativa_sin_equipo.proyecto, etapa=hito_otro)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("etapa", res.data)

    def test_porcentaje_invalido_da_error(self):
        res = self.crear_registro(
            self.titular, self.iniciativa_sin_equipo.proyecto,
            porcentaje_avance=150,
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_tutor_asignado_puede_crear_registro(self):
        from gestion_acompaniamiento.models import Tutor

        proyecto = self.iniciativa.proyecto
        proyecto.tutor = Tutor.objects.create(usuario=self.tutor)
        proyecto.save(update_fields=["tutor"])

        res = self.crear_registro(self.tutor, proyecto, rol="tutor")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data["registrado_por_nombre"], "Tutor")
        self.assertEqual(res.data["estado_validacion"], "pendiente")

    def test_tutor_no_asignado_no_puede_crear_registro(self):
        res = self.crear_registro(self.tutor, self.iniciativa.proyecto, rol="tutor")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("proyecto", res.data)

    def test_otros_roles_reciben_403_al_crear(self):
        rol_mentor, _ = Rol.objects.get_or_create(nombre_rol="mentor")
        mentor = Usuario.objects.create(nombre="Mentor", correo="mentor@ufps.edu.co", google_id="gid-ev-mentor")
        UsuarioRol.objects.create(usuario=mentor, rol=rol_mentor)
        res = self.crear_registro(mentor, self.iniciativa.proyecto, rol="mentor")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_el_registro_queda_vinculado_a_la_evidencia_publicada(self):
        proyecto = self.iniciativa_sin_equipo.proyecto
        evidencia = self.publicar_evidencia(proyecto)
        res = self.crear_registro(self.titular, proyecto, evidencias=[evidencia.pk])
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual([e["id"] for e in res.data["evidencias"]], [evidencia.pk])

    def test_registro_sin_evidencia_da_error(self):
        res = self.crear_registro(self.titular, self.iniciativa_sin_equipo.proyecto, evidencias=[])
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("evidencias", res.data)

    def test_evidencia_de_otra_etapa_u_otro_proyecto_da_error(self):
        proyecto = self.iniciativa_sin_equipo.proyecto
        otro_hito = SubRubrica.objects.create(
            rubrica=self.hito.rubrica, numero_hito=2, nombre="Hito 2", ponderacion="0",
        )
        for evidencia in (self.publicar_evidencia(proyecto, otro_hito),
                          self.publicar_evidencia(self.iniciativa.proyecto)):
            res = self.crear_registro(self.titular, proyecto, evidencias=[evidencia.pk])
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("evidencias", res.data)
        self.assertFalse(RegistroAvance.objects.exists())

    def test_evidencia_vinculada_a_un_registro_no_se_puede_eliminar(self):
        # El integrante es el líder del equipo: es quien puede eliminar evidencias
        proyecto = self.iniciativa.proyecto
        evidencia = self.publicar_evidencia(proyecto)
        self.crear_registro(self.integrante, proyecto, evidencias=[evidencia.pk])
        res = self.client.delete(f"{self.URL}{evidencia.pk}/")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Evidencia.objects.filter(pk=evidencia.pk).exists())

    def test_sin_token_se_rechaza(self):
        self.client.credentials()
        res = self.client.post(self.URL_AVANCE, {}, format="json")
        self.assertIn(res.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


class RegistroAvanceLecturaTests(RegistroAvanceBaseTests):

    def setUp(self):
        super().setUp()
        # El titular crea un registro en su proyecto sin equipo
        res = self.crear_registro(self.titular, self.iniciativa_sin_equipo.proyecto)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.registro_id = res.data["id"]

    def test_estudiante_titular_puede_listar_sus_registros(self):
        self.autenticar(self.titular)
        res = self.client.get(self.URL_AVANCE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_estudiante_ajeno_no_ve_registros_del_titular(self):
        self.autenticar(self.ajeno)
        res = self.client.get(self.URL_AVANCE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

    def test_filtro_por_proyecto(self):
        self.autenticar(self.titular)
        res = self.client.get(self.URL_AVANCE, {"proyecto": self.iniciativa_sin_equipo.proyecto.pk})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

        res_vacio = self.client.get(self.URL_AVANCE, {"proyecto": 999999})
        self.assertEqual(res_vacio.data, [])

    def test_tutor_asignado_puede_listar_registros_de_su_proyecto(self):
        from gestion_acompaniamiento.models import Tutor

        perfil_tutor = Tutor.objects.create(usuario=self.tutor)
        proyecto = self.iniciativa_sin_equipo.proyecto
        proyecto.tutor = perfil_tutor
        proyecto.save(update_fields=["tutor"])

        self.autenticar(self.tutor, rol="tutor")
        res = self.client.get(self.URL_AVANCE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_tutor_sin_proyectos_no_ve_registros(self):
        self.autenticar(self.tutor, rol="tutor")
        res = self.client.get(self.URL_AVANCE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])


class TrayectoriaAvanceTests(RegistroAvanceBaseTests):

    def setUp(self):
        super().setUp()
        from gestion_acompaniamiento.models import Tutor

        self.proyecto = self.iniciativa_sin_equipo.proyecto
        self.proyecto.tutor = Tutor.objects.create(usuario=self.tutor)
        self.proyecto.save(update_fields=["tutor"])
        self.hito_2 = SubRubrica.objects.create(
            rubrica=self.hito.rubrica, numero_hito=2, nombre="Hito 2", ponderacion="0",
        )

    def consultar(self, usuario, rol="estudiante", proyecto=None):
        self.autenticar(usuario, rol)
        return self.client.get(
            f"{self.URL_AVANCE}trayectoria/", {"proyecto": proyecto or self.proyecto.pk}
        )

    def test_recorre_las_etapas_con_su_evidencia_y_su_validacion(self):
        res = self.crear_registro(self.titular, self.proyecto)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        res = self.consultar(self.titular)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([e["numero_hito"] for e in res.data["etapas"]], [1, 2])
        hito_1, hito_2 = res.data["etapas"]
        self.assertEqual(hito_1["estado_validacion"], "pendiente")
        self.assertEqual(len(hito_1["evidencias"]), 1)
        self.assertEqual(len(hito_1["registros"]), 1)
        self.assertEqual(hito_2["estado_validacion"], "sin_registro")
        self.assertEqual(hito_2["registros"], [])

    def test_la_validacion_de_la_etapa_es_la_del_registro_mas_reciente(self):
        primero = self.crear_registro(self.titular, self.proyecto).data["id"]
        self.autenticar(self.tutor, "tutor")
        self.client.post(
            f"{self.URL_AVANCE}{primero}/retroalimentar/", {"comentario": "Bien", "aprobado": True}, format="json"
        )
        self.assertEqual(self.consultar(self.titular).data["etapas"][0]["estado_validacion"], "aprobado")

        self.crear_registro(self.titular, self.proyecto)
        self.assertEqual(self.consultar(self.titular).data["etapas"][0]["estado_validacion"], "pendiente")

    def test_tutor_asignado_consulta_y_ajenos_reciben_403(self):
        self.assertEqual(self.consultar(self.tutor, rol="tutor").status_code, status.HTTP_200_OK)
        self.assertEqual(self.consultar(self.ajeno).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.consultar(self.tutor, rol="tutor", proyecto=self.iniciativa.proyecto.pk).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_proyecto_invalido_o_inexistente(self):
        self.autenticar(self.titular)
        url = f"{self.URL_AVANCE}trayectoria/"
        self.assertEqual(self.client.get(url).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.get(url, {"proyecto": "abc"}).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.get(url, {"proyecto": 999999}).status_code, status.HTTP_404_NOT_FOUND)

    def test_mis_proyectos_segun_el_rol(self):
        url = f"{self.URL_AVANCE}mis-proyectos/"
        self.autenticar(self.tutor, "tutor")
        self.assertEqual([p["id"] for p in self.client.get(url).data], [self.proyecto.pk])
        self.autenticar(self.integrante)
        self.assertEqual([p["id"] for p in self.client.get(url).data], [self.iniciativa.proyecto.pk])
        self.autenticar(self.ajeno)
        self.assertEqual(self.client.get(url).data, [])

        rol_mentor, _ = Rol.objects.get_or_create(nombre_rol="mentor")
        mentor = Usuario.objects.create(nombre="Mentor", correo="mentor@ufps.edu.co", google_id="gid-ev-mentor")
        UsuarioRol.objects.create(usuario=mentor, rol=rol_mentor)
        self.autenticar(mentor, "mentor")
        self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)


class RetroalimentacionAvanceTests(RegistroAvanceBaseTests):

    def setUp(self):
        super().setUp()
        from gestion_acompaniamiento.models import Tutor

        # El titular crea un registro en su proyecto sin equipo
        res = self.crear_registro(self.titular, self.iniciativa_sin_equipo.proyecto)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.registro_id = res.data["id"]

        # Crear perfil de tutor y asignarlo al proyecto
        self.perfil_tutor = Tutor.objects.create(usuario=self.tutor)
        proyecto = self.iniciativa_sin_equipo.proyecto
        proyecto.tutor = self.perfil_tutor
        proyecto.save(update_fields=["tutor"])

    def retroalimentar(self, usuario, registro_id=None, rol="tutor", **payload):
        self.autenticar(usuario, rol)
        data = {"comentario": "Buen avance. Mejorar documentación.", "aprobado": True, **payload}
        rid = registro_id or self.registro_id
        return self.client.post(f"{self.URL_AVANCE}{rid}/retroalimentar/", data, format="json")

    def test_tutor_asignado_puede_retroalimentar(self):
        res = self.retroalimentar(self.tutor)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(RetroalimentacionAvance.objects.count(), 1)
        self.assertTrue(res.data["aprobado"])
        self.assertEqual(res.data["comentario"], "Buen avance. Mejorar documentación.")

    def test_estado_de_validacion_sigue_a_la_ultima_retroalimentacion(self):
        def estado():
            self.autenticar(self.titular)
            return self.client.get(f"{self.URL_AVANCE}{self.registro_id}/").data["estado_validacion"]

        self.assertEqual(estado(), "pendiente")
        self.retroalimentar(self.tutor, aprobado=False)
        self.assertEqual(estado(), "observado")
        self.retroalimentar(self.tutor, aprobado=True)
        self.assertEqual(estado(), "aprobado")
        # Las retroalimentaciones anteriores se conservan como historial
        self.assertEqual(RetroalimentacionAvance.objects.count(), 2)

    def test_comentario_vacio_da_error(self):
        res = self.retroalimentar(self.tutor, comentario="")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("comentario", res.data)

    def test_retroalimentacion_aparece_en_el_detalle_del_registro(self):
        self.retroalimentar(self.tutor)
        self.autenticar(self.titular)
        res = self.client.get(f"{self.URL_AVANCE}{self.registro_id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["retroalimentaciones"]), 1)
        self.assertEqual(res.data["retroalimentaciones"][0]["tutor_nombre"], "Tutor")

    def test_estudiante_no_puede_retroalimentar(self):
        res = self.retroalimentar(self.titular, rol="estudiante")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(RetroalimentacionAvance.objects.exists())

    def test_tutor_sin_perfil_no_puede_retroalimentar(self):
        # Crear un usuario tutor sin perfil de Tutor
        rol_tutor, _ = Rol.objects.get_or_create(nombre_rol="tutor")
        tutor_sin_perfil = Usuario.objects.create(
            nombre="TutorSinPerfil", correo="tutor2@ufps.edu.co", google_id="gid-ev-tutor2"
        )
        UsuarioRol.objects.create(usuario=tutor_sin_perfil, rol=rol_tutor)
        res = self.retroalimentar(tutor_sin_perfil, rol="tutor")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_tutor_no_asignado_al_proyecto_no_puede_retroalimentar(self):
        rol_tutor, _ = Rol.objects.get_or_create(nombre_rol="tutor")
        from gestion_acompaniamiento.models import Tutor
        otro_tutor_usuario = Usuario.objects.create(
            nombre="OtroTutor", correo="otrotutor@ufps.edu.co", google_id="gid-ev-otrotutor"
        )
        UsuarioRol.objects.create(usuario=otro_tutor_usuario, rol=rol_tutor)
        Tutor.objects.create(usuario=otro_tutor_usuario)
        res = self.retroalimentar(otro_tutor_usuario, rol="tutor")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_registro_inexistente_da_404(self):
        res = self.retroalimentar(self.tutor, registro_id=999999)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
