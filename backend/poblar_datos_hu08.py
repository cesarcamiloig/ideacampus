"""
Script para generar datos de prueba válidos para la HU-08 (Línea de Tiempo Evolutiva).
Ejecutable en `python manage.py shell` o de forma directa `python poblar_datos_hu08.py`.
"""
import os
import sys
from datetime import date, timedelta
from django.utils import timezone

# Configuración inicial para ejecución directa fuera del shell
if __name__ == "__main__" and not os.environ.get("DJANGO_SETTINGS_MODULE"):
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    import django
    django.setup()

from django.db import connection, transaction
from gestion_administrativa.models import Usuario, Rol, UsuarioRol, PeriodoAcademico
from gestion_administrativa.jwt_utils import generar_token
from gestion_acompaniamiento.models import Tutor
from gestion_convocatorias.models import Convocatoria, Iniciativa
from gestion_emprendimiento_2.models import (
    Estudiante,
    EquipoEmprendedor,
    Proyecto,
    PlanTrabajo,
    HitoPlanTrabajo,
    ActividadPlanTrabajo,
    EntregableActividad,
)


def asegurar_esquema_tablas():
    """
    Garantiza que las tablas relacionales de HU-08 (PlanTrabajo, HitoPlanTrabajo,
    ActividadPlanTrabajo y EntregableActividad) existan con los campos requeridos
    por los modelos del proyecto (evitando desalineaciones de esquema en bases compartidas).
    """
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES LIKE 'plan_trabajo'")
        table_exists = cursor.fetchone()
        has_id_iniciativa = False
        if table_exists:
            cursor.execute("SHOW COLUMNS FROM `plan_trabajo` LIKE 'id_iniciativa'")
            has_id_iniciativa = cursor.fetchone() is not None

        if not has_id_iniciativa:
            print("[*] Verificando y ajustando esquema de tablas para HU-08...")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            cursor.execute("DROP TABLE IF EXISTS `entregable_actividad`")
            cursor.execute("DROP TABLE IF EXISTS `actividad_plan_trabajo`")
            cursor.execute("DROP TABLE IF EXISTS `hito_plan_trabajo`")
            cursor.execute("DROP TABLE IF EXISTS `plan_trabajo`")

            cursor.execute("""
                CREATE TABLE `plan_trabajo` (
                    `id_plan_trabajo` integer AUTO_INCREMENT NOT NULL PRIMARY KEY,
                    `titulo` varchar(200) NOT NULL,
                    `descripcion` longtext NULL,
                    `estado` varchar(30) NOT NULL,
                    `fecha_inicio` date NULL,
                    `fecha_fin` date NULL,
                    `fecha_creacion` datetime(6) NOT NULL,
                    `fecha_actualizacion` datetime(6) NOT NULL,
                    `id_iniciativa` integer NOT NULL UNIQUE,
                    CONSTRAINT `fk_plan_iniciativa` FOREIGN KEY (`id_iniciativa`) REFERENCES `iniciativa` (`id_iniciativa`)
                )
            """)

            cursor.execute("""
                CREATE TABLE `hito_plan_trabajo` (
                    `id_hito` integer AUTO_INCREMENT NOT NULL PRIMARY KEY,
                    `nombre` varchar(150) NOT NULL,
                    `descripcion` longtext NULL,
                    `fecha_limite` date NULL,
                    `orden` smallint UNSIGNED NOT NULL,
                    `completado` bool NOT NULL,
                    `fecha_completado` datetime(6) NULL,
                    `id_plan_trabajo` integer NOT NULL,
                    CONSTRAINT `fk_hito_plan` FOREIGN KEY (`id_plan_trabajo`) REFERENCES `plan_trabajo` (`id_plan_trabajo`)
                )
            """)

            cursor.execute("""
                CREATE TABLE `actividad_plan_trabajo` (
                    `id_actividad` integer AUTO_INCREMENT NOT NULL PRIMARY KEY,
                    `nombre` varchar(200) NOT NULL,
                    `descripcion` longtext NULL,
                    `fecha_inicio` date NULL,
                    `fecha_fin` date NULL,
                    `prioridad` varchar(20) NOT NULL,
                    `estado` varchar(30) NOT NULL,
                    `fecha_creacion` datetime(6) NOT NULL,
                    `fecha_actualizacion` datetime(6) NOT NULL,
                    `id_responsable` integer NULL,
                    `id_hito` integer NULL,
                    `id_plan_trabajo` integer NOT NULL,
                    CONSTRAINT `fk_act_plan` FOREIGN KEY (`id_plan_trabajo`) REFERENCES `plan_trabajo` (`id_plan_trabajo`),
                    CONSTRAINT `fk_act_hito` FOREIGN KEY (`id_hito`) REFERENCES `hito_plan_trabajo` (`id_hito`),
                    CONSTRAINT `fk_act_resp` FOREIGN KEY (`id_responsable`) REFERENCES `estudiante_emprendedor` (`id_estudiante`)
                )
            """)

            cursor.execute("""
                CREATE TABLE `entregable_actividad` (
                    `id_entregable` integer AUTO_INCREMENT NOT NULL PRIMARY KEY,
                    `nombre` varchar(200) NOT NULL,
                    `descripcion` longtext NULL,
                    `fecha_limite` date NULL,
                    `tipo` varchar(50) NOT NULL,
                    `url_archivo` varchar(100) NULL,
                    `enlace` varchar(500) NULL,
                    `estado` varchar(30) NOT NULL,
                    `observaciones` longtext NULL,
                    `fecha_entrega` datetime(6) NULL,
                    `fecha_creacion` datetime(6) NOT NULL,
                    `id_actividad` integer NOT NULL,
                    `id_plan_trabajo` integer NOT NULL,
                    CONSTRAINT `fk_ent_act` FOREIGN KEY (`id_actividad`) REFERENCES `actividad_plan_trabajo` (`id_actividad`),
                    CONSTRAINT `fk_ent_plan` FOREIGN KEY (`id_plan_trabajo`) REFERENCES `plan_trabajo` (`id_plan_trabajo`)
                )
            """)

            cursor.execute("""
                DELETE FROM `django_migrations`
                WHERE `app` = 'gestion_emprendimiento_2'
                AND `name` IN (
                    '0008_remove_entregableactividad_actividad_and_more',
                    '0009_actividad',
                    '0010_plantrabajo_actividad_plan_trabajo'
                )
            """)
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            print("[✓] Tablas de PlanTrabajo y HitoPlanTrabajo sincronizadas con el modelo.")


def poblar_datos():
    print("=" * 70)
    print("Iniciando generación de datos de prueba para HU-08 (Línea de Tiempo)...")
    print("=" * 70)

    # 1. Asegurar esquema de base de datos
    asegurar_esquema_tablas()

    with transaction.atomic():
        # ------------------------------------------------------------------
        # 2. ROLES DEL SISTEMA
        # ------------------------------------------------------------------
        rol_coordinador, _ = Rol.objects.get_or_create(
            nombre_rol="coordinador",
            defaults={"descripcion": "Coordinador de Emprendimiento"}
        )
        rol_estudiante, _ = Rol.objects.get_or_create(
            nombre_rol="estudiante",
            defaults={"descripcion": "Estudiante Emprendedor"}
        )
        rol_tutor, _ = Rol.objects.get_or_create(
            nombre_rol="tutor",
            defaults={"descripcion": "Tutor Académico"}
        )
        print("[✓] Roles validados: coordinador, estudiante, tutor.")

        # ------------------------------------------------------------------
        # 3. USUARIOS Y ASIGNACIÓN DE ROLES (USUARIOROL)
        # ------------------------------------------------------------------
        # Usuario Coordinador
        coordinador, _ = Usuario.objects.get_or_create(
            correo="coordinador.pruebas@ufps.edu.co",
            defaults={
                "nombre": "Farid Coordinador",
                "google_id": "gid_coordinador_hu08_999",
                "estado": "activo",
            }
        )
        UsuarioRol.objects.get_or_create(
            usuario=coordinador,
            rol=rol_coordinador,
            defaults={"estado": "activo"}
        )

        # Usuario Estudiante Líder
        estudiante_user, _ = Usuario.objects.get_or_create(
            correo="estudiante.lider@ufps.edu.co",
            defaults={
                "nombre": "Laura Camila Gómez",
                "google_id": "gid_estudiante_hu08_101",
                "estado": "activo",
            }
        )
        UsuarioRol.objects.get_or_create(
            usuario=estudiante_user,
            rol=rol_estudiante,
            defaults={"estado": "activo"}
        )

        # Perfil de Estudiante Emprendedor
        estudiante, _ = Estudiante.objects.get_or_create(
            usuario=estudiante_user,
            defaults={
                "codigo": "1152001",
                "semestre": 8,
            }
        )

        # Usuario Tutor Académico
        tutor_user, _ = Usuario.objects.get_or_create(
            correo="tutor.academico@ufps.edu.co",
            defaults={
                "nombre": "Dr. Carlos Silva",
                "google_id": "gid_tutor_hu08_202",
                "estado": "activo",
            }
        )
        UsuarioRol.objects.get_or_create(
            usuario=tutor_user,
            rol=rol_tutor,
            defaults={"estado": "activo"}
        )

        # Perfil de Tutor
        tutor, _ = Tutor.objects.get_or_create(
            usuario=tutor_user,
            defaults={
                "area_conocimiento": "Ingeniería de Software e IoT",
                "nivel_academico": "maestria",
                "anios_experiencia": 10,
                "estado": "activo",
            }
        )
        print("[✓] Usuarios y perfiles creados/validados:")
        print(f"    - Coordinador: {coordinador.nombre} ({coordinador.correo})")
        print(f"    - Estudiante Líder: {estudiante_user.nombre} ({estudiante_user.correo})")
        print(f"    - Tutor: {tutor_user.nombre} ({tutor_user.correo})")

        # ------------------------------------------------------------------
        # 4. PERIODO ACADÉMICO
        # ------------------------------------------------------------------
        periodo = PeriodoAcademico.objects.filter(es_vigente=True).first()
        if not periodo:
            periodo, _ = PeriodoAcademico.objects.get_or_create(
                id_periodo="2026-1",
                defaults={
                    "anio": 2026,
                    "semestre": "1",
                    "nombre": "Periodo Académico 2026-1",
                    "fecha_inicio": date(2026, 2, 1),
                    "fecha_fin": date(2026, 7, 1),
                    "es_vigente": True,
                    "estado": "activo",
                }
            )
        print(f"[✓] Periodo Académico: {periodo.nombre} ({periodo.id_periodo})")

        # ------------------------------------------------------------------
        # 5. CONVOCATORIA
        # ------------------------------------------------------------------
        ahora = timezone.now()
        convocatoria, _ = Convocatoria.objects.get_or_create(
            nombre="Convocatoria Innovación y Emprendimiento 2026",
            defaults={
                "descripcion": "Convocatoria para iniciativas de emprendimiento de base tecnológica e innovación abierta.",
                "categoria": "Tecnología e Innovación",
                "requisitos_documentacion": "Propuesta técnica en formato PDF y esquema de negocio.",
                "criterios_evaluacion": "Viabilidad técnica, escalabilidad y grado de innovación.",
                "fecha_apertura": ahora - timedelta(days=30),
                "fecha_cierre": ahora + timedelta(days=60),
                "estado": "abierta",
                "creador": coordinador,
                "periodo": periodo,
            }
        )
        print(f"[✓] Convocatoria: #{convocatoria.id_convocatoria} - {convocatoria.nombre}")

        # ------------------------------------------------------------------
        # 6. INICIATIVA
        # ------------------------------------------------------------------
        iniciativa, _ = Iniciativa.objects.get_or_create(
            nombre="Sistema de Monitoreo IoT para Cultivos",
            defaults={
                "convocatoria": convocatoria,
                "usuario": estudiante_user,
                "descripcion": "Red de sensores inteligentes y telemetría para la optimización de riego agrícola.",
                "tipo": "emprendimiento",
                "origen_academico": "integrador",
                "detalle_origen": "Proyecto Integrador de Análisis y Diseño de Sistemas",
                "sector_tecnologico": "AgTech / IoT",
                "etapa_actual": "Prototipo Validado",
                "estado": "aprobada",
            }
        )
        print(f"[✓] Iniciativa: #{iniciativa.id_iniciativa} - {iniciativa.nombre}")

        # ------------------------------------------------------------------
        # 7. EQUIPO EMPRENDEDOR
        # ------------------------------------------------------------------
        equipo, _ = EquipoEmprendedor.objects.get_or_create(
            estudiante_lider=estudiante,
            defaults={
                "nombre_equipo": "AgroTech UFPS",
                "iniciativa": iniciativa,
            }
        )
        if estudiante.equipo != equipo:
            estudiante.equipo = equipo
            estudiante.save(update_fields=["equipo"])
        print(f"[✓] Equipo Emprendedor: #{equipo.id_equipo} - {equipo.nombre_equipo}")

        # ------------------------------------------------------------------
        # 8. PROYECTO FORMALIZADO
        # ------------------------------------------------------------------
        proyecto, _ = Proyecto.objects.get_or_create(
            iniciativa=iniciativa,
            defaults={
                "nombre_proyecto": iniciativa.nombre,
                "descripcion": iniciativa.descripcion,
                "coordinador": coordinador,
                "tutor": tutor,
                "estado": Proyecto.Estado.ACTIVO,
            }
        )
        if proyecto.coordinador != coordinador or proyecto.tutor != tutor:
            proyecto.coordinador = coordinador
            proyecto.tutor = tutor
            proyecto.save(update_fields=["coordinador", "tutor"])
        print(f"[✓] Proyecto: #{proyecto.id_proyecto} - {proyecto.nombre_proyecto}")

        # ------------------------------------------------------------------
        # 9. PLAN DE TRABAJO (HU-20)
        # ------------------------------------------------------------------
        hoy = ahora.date()
        plan, _ = PlanTrabajo.objects.get_or_create(
            iniciativa=iniciativa,
            defaults={
                "titulo": "Plan de Trabajo 2026 - AgroTech IoT",
                "descripcion": "Ruta de ejecución técnica, desarrollo de prototipo y validaciones en campo.",
                "estado": PlanTrabajo.Estado.EN_PROGRESO,
                "fecha_inicio": hoy - timedelta(days=25),
                "fecha_fin": hoy + timedelta(days=95),
            }
        )
        print(f"[✓] Plan de Trabajo: #{plan.id_plan_trabajo} - {plan.titulo}")

        # ------------------------------------------------------------------
        # 10. HITOS DEL PLAN DE TRABAJO (HU-08 / HU-20)
        # ------------------------------------------------------------------
        # Hito 1: Completado
        hito1, _ = HitoPlanTrabajo.objects.get_or_create(
            plan_trabajo=plan,
            orden=1,
            defaults={
                "nombre": "Hito 1: Diseño de Arquitectura y Selección de Sensores",
                "descripcion": "Especificación de microcontroladores ESP32 y sensores de humedad capacitivos.",
                "fecha_limite": hoy - timedelta(days=10),
                "completado": True,
                "fecha_completado": ahora - timedelta(days=9),
            }
        )

        # Actividad y entregable para Hito 1
        act1, _ = ActividadPlanTrabajo.objects.get_or_create(
            plan_trabajo=plan,
            hito=hito1,
            nombre="Diseño de esquemáticos y diagrama de bloques",
            defaults={
                "responsable": estudiante,
                "descripcion": "Diseño en software CAD del módulo de alimentación solar y telemetría.",
                "prioridad": ActividadPlanTrabajo.Prioridad.ALTA,
                "estado": ActividadPlanTrabajo.Estado.COMPLETADA,
                "fecha_inicio": hoy - timedelta(days=20),
                "fecha_fin": hoy - timedelta(days=10),
            }
        )
        EntregableActividad.objects.get_or_create(
            actividad=act1,
            plan_trabajo=plan,
            nombre="Documento de Arquitectura y Esquemáticos de Sensores",
            defaults={
                "tipo": "documento",
                "estado": EntregableActividad.Estado.APROBADO,
                "observaciones": "Esquemáticos aprobados tras revisión técnica.",
                "fecha_entrega": ahora - timedelta(days=9),
            }
        )

        # Hito 2: En progreso
        hito2, _ = HitoPlanTrabajo.objects.get_or_create(
            plan_trabajo=plan,
            orden=2,
            defaults={
                "nombre": "Hito 2: Ensamblaje de Prototipo y Pruebas en Laboratorio",
                "descripcion": "Montaje de circuito impreso y calibración de curvas de absorción de agua.",
                "fecha_limite": hoy + timedelta(days=20),
                "completado": False,
                "fecha_completado": None,
            }
        )
        act2, _ = ActividadPlanTrabajo.objects.get_or_create(
            plan_trabajo=plan,
            hito=hito2,
            nombre="Calibración y pruebas de transmisión de datos LoRa",
            defaults={
                "responsable": estudiante,
                "descripcion": "Pruebas de rango de transmisión y tolerancia al ruido ambiental.",
                "prioridad": ActividadPlanTrabajo.Prioridad.ALTA,
                "estado": ActividadPlanTrabajo.Estado.EN_PROGRESO,
                "fecha_inicio": hoy - timedelta(days=5),
                "fecha_fin": hoy + timedelta(days=15),
            }
        )
        EntregableActividad.objects.get_or_create(
            actividad=act2,
            plan_trabajo=plan,
            nombre="Informe de Calibración Preliminar",
            defaults={
                "tipo": "documento",
                "estado": EntregableActividad.Estado.ENTREGADO,
                "observaciones": "Primer lote de pruebas satisfactorio con precisión del 96%.",
                "fecha_entrega": ahora - timedelta(days=2),
            }
        )

        # Hito 3: Pendiente
        hito3, _ = HitoPlanTrabajo.objects.get_or_create(
            plan_trabajo=plan,
            orden=3,
            defaults={
                "nombre": "Hito 3: Validación en Parcela Piloto y Pitch Final",
                "descripcion": "Despliegue de nodos en parcela de prueba y entrega de informe final al comité.",
                "fecha_limite": hoy + timedelta(days=70),
                "completado": False,
                "fecha_completado": None,
            }
        )
        print("[✓] Hitos del Plan de Trabajo creados exitosamente:")
        print(f"    - #{hito1.id_hito} {hito1.nombre} (Completado: {hito1.completado})")
        print(f"    - #{hito2.id_hito} {hito2.nombre} (Completado: {hito2.completado})")
        print(f"    - #{hito3.id_hito} {hito3.nombre} (Completado: {hito3.completado})")

        # ------------------------------------------------------------------
        # 11. GENERACIÓN DE TOKEN JWT PARA COORDINADOR
        # ------------------------------------------------------------------
        token_coordinador = generar_token(coordinador, "coordinador")

    # ------------------------------------------------------------------
    # IMPRESIÓN CLARA PARA POSTMAN
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("DATOS GENERADOS LISTOS PARA PROBAR EN POSTMAN")
    print("=" * 70)
    print(f"ID_PROYECTO: {proyecto.id_proyecto}")
    print(f"ID_INICIATIVA: {iniciativa.id_iniciativa}")
    print("\nTOKEN JWT (Rol: coordinador):")
    print(token_coordinador)
    print("\n" + "-" * 70)
    print("INSTRUCCIONES PARA POSTMAN:")
    print("1. Método: GET")
    print(f"2. URL del Proyecto:   http://localhost:8000/api/proyectos/{proyecto.id_proyecto}/linea-tiempo/")
    print(f"3. URL de Iniciativa:  http://localhost:8000/api/iniciativas/{iniciativa.id_iniciativa}/linea-tiempo/")
    print("4. En la pestaña 'Headers':")
    print("   Key:   Authorization")
    print(f"   Value: Bearer {token_coordinador}")
    print("=" * 70 + "\n")

    return {
        "id_proyecto": proyecto.id_proyecto,
        "id_iniciativa": iniciativa.id_iniciativa,
        "token_coordinador": token_coordinador,
    }


if __name__ == "__main__":
    poblar_datos()
