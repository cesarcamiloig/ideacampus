import csv
import io
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from gestion_administrativa.jwt_utils import generar_token
from gestion_administrativa.models import Rol, Usuario, UsuarioRol
from gestion_convocatorias.models import Convocatoria, Iniciativa
from gestion_emprendimiento_2.models import EquipoEmprendedor, Estudiante
from gestion_evaluacion.models import RegistroMadurez

from .models import PublicacionCatalogo

URL_PUBLICO = "/api/catalogo/publico/"
URL_GESTION = "/api/catalogo/gestion/"
URL_RESUMEN = "/api/informes/iniciativas/resumen/"
URL_EXPORTAR = "/api/informes/iniciativas/exportar/"


class CatalogoBaseTests(APITestCase):
    """Datos comunes: un coordinador, un estudiante postulante y tres iniciativas en distintos estados."""

    def setUp(self):
        def crear_usuario(nombre, rol):
            rol_obj, _ = Rol.objects.get_or_create(nombre_rol=rol)
            usuario = Usuario.objects.create(
                nombre=nombre, correo=f"{nombre.lower()}@ufps.edu.co", google_id=f"gid-cat-{nombre}"
            )
            UsuarioRol.objects.create(usuario=usuario, rol=rol_obj)
            return usuario

        self.coordinador = crear_usuario("Coordinadora", "coordinador")
        self.estudiante = crear_usuario("Estudiante", "estudiante")
        self.tutor = crear_usuario("Tutor", "tutor")

        ahora = timezone.now()
        self.convocatoria = Convocatoria.objects.create(
            nombre="Convocatoria 2026-2", fecha_apertura=ahora - timedelta(days=10),
            fecha_cierre=ahora + timedelta(days=10), estado="abierta",
        )
        self.otra_convocatoria = Convocatoria.objects.create(
            nombre="Convocatoria 2026-1", fecha_apertura=ahora - timedelta(days=100),
            fecha_cierre=ahora - timedelta(days=60), estado="cerrada",
        )

        def crear_iniciativa(nombre, estado, convocatoria=None, tipo="emprendimiento", origen="asignatura"):
            return Iniciativa.objects.create(
                convocatoria=convocatoria or self.convocatoria, usuario=self.estudiante, nombre=nombre,
                descripcion=f"Descripción de {nombre}", tipo=tipo, origen_academico=origen,
                sector_tecnologico="Agrotech", estado=estado,
            )

        # Al quedar aprobada, la señal crea el proyecto de la iniciativa
        self.aprobada = crear_iniciativa("Riego inteligente", "aprobada")
        self.pendiente = crear_iniciativa("App de tutorías", "pendiente", tipo="innovacion", origen="semillero")
        self.rechazada = crear_iniciativa("Marketplace", "rechazada", convocatoria=self.otra_convocatoria)

        lider = Estudiante.objects.create(usuario=self.estudiante)
        equipo = EquipoEmprendedor.objects.create(
            nombre_equipo="AgroTeam", estudiante_lider=lider, iniciativa=self.aprobada
        )
        lider.equipo = equipo
        lider.save(update_fields=["equipo"])

    def autenticar(self, usuario, rol):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario, rol)}", HTTP_X_ROL_ACTIVO=rol
        )

    def publicar(self, iniciativa, **datos):
        self.autenticar(self.coordinador, "coordinador")
        cuerpo = {"publicada": True, "resumen_publico": "Sensores para optimizar el riego.",
                  "resultados": "Piloto en 3 fincas.", **datos}
        return self.client.put(f"{URL_GESTION}{iniciativa.pk}/", cuerpo, format="json")


class CatalogoPublicoTests(CatalogoBaseTests):

    def test_catalogo_publico_no_requiere_sesion_y_solo_muestra_publicadas(self):
        self.assertEqual(self.publicar(self.aprobada).status_code, status.HTTP_200_OK)
        self.client.credentials()
        res = self.client.get(URL_PUBLICO)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([i["nombre"] for i in res.data], ["Riego inteligente"])
        ficha = res.data[0]
        self.assertEqual(ficha["resumen_publico"], "Sensores para optimizar el riego.")
        self.assertEqual(ficha["equipo"], "AgroTeam")
        self.assertEqual(ficha["nivel_madurez"], "M0")

    def test_ficha_publica_no_expone_datos_personales(self):
        self.publicar(self.aprobada)
        self.client.credentials()
        ficha = self.client.get(URL_PUBLICO).data[0]
        for campo in ("usuario_correo", "postulante", "correo", "integrantes", "usuario"):
            self.assertNotIn(campo, ficha)
        self.assertNotIn("estudiante@ufps.edu.co", str(ficha))

    def test_un_token_vencido_no_impide_ver_el_catalogo(self):
        self.publicar(self.aprobada)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer token-invalido")
        self.assertEqual(self.client.get(URL_PUBLICO).status_code, status.HTTP_200_OK)

    def test_despublicar_la_retira_y_si_la_rechazan_deja_de_mostrarse(self):
        self.publicar(self.aprobada)
        self.publicar(self.aprobada, publicada=False)
        self.client.credentials()
        self.assertEqual(self.client.get(URL_PUBLICO).data, [])

        self.publicar(self.aprobada)
        Iniciativa.objects.filter(pk=self.aprobada.pk).update(estado="rechazada")
        self.client.credentials()
        self.assertEqual(self.client.get(URL_PUBLICO).data, [])

    def test_filtros_del_catalogo_publico(self):
        self.publicar(self.aprobada)
        self.client.credentials()
        self.assertEqual(len(self.client.get(URL_PUBLICO, {"q": "riego"}).data), 1)
        self.assertEqual(len(self.client.get(URL_PUBLICO, {"q": "agrotech"}).data), 1)
        self.assertEqual(self.client.get(URL_PUBLICO, {"q": "blockchain"}).data, [])
        self.assertEqual(self.client.get(URL_PUBLICO, {"tipo": "innovacion"}).data, [])
        self.assertEqual(len(self.client.get(URL_PUBLICO, {"origen": "asignatura"}).data), 1)

    def test_nivel_de_madurez_vigente_en_la_ficha(self):
        RegistroMadurez.objects.create(
            proyecto=self.aprobada.proyecto, nivel="M4", evaluador=self.coordinador, criterio_cumplido="Prototipo",
        )
        self.publicar(self.aprobada)
        self.client.credentials()
        ficha = self.client.get(URL_PUBLICO).data[0]
        self.assertEqual(ficha["nivel_madurez"], "M4")
        self.assertEqual(ficha["nivel_madurez_display"], "M4: Prototipo Básico")


class GestionCatalogoTests(CatalogoBaseTests):

    def test_coordinador_lista_solo_iniciativas_aprobadas(self):
        self.autenticar(self.coordinador, "coordinador")
        res = self.client.get(URL_GESTION)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([i["nombre"] for i in res.data], ["Riego inteligente"])
        self.assertFalse(res.data[0]["en_catalogo"])
        self.assertIsNone(res.data[0]["publicacion"])

    def test_publicar_registra_quien_autoriza_y_cuando(self):
        res = self.publicar(self.aprobada)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertTrue(res.data["en_catalogo"])
        self.assertEqual(res.data["publicacion"]["autorizado_por_nombre"], "Coordinadora")
        self.assertIsNotNone(res.data["publicacion"]["fecha_publicacion"])

    def test_editar_una_publicada_conserva_la_fecha_de_publicacion(self):
        fecha = self.publicar(self.aprobada).data["publicacion"]["fecha_publicacion"]
        res = self.publicar(self.aprobada, resultados="Piloto en 5 fincas.")
        self.assertEqual(res.data["publicacion"]["resultados"], "Piloto en 5 fincas.")
        self.assertEqual(res.data["publicacion"]["fecha_publicacion"], fecha)
        self.assertEqual(PublicacionCatalogo.objects.count(), 1)

    def test_no_se_publica_sin_resumen_ni_una_iniciativa_no_aprobada(self):
        res = self.publicar(self.aprobada, resumen_publico="   ")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("resumen_publico", res.data)

        res = self.publicar(self.pendiente)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("publicada", res.data)
        self.assertFalse(PublicacionCatalogo.objects.exists())

    def test_se_puede_guardar_un_borrador_sin_publicar(self):
        res = self.publicar(self.aprobada, publicada=False, resumen_publico="")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertFalse(res.data["en_catalogo"])
        self.assertIsNone(res.data["publicacion"]["autorizado_por_nombre"])

    def test_iniciativa_inexistente_da_404(self):
        self.autenticar(self.coordinador, "coordinador")
        res = self.client.put(f"{URL_GESTION}999999/", {"publicada": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_otros_roles_y_sin_sesion_no_gestionan(self):
        self.autenticar(self.estudiante, "estudiante")
        self.assertEqual(self.client.get(URL_GESTION).status_code, status.HTTP_403_FORBIDDEN)
        cuerpo = {"publicada": True, "resumen_publico": "x"}
        self.assertEqual(
            self.client.put(f"{URL_GESTION}{self.aprobada.pk}/", cuerpo, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.autenticar(self.tutor, "tutor")
        self.assertEqual(self.client.get(URL_GESTION).status_code, status.HTTP_403_FORBIDDEN)
        self.client.credentials()
        self.assertIn(self.client.get(URL_GESTION).status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


class InformesTests(CatalogoBaseTests):

    def resumen(self, **filtros):
        self.autenticar(self.coordinador, "coordinador")
        return self.client.get(URL_RESUMEN, filtros)

    def exportar(self, **filtros):
        self.autenticar(self.coordinador, "coordinador")
        return self.client.get(URL_EXPORTAR, filtros)

    def test_resumen_cuenta_por_estado_tipo_y_catalogo(self):
        self.publicar(self.aprobada)
        res = self.resumen()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total"], 3)
        self.assertEqual(res.data["publicadas_catalogo"], 1)
        self.assertEqual(res.data["con_proyecto"], 1)
        por_estado = {item["etiqueta"]: item["total"] for item in res.data["por_estado"]}
        self.assertEqual(por_estado, {"Aprobada": 1, "Pendiente": 1, "Rechazada": 1})
        self.assertEqual({c["nombre"] for c in res.data["convocatorias"]},
                         {"Convocatoria 2026-2", "Convocatoria 2026-1"})

    def test_filtros_del_informe(self):
        self.assertEqual(self.resumen(estado="aprobada").data["total"], 1)
        self.assertEqual(self.resumen(tipo="innovacion").data["total"], 1)
        self.assertEqual(self.resumen(origen="semillero").data["total"], 1)
        self.assertEqual(self.resumen(convocatoria=self.otra_convocatoria.pk).data["total"], 1)
        self.assertEqual(self.resumen(catalogo="publicadas").data["total"], 0)
        self.assertEqual(self.resumen(catalogo="no_publicadas").data["total"], 3)
        hoy = timezone.localdate().isoformat()
        self.assertEqual(self.resumen(desde=hoy, hasta=hoy).data["total"], 3)
        manana = (timezone.localdate() + timedelta(days=1)).isoformat()
        self.assertEqual(self.resumen(desde=manana).data["total"], 0)

    def test_filtros_invalidos_dan_400(self):
        self.assertEqual(self.resumen(desde="22/11/2026").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.resumen(desde="2026-12-01", hasta="2026-11-01").status_code,
                         status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.resumen(convocatoria="abc").status_code, status.HTTP_400_BAD_REQUEST)

    def test_exportar_csv_con_encabezados_y_filas_filtradas(self):
        res = self.exportar(formato="csv", estado="aprobada")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", res["Content-Type"])
        self.assertIn('attachment; filename="informe_iniciativas_', res["Content-Disposition"])
        filas = list(csv.reader(io.StringIO(res.content.decode("utf-8-sig"))))
        self.assertEqual(filas[0][:3], ["Radicado", "Iniciativa", "Tipo"])
        self.assertEqual(len(filas), 2)
        fila = dict(zip(filas[0], filas[1]))
        self.assertEqual(fila["Iniciativa"], "Riego inteligente")
        self.assertEqual(fila["Equipo"], "AgroTeam")
        self.assertEqual(fila["Integrantes"], "1")
        self.assertEqual(fila["Nivel de madurez"], "M0: Ideación Inicial")
        self.assertEqual(fila["Publicada en catálogo"], "No")

    def test_exportar_excel_con_hoja_de_iniciativas_y_resumen(self):
        from openpyxl import load_workbook

        res = self.exportar(formato="xlsx")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("spreadsheetml", res["Content-Type"])
        libro = load_workbook(io.BytesIO(res.content))
        self.assertEqual(libro.sheetnames, ["Iniciativas", "Resumen"])
        self.assertEqual(libro["Iniciativas"].max_row, 4)
        self.assertEqual(libro["Resumen"]["B5"].value, 3)

    def test_formato_no_soportado_da_400(self):
        self.assertEqual(self.exportar(formato="pdf").status_code, status.HTTP_400_BAD_REQUEST)

    def test_solo_el_coordinador_genera_informes(self):
        self.autenticar(self.estudiante, "estudiante")
        self.assertEqual(self.client.get(URL_RESUMEN).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(URL_EXPORTAR).status_code, status.HTTP_403_FORBIDDEN)
