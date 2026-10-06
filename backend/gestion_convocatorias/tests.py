from datetime import timedelta
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from gestion_administrativa.jwt_utils import generar_token
from gestion_administrativa.models import Rol, Usuario, UsuarioRol
from .models import (
    Convocatoria,
    DocumentoPostulacion,
    Iniciativa,
    NotificacionConvocatoria,
)
from .services import actualizar_estados_convocatorias, notificar_apertura


class GestionConvocatoriasTests(APITestCase):
    def setUp(self):
        # 1. Configurar Roles institucionales
        self.rol_admin, _ = Rol.objects.get_or_create(nombre_rol="admin", defaults={"descripcion": "Admin"})
        self.rol_coordinador, _ = Rol.objects.get_or_create(nombre_rol="coordinador", defaults={"descripcion": "Coordinador"})
        self.rol_direccion, _ = Rol.objects.get_or_create(
            nombre_rol="direccion_del_programa",
            defaults={"descripcion": "Dirección del Programa"},
        )
        self.rol_estudiante, _ = Rol.objects.get_or_create(nombre_rol="estudiante", defaults={"descripcion": "Estudiante"})

        # 2. Configurar Usuarios
        self.coordinador = Usuario.objects.create(
            nombre="Coordinadora Claudia",
            correo="claudiag@ufps.edu.co",
            google_id="coord-1",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.coordinador, rol=self.rol_coordinador, estado="activo")
        self.token_coordinador = generar_token(self.coordinador, "coordinador")

        self.direccion = Usuario.objects.create(
            nombre="Dirección de Programa",
            correo="direccion@ufps.edu.co",
            google_id="direccion-1",
            estado="activo",
        )
        UsuarioRol.objects.create(
            usuario=self.direccion,
            rol=self.rol_direccion,
            estado="activo",
        )
        self.token_direccion = generar_token(
            self.direccion,
            "direccion_del_programa",
        )

        self.estudiante = Usuario.objects.create(
            nombre="Estudiante Pedro",
            correo="pedro@ufps.edu.co",
            google_id="est-1",
            estado="activo",
        )
        UsuarioRol.objects.create(usuario=self.estudiante, rol=self.rol_estudiante, estado="activo")
        self.token_estudiante = generar_token(self.estudiante, "estudiante")

    def test_creacion_convocatoria_por_coordinador(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")

        now = timezone.now()
        payload = {
            "nombre": "Convocatoria Innovación 2026-I",
            "descripcion": "Recepción de iniciativas de base tecnológica",
            "categoria": "Tecnología",
            "requisitos_documentacion": "Formato de postulación y pitch deck",
            "criterios_evaluacion": "TRL 3+, impacto regional y viabilidad",
            "fecha_apertura": (now + timedelta(days=1)).isoformat(),
            "fecha_cierre": (now + timedelta(days=30)).isoformat(),
            "estado": "borrador",
        }

        res = self.client.post("/api/convocatorias/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["nombre"], "Convocatoria Innovación 2026-I")
        self.assertEqual(res.data["creador_nombre"], "Coordinadora Claudia")

    def test_creacion_convocatoria_por_direccion_del_programa(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.token_direccion}"
        )

        now = timezone.now()
        payload = {
            "nombre": "Convocatoria Dirección de Programa",
            "fecha_apertura": (now + timedelta(days=1)).isoformat(),
            "fecha_cierre": (now + timedelta(days=30)).isoformat(),
            "estado": "borrador",
        }

        respuesta = self.client.post(
            "/api/convocatorias/",
            payload,
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            respuesta.data["creador_nombre"],
            "Dirección de Programa",
        )

    def test_validacion_fechas_inconsistentes(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")

        now = timezone.now()
        payload_error = {
            "nombre": "Convocatoria Fechas Mal",
            "fecha_apertura": (now + timedelta(days=10)).isoformat(),
            "fecha_cierre": (now + timedelta(days=2)).isoformat(), # Cierre antes de apertura
            "estado": "borrador",
        }

        res = self.client.post("/api/convocatorias/", payload_error, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fecha_cierre", res.data)

    def test_control_acceso_estudiante_no_puede_crear_convocatorias(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")

        now = timezone.now()
        payload = {
            "nombre": "Convocatoria Ilegal",
            "fecha_apertura": now.isoformat(),
            "fecha_cierre": (now + timedelta(days=5)).isoformat(),
        }

        res = self.client.post("/api/convocatorias/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_transicion_automatica_de_estados_por_fechas(self):
        now = timezone.now()

        # Convocatoria 1: Publicada pero su fecha de apertura ya llegó -> debe pasar a 'abierta'
        c1 = Convocatoria.objects.create(
            nombre="Convocatoria Pasada a Abierta",
            fecha_apertura=now - timedelta(hours=1),
            fecha_cierre=now + timedelta(days=5),
            estado="publicada",
        )

        # Convocatoria 2: Abierta pero su fecha de cierre ya pasó -> debe pasar a 'cerrada'
        c2 = Convocatoria.objects.create(
            nombre="Convocatoria Expirada",
            fecha_apertura=now - timedelta(days=10),
            fecha_cierre=now - timedelta(hours=2),
            estado="abierta",
        )

        actualizar_estados_convocatorias()

        c1.refresh_from_db()
        c2.refresh_from_db()
        self.assertEqual(c1.estado, "abierta")
        self.assertEqual(c2.estado, "cerrada")

    def test_visibilidad_segun_rol(self):
        now = timezone.now()
        # Convocatoria en borrador
        Convocatoria.objects.create(
            nombre="Borrador Oculto",
            fecha_apertura=now + timedelta(days=1),
            fecha_cierre=now + timedelta(days=10),
            estado="borrador",
        )
        # Convocatoria abierta
        Convocatoria.objects.create(
            nombre="Convocatoria Visible",
            fecha_apertura=now - timedelta(days=1),
            fecha_cierre=now + timedelta(days=10),
            estado="abierta",
        )

        # 1. Estudiante no ve borradores
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")
        res_est = self.client.get("/api/convocatorias/")
        self.assertEqual(res_est.status_code, status.HTTP_200_OK)
        nombres_est = [c["nombre"] for c in res_est.data]
        self.assertIn("Convocatoria Visible", nombres_est)
        self.assertNotIn("Borrador Oculto", nombres_est)

        # 2. Coordinador sí ve borradores
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res_coord = self.client.get("/api/convocatorias/")
        self.assertEqual(res_coord.status_code, status.HTTP_200_OK)
        nombres_coord = [c["nombre"] for c in res_coord.data]
        self.assertIn("Convocatoria Visible", nombres_coord)
        self.assertIn("Borrador Oculto", nombres_coord)

    def test_publicacion_y_emision_de_notificaciones(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")

        now = timezone.now()
        convocatoria = Convocatoria.objects.create(
            nombre="Gran Convocatoria 2026",
            fecha_apertura=now - timedelta(hours=1),
            fecha_cierre=now + timedelta(days=15),
            estado="borrador",
            creador=self.coordinador,
        )

        # Acción publicar
        res_pub = self.client.post(f"/api/convocatorias/{convocatoria.id_convocatoria}/publicar/")
        self.assertEqual(res_pub.status_code, status.HTTP_200_OK)
        convocatoria.refresh_from_db()
        self.assertEqual(convocatoria.estado, "abierta")

        # Verificar que el estudiante recibió la notificación
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")
        res_notif = self.client.get("/api/notificaciones-convocatoria/")
        self.assertEqual(res_notif.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res_notif.data) >= 1)
        notif = res_notif.data[0]
        self.assertIn("Gran Convocatoria 2026", notif["titulo"])
        self.assertFalse(notif["leida"])

        # Marcar notificación como leída
        id_notif = notif["id_notificacion"]
        res_read = self.client.patch(f"/api/notificaciones-convocatoria/{id_notif}/leer/")
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        self.assertTrue(res_read.data["leida"])

        # Resumen de notificaciones
        res_resumen = self.client.get("/api/notificaciones-convocatoria/resumen/")
        self.assertEqual(res_resumen.status_code, status.HTTP_200_OK)
        self.assertEqual(res_resumen.data["no_leidas"], 0)

    def test_cierre_manual_convocatoria(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")

        now = timezone.now()
        convocatoria = Convocatoria.objects.create(
            nombre="Convocatoria a Cerrar",
            fecha_apertura=now - timedelta(days=5),
            fecha_cierre=now + timedelta(days=5),
            estado="abierta",
        )

        res_close = self.client.post(f"/api/convocatorias/{convocatoria.id_convocatoria}/cerrar/")
        self.assertEqual(res_close.status_code, status.HTTP_200_OK)
        convocatoria.refresh_from_db()
        self.assertEqual(convocatoria.estado, "cerrada")

    def test_estudiante_radica_iniciativa_exitosa(self):
        """Verifica que un estudiante pueda postular una iniciativa en convocatoria abierta (HU-03)."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")
        now = timezone.now()
        conv = Convocatoria.objects.create(
            nombre="Convocatoria 2026 Abierta",
            fecha_apertura=now - timedelta(days=2),
            fecha_cierre=now + timedelta(days=10),
            estado="abierta",
        )

        payload = {
            "convocatoria": conv.id_convocatoria,
            "nombre": "Sistema IoT de Monitoreo",
            "descripcion": "Monitoreo inteligente para laboratorios",
            "tipo": "innovacion",
            "origen_academico": "semillero",
            "etapa_actual": "M2",
        }

        res = self.client.post("/api/iniciativas/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["nombre"], "Sistema IoT de Monitoreo")
        self.assertEqual(res.data["estado"], "pendiente")
        self.assertTrue(res.data["radicado"].startswith("UFPS-POST-"))

        # Verificar notificación generada
        notif = NotificacionConvocatoria.objects.filter(usuario=self.estudiante).first()
        self.assertIsNotNone(notif)
        self.assertIn("Radicada", notif.titulo)

    def test_estudiante_no_puede_postular_a_convocatoria_no_abierta(self):
        """Verifica que no se permita postular a una convocatoria cerrada o en borrador."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")
        now = timezone.now()
        conv_cerrada = Convocatoria.objects.create(
            nombre="Convocatoria Cerrada",
            fecha_apertura=now - timedelta(days=20),
            fecha_cierre=now - timedelta(days=5),
            estado="cerrada",
        )

        payload = {
            "convocatoria": conv_cerrada.id_convocatoria,
            "nombre": "Iniciativa Tardía",
            "tipo": "emprendimiento",
            "origen_academico": "asignatura",
        }

        res = self.client.post("/api/iniciativas/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_coordinador_aprueba_iniciativa_y_notifica_estudiante(self):
        """El coordinador puede evaluar y aprobar una iniciativa (HU-03)."""
        from .models import Iniciativa
        now = timezone.now()
        conv = Convocatoria.objects.create(
            nombre="Convocatoria Abierta",
            fecha_apertura=now - timedelta(days=2),
            fecha_cierre=now + timedelta(days=10),
            estado="abierta",
        )
        iniciativa = Iniciativa.objects.create(
            convocatoria=conv,
            usuario=self.estudiante,
            nombre="Plataforma de IA",
            tipo="innovacion",
            origen_academico="asignatura",
            estado="pendiente"
        )

        # Coordinador aprueba iniciativa vía cambiar-estado
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_coordinador}")
        res = self.client.patch(
            f"/api/iniciativas/{iniciativa.id_iniciativa}/cambiar-estado/",
            {"estado": "aprobada"},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["estado"], "aprobada")

        iniciativa.refresh_from_db()
        self.assertEqual(iniciativa.estado, "aprobada")

        # Verificar notificación de felicitación al estudiante
        notif = NotificacionConvocatoria.objects.filter(usuario=self.estudiante, tipo="apertura").first()
        self.assertIsNotNone(notif)
        self.assertIn("Aprobada", notif.titulo)

    def test_estudiante_no_puede_autoaprobar_iniciativa(self):
        """Un estudiante NO tiene permiso para aprobar su propia iniciativa."""
        from .models import Iniciativa
        now = timezone.now()
        conv = Convocatoria.objects.create(
            nombre="Convocatoria Abierta",
            fecha_apertura=now - timedelta(days=2),
            fecha_cierre=now + timedelta(days=10),
            estado="abierta",
        )
        iniciativa = Iniciativa.objects.create(
            convocatoria=conv,
            usuario=self.estudiante,
            nombre="Proyecto Tramposo",
            tipo="emprendimiento",
            origen_academico="asignatura",
            estado="pendiente"
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")
        res = self.client.patch(
            f"/api/iniciativas/{iniciativa.id_iniciativa}/cambiar-estado/",
            {"estado": "aprobada"},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_estudiante_solo_puede_postular_una_vez_por_convocatoria(self):
        now = timezone.now()
        convocatoria_1 = Convocatoria.objects.create(
            nombre="Convocatoria 1",
            fecha_apertura=now - timedelta(days=1),
            fecha_cierre=now + timedelta(days=10),
            estado="abierta",
        )
        convocatoria_2 = Convocatoria.objects.create(
            nombre="Convocatoria 2",
            fecha_apertura=now - timedelta(days=1),
            fecha_cierre=now + timedelta(days=10),
            estado="abierta",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}")

        def payload(convocatoria):
            return {
                "convocatoria": convocatoria.id_convocatoria,
                "nombre": "Mi iniciativa",
                "descripcion": "Descripción de la iniciativa",
                "tipo": "emprendimiento",
                "origen_academico": "asignatura",
                "documento_adjunto": SimpleUploadedFile(
                    "documento.pdf",
                    b"%PDF-1.4 contenido de prueba",
                    content_type="application/pdf",
                ),
            }

        primera_respuesta = self.client.post(
            "/api/iniciativas/",
            payload(convocatoria_1),
            format="multipart",
        )
        self.assertEqual(
            primera_respuesta.status_code,
            status.HTTP_201_CREATED,
            primera_respuesta.data,
        )

        duplicada_respuesta = self.client.post(
            "/api/iniciativas/",
            payload(convocatoria_1),
            format="multipart",
        )
        self.assertEqual(duplicada_respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("convocatoria", duplicada_respuesta.data)
        self.assertEqual(
            Iniciativa.objects.filter(
                usuario=self.estudiante,
                convocatoria=convocatoria_1,
            ).count(),
            1,
        )

        otra_convocatoria_respuesta = self.client.post(
            "/api/iniciativas/",
            payload(convocatoria_2),
            format="multipart",
        )
        self.assertEqual(
            otra_convocatoria_respuesta.status_code,
            status.HTTP_201_CREATED,
        )

    def test_descarga_documento_de_iniciativa_como_adjunto(self):
        convocatoria = Convocatoria.objects.create(
            nombre="Convocatoria de prueba",
            fecha_apertura=timezone.now() - timedelta(days=1),
            fecha_cierre=timezone.now() + timedelta(days=10),
            estado="abierta",
        )
        iniciativa = Iniciativa.objects.create(
            convocatoria=convocatoria,
            usuario=self.estudiante,
            nombre="Iniciativa con PDF",
            descripcion="Prueba de descarga",
            tipo="innovacion",
            origen_academico="asignatura",
            detalle_origen="Sistemas Distribuidos",
        )
        DocumentoPostulacion.objects.create(
            iniciativa=iniciativa,
            nombre_original="propuesta.pdf",
            extension="pdf",
            tamano_bytes=15,
            archivo=SimpleUploadedFile(
                "propuesta.pdf",
                b"%PDF-1.4 prueba",
                content_type="application/pdf",
            ),
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.token_estudiante}"
        )

        response = self.client.get(
            f"/api/iniciativas/{iniciativa.id_iniciativa}/documento/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertIn("propuesta.pdf", response["Content-Disposition"])
        self.assertEqual(b"".join(response.streaming_content), b"%PDF-1.4 prueba")
