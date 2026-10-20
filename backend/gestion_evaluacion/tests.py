from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from gestion_administrativa.jwt_utils import generar_token
from gestion_administrativa.models import Rol, Usuario, UsuarioRol

from .models import CriterioRubrica, Evaluacion, NotaCriterio, Rubrica, SubRubrica


class RubricasTests(APITestCase):
    def setUp(self):
        self.usuarios = {}
        self.tokens = {}
        for i, rol in enumerate(("admin", "direccion_del_programa", "evaluador")):
            rol_obj, _ = Rol.objects.get_or_create(nombre_rol=rol, defaults={"descripcion": rol})
            usuario = Usuario.objects.create(
                nombre=f"Usuario {rol}", correo=f"{rol}@ufps.edu.co",
                google_id=f"gid-rubricas-{i}", estado="activo",
            )
            UsuarioRol.objects.create(usuario=usuario, rol=rol_obj, estado="activo")
            self.usuarios[rol] = usuario
            self.tokens[rol] = generar_token(usuario, rol)

        # La migración de datos crea esta rúbrica; le armamos 3 hitos de 35/25/40
        self.rubrica = Rubrica.objects.get(tipo_iniciativa="emprendimiento")
        self.url = f"/api/rubricas/{self.rubrica.id}/"
        self.hitos = []
        for numero, peso in ((1, "35"), (2, "25"), (3, "40")):
            hito = SubRubrica.objects.create(
                rubrica=self.rubrica, numero_hito=numero, nombre=f"Hito {numero}", ponderacion=peso
            )
            CriterioRubrica.objects.create(subrubrica=hito, nombre=f"C{numero}a", ponderacion="50")
            CriterioRubrica.objects.create(subrubrica=hito, nombre=f"C{numero}b", ponderacion="50")
            self.hitos.append(hito)
        self.como("direccion_del_programa")

    # ---------- utilidades ----------
    def como(self, rol):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens[rol]}")

    def cuerpo_actual(self):
        """Cuerpo de PUT equivalente al estado actual de la rúbrica."""
        datos = self.client.get(self.url).data
        return {"subrubricas": [
            {
                "id": h["id"], "numero_hito": h["numero_hito"], "nombre": h["nombre"],
                "descripcion": h["descripcion"], "ponderacion": h["ponderacion"],
                "criterios": [
                    {
                        "id": c["id"], "nombre": c["nombre"], "descripcion": c["descripcion"],
                        "ponderacion": c["ponderacion"],
                        "escala_min": c["escala_min"], "escala_max": c["escala_max"],
                    }
                    for c in h["criterios"]
                ],
            }
            for h in datos["subrubricas"]
        ]}

    def put(self, cuerpo):
        return self.client.put(self.url, cuerpo, format="json")

    def hito_en(self, cuerpo, numero):
        return next(h for h in cuerpo["subrubricas"] if h["numero_hito"] == numero)

    # ---------- migración de datos ----------
    def test_las_dos_rubricas_existen_tras_migrar(self):
        rubricas = dict(Rubrica.objects.values_list("tipo_iniciativa", "nombre"))
        self.assertEqual(rubricas.get("emprendimiento"), "Rubrica de Emprendimientos")
        self.assertEqual(rubricas.get("innovacion"), "Rubrica de Innovación")

    # ---------- 1. PUT completo y válido ----------
    def test_put_completo_valido_refleja_los_cambios(self):
        cuerpo = self.cuerpo_actual()
        hito1 = self.hito_en(cuerpo, 1)
        hito1["nombre"] = "Ideación"
        hito1["descripcion"] = "Validación del problema"
        hito1["criterios"][0]["nombre"] = "Claridad"
        hito1["criterios"][0]["escala_max"] = 10

        res = self.put(cuerpo)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        hito_res = self.hito_en(res.data, 1)
        self.assertEqual(hito_res["nombre"], "Ideación")
        self.assertEqual(hito_res["descripcion"], "Validación del problema")
        criterio = next(c for c in hito_res["criterios"] if c["id"] == hito1["criterios"][0]["id"])
        self.assertEqual(criterio["nombre"], "Claridad")
        self.assertEqual(criterio["escala_max"], 10)

    def test_admin_tambien_puede_editar(self):
        self.como("admin")
        self.assertEqual(self.put(self.cuerpo_actual()).status_code, status.HTTP_200_OK)

    # ---------- 2 y 3. Sumas distintas de 100 ----------
    def test_criterios_que_suman_90_dan_400_y_no_cambia_nada(self):
        antes = self.client.get(self.url).data
        cuerpo = self.cuerpo_actual()
        hito1 = self.hito_en(cuerpo, 1)
        hito1["nombre"] = "No debería guardarse"
        hito1["criterios"][1]["ponderacion"] = "40"  # 50 + 40 = 90

        res = self.put(cuerpo)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.get(self.url).data, antes)

    def test_hitos_que_suman_90_dan_400(self):
        cuerpo = self.cuerpo_actual()
        self.hito_en(cuerpo, 3)["ponderacion"] = "30"  # 35 + 25 + 30 = 90
        self.assertEqual(self.put(cuerpo).status_code, status.HTTP_400_BAD_REQUEST)

    # ---------- 4. Redistribuir pesos ----------
    def test_cambiar_pesos_de_35_25_40_a_45_25_30(self):
        cuerpo = self.cuerpo_actual()
        self.hito_en(cuerpo, 1)["ponderacion"] = "45"
        self.hito_en(cuerpo, 3)["ponderacion"] = "30"
        res = self.put(cuerpo)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        pesos = [Decimal(h["ponderacion"]) for h in res.data["subrubricas"]]
        self.assertEqual(pesos, [Decimal("45"), Decimal("25"), Decimal("30")])

    # ---------- 5. Intercambiar numero_hito ----------
    def test_intercambiar_numero_hito_de_dos_hitos(self):
        cuerpo = self.cuerpo_actual()
        hito1, hito2 = self.hito_en(cuerpo, 1), self.hito_en(cuerpo, 2)
        hito1["numero_hito"], hito2["numero_hito"] = 2, 1

        res = self.put(cuerpo)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(SubRubrica.objects.get(pk=self.hitos[0].pk).numero_hito, 2)
        self.assertEqual(SubRubrica.objects.get(pk=self.hitos[1].pk).numero_hito, 1)

    # ---------- 6. Omitir un hito ----------
    def test_omitir_un_hito_lo_borra_con_sus_criterios(self):
        cuerpo = self.cuerpo_actual()
        cuerpo["subrubricas"] = [h for h in cuerpo["subrubricas"] if h["numero_hito"] != 3]
        self.hito_en(cuerpo, 1)["ponderacion"] = "75"  # 75 + 25 = 100

        res = self.put(cuerpo)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertFalse(SubRubrica.objects.filter(pk=self.hitos[2].pk).exists())
        self.assertFalse(CriterioRubrica.objects.filter(subrubrica_id=self.hitos[2].pk).exists())

    # ---------- 7. Crear hito y criterio ----------
    def test_hito_y_criterio_sin_id_se_crean(self):
        cuerpo = self.cuerpo_actual()
        self.hito_en(cuerpo, 3)["ponderacion"] = "20"
        cuerpo["subrubricas"].append({
            "numero_hito": 4, "nombre": "Hito nuevo", "descripcion": "", "ponderacion": "20",
            "criterios": [{"nombre": "Criterio del hito nuevo", "ponderacion": "100"}],
        })
        hito1 = self.hito_en(cuerpo, 1)
        hito1["criterios"][1]["ponderacion"] = "30"
        hito1["criterios"].append({"nombre": "Criterio nuevo", "ponderacion": "20"})

        res = self.put(cuerpo)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        nuevo = SubRubrica.objects.get(rubrica=self.rubrica, numero_hito=4)
        self.assertEqual(nuevo.criterios.get().nombre, "Criterio del hito nuevo")
        self.assertTrue(self.hitos[0].criterios.filter(nombre="Criterio nuevo").exists())

    # ---------- 8. Ids ajenos ----------
    def test_id_de_hito_de_otra_rubrica_da_400(self):
        otra = Rubrica.objects.get(tipo_iniciativa="innovacion")
        ajeno = SubRubrica.objects.create(rubrica=otra, numero_hito=1, nombre="Ajeno", ponderacion="100")
        cuerpo = self.cuerpo_actual()
        self.hito_en(cuerpo, 1)["id"] = ajeno.id
        self.assertEqual(self.put(cuerpo).status_code, status.HTTP_400_BAD_REQUEST)

    def test_hito_nuevo_con_criterio_con_id_da_400(self):
        cuerpo = self.cuerpo_actual()
        hito3 = self.hito_en(cuerpo, 3)
        hito3.pop("id")  # se enviaría como hito nuevo, pero con criterios existentes
        self.assertEqual(self.put(cuerpo).status_code, status.HTTP_400_BAD_REQUEST)

    # ---------- 9. Números de hito ----------
    def test_numeros_de_hito_no_consecutivos_o_repetidos_dan_400(self):
        cuerpo = self.cuerpo_actual()
        self.hito_en(cuerpo, 3)["numero_hito"] = 5
        self.assertEqual(self.put(cuerpo).status_code, status.HTTP_400_BAD_REQUEST)

        cuerpo = self.cuerpo_actual()
        self.hito_en(cuerpo, 3)["numero_hito"] = 2
        self.assertEqual(self.put(cuerpo).status_code, status.HTTP_400_BAD_REQUEST)

    # ---------- 10. Métodos y permisos ----------
    def test_patch_da_405(self):
        self.como("admin")
        res = self.client.patch(self.url, {"subrubricas": []}, format="json")
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_crear_o_borrar_rubrica_por_api_da_405(self):
        self.como("admin")
        res = self.client.post("/api/rubricas/", {"nombre": "Otra", "tipo_iniciativa": "otra"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(self.url).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_evaluador_puede_leer_pero_no_editar(self):
        self.como("evaluador")
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)
        self.assertEqual(self.put(self.cuerpo_actual()).status_code, status.HTTP_403_FORBIDDEN)

    def test_sin_token_responde_401(self):
        cuerpo = self.cuerpo_actual()
        self.client.credentials()
        self.assertEqual(self.client.get("/api/rubricas/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.put(cuerpo).status_code, status.HTTP_401_UNAUTHORIZED)

    # ---------- 11. Criterios con notas ----------
    def _registrar_nota(self, criterio):
        from gestion_convocatorias.models import Convocatoria, Iniciativa

        ahora = timezone.now()
        convocatoria = Convocatoria.objects.create(
            nombre="Convocatoria", fecha_apertura=ahora - timedelta(days=2),
            fecha_cierre=ahora + timedelta(days=10), estado="abierta",
        )
        # Al quedar aprobada, la señal de gestion_emprendimiento_2 crea su Proyecto
        iniciativa = Iniciativa.objects.create(
            convocatoria=convocatoria, usuario=self.usuarios["admin"], nombre="Iniciativa evaluada",
            tipo="emprendimiento", origen_academico="asignatura", estado="aprobada",
        )
        evaluacion = Evaluacion.objects.create(
            proyecto=iniciativa.proyecto, subrubrica=criterio.subrubrica,
            evaluador=self.usuarios["evaluador"],
        )
        NotaCriterio.objects.create(evaluacion=evaluacion, criterio=criterio, nota="4")

    def test_criterio_con_notas_no_cambia_de_peso_ni_se_borra(self):
        criterio = self.hitos[0].criterios.get(nombre="C1a")
        self._registrar_nota(criterio)

        # Cambiar el peso de un criterio con notas: 400 con el nombre del criterio
        cuerpo = self.cuerpo_actual()
        criterios = self.hito_en(cuerpo, 1)["criterios"]
        for c in criterios:
            c["ponderacion"] = "60" if c["id"] == criterio.id else "40"
        res = self.put(cuerpo)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("C1a", str(res.data))

        # Omitir (borrar) el criterio con notas: 400 y no se borra nada
        cuerpo = self.cuerpo_actual()
        hito1 = self.hito_en(cuerpo, 1)
        hito1["criterios"] = [c for c in hito1["criterios"] if c["id"] != criterio.id]
        hito1["criterios"][0]["ponderacion"] = "100"
        res = self.put(cuerpo)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(CriterioRubrica.objects.filter(pk=criterio.pk).exists())
        self.assertEqual(
            CriterioRubrica.objects.get(nombre="C1b", subrubrica=self.hitos[0]).ponderacion, Decimal("50")
        )

        # Cambiar solo textos de ese criterio sí se permite
        cuerpo = self.cuerpo_actual()
        next(c for c in self.hito_en(cuerpo, 1)["criterios"] if c["id"] == criterio.id)["nombre"] = "C1a v2"
        self.assertEqual(self.put(cuerpo).status_code, status.HTTP_200_OK)

    # ---------- validar ----------
    def test_validar_rubrica_completa(self):
        self.como("evaluador")  # validar es de lectura
        res = self.client.get(f"{self.url}validar/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, {"completa": True, "problemas": []})

    def test_validar_rubrica_incompleta_lista_problemas(self):
        vacia = Rubrica.objects.get(tipo_iniciativa="innovacion")
        res = self.client.get(f"/api/rubricas/{vacia.id}/validar/")
        self.assertFalse(res.data["completa"])
        self.assertEqual(len(res.data["problemas"]), 1)

        # Datos inconsistentes creados por fuera de la API (p. ej. desde el admin)
        hito = SubRubrica.objects.create(rubrica=vacia, numero_hito=1, nombre="H1", ponderacion="60")
        CriterioRubrica.objects.create(subrubrica=hito, nombre="C", ponderacion="80")
        SubRubrica.objects.create(rubrica=vacia, numero_hito=2, nombre="H2", ponderacion="30")
        res = self.client.get(f"/api/rubricas/{vacia.id}/validar/")
        self.assertFalse(res.data["completa"])
        self.assertEqual(len(res.data["problemas"]), 3)


class HitosListaTests(APITestCase):
    URL = "/api/rubricas/hitos/"

    def setUp(self):
        self.tokens = {}
        # "secretaria" es un rol sin permiso de lectura de rúbricas
        for i, rol in enumerate(("evaluador", "secretaria")):
            rol_obj, _ = Rol.objects.get_or_create(nombre_rol=rol, defaults={"descripcion": rol})
            usuario = Usuario.objects.create(
                nombre=f"Usuario {rol}", correo=f"hitos-{rol}@ufps.edu.co",
                google_id=f"gid-hitos-{i}", estado="activo",
            )
            UsuarioRol.objects.create(usuario=usuario, rol=rol_obj, estado="activo")
            self.tokens[rol] = generar_token(usuario, rol)

        emprendimiento = Rubrica.objects.get(tipo_iniciativa="emprendimiento")
        innovacion = Rubrica.objects.get(tipo_iniciativa="innovacion")
        # Se crean desordenados para comprobar el orden de la respuesta
        hito_e2 = SubRubrica.objects.create(
            rubrica=emprendimiento, numero_hito=2, nombre="Validación", descripcion="d", ponderacion="60"
        )
        CriterioRubrica.objects.create(subrubrica=hito_e2, nombre="C", ponderacion="100")
        SubRubrica.objects.create(rubrica=innovacion, numero_hito=1, nombre="Prototipo", ponderacion="100")
        SubRubrica.objects.create(rubrica=emprendimiento, numero_hito=1, nombre="Ideación", ponderacion="40")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['evaluador']}")

    def test_devuelve_solo_los_campos_esperados_y_ordenados(self):
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)  # sin paginación
        for hito in res.data:
            self.assertEqual(set(hito), {"id", "numero_hito", "nombre", "tipo_iniciativa"})
        self.assertEqual(
            [(h["tipo_iniciativa"], h["numero_hito"], h["nombre"]) for h in res.data],
            [
                ("emprendimiento", 1, "Ideación"),
                ("emprendimiento", 2, "Validación"),
                ("innovacion", 1, "Prototipo"),
            ],
        )

    def test_filtro_por_tipo_de_iniciativa(self):
        res = self.client.get(self.URL, {"tipo_iniciativa": "innovacion"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual([h["nombre"] for h in res.data], ["Prototipo"])

        res = self.client.get(self.URL, {"tipo_iniciativa": "emprendimiento"})
        self.assertEqual([h["numero_hito"] for h in res.data], [1, 2])

    def test_tipo_invalido_devuelve_400(self):
        res = self.client.get(self.URL, {"tipo_iniciativa": "otro"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tipo_iniciativa", res.data)

    def test_sin_token_devuelve_401(self):
        self.client.credentials()
        self.assertEqual(self.client.get(self.URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rol_sin_permiso_de_lectura_devuelve_403(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['secretaria']}")
        self.assertEqual(self.client.get(self.URL).status_code, status.HTTP_403_FORBIDDEN)
