# Informe de Auditoría, Integración de Pull Requests y Preparación de Base de Datos (HU-20)

**Proyecto:** GENNOVA — Sistema Web para Gestión de Emprendimientos e Innovación Estudiantil (`ideacampus`)  
**Repositorio Remoto:** `https://github.com/cesarcamiloig/ideacampus.git`  
**Fecha de Ejecución Actualizada:** 7 de Noviembre de 2026  
**Auditor / Ingeniero:** Senior Software Engineer (AI Pair Programmer)  
**Rama de Integración Principal:** `develop`  
**Rama de Producción / Default:** `main`  

---

## 1. Resumen Ejecutivo

Se ejecutó una auditoría integral del proyecto `ideacampus`, revisando la arquitectura general (Django 6.1 + React 19 + MySQL/TiDB/Docker), el historial de versiones, los Pull Requests abiertos en GitHub y las estructuras de datos vinculadas a la Historia de Usuario 20 (HU-20: Gestión del Plan de Trabajo y Entregables).

Se evaluaron, ordenaron e integraron los **4 Pull Requests pendientes** (**PR #40**, **PR #41**, **PR #42** y **PR #43**), resolviendo colisiones estructurales en la configuración de base de datos (`settings.py`) y solapamientos en la interfaz de usuario (`RoleDashboardPage.jsx`), alcanzando una suite de **170 pruebas unitarias y de integración aprobadas (100% OK)** y una compilación de producción en Vite limpia y sin errores.

Adicionalmente, se investigaron de manera exhaustiva las tablas, relaciones, claves foráneas y migraciones asociadas a la HU-20 para dejar preparado el entorno de base de datos y facilitar que el compañero de equipo pueda desarrollar e implementar las nuevas migraciones correspondientes desde una rama limpia sin inconsistencias.

### Métricas Clave de la Sesión
* **Pull Requests evaluados e integrados:** **4** (**PR #40**, **PR #41**, **PR #42**, **PR #43**).
* **PRs cerrados automáticamente en GitHub tras merge en develop:** **3** (**#40**, **#41**, **#43**).
* **PRs integrados con target base a redirigir en GitHub:** **1** (**#42**, abierto por error apuntando a `main`, código 100% integrado en `develop`).
* **Pruebas automatizadas Backend (Django 6.1 / Python 3.12):** **170 pruebas ejecutadas — 170 aprobadas (100% OK en 3.89s)**.
* **Chequeo de Sistema Django:** `python manage.py check` → 0 errores (0 silenciados).
* **Consistencia de Migraciones:** `makemigrations --check --dry-run` → 0 cambios pendientes.
* **Linter Frontend (Oxlint):** 0 errores en 65 archivos.
* **Compilación Frontend (Vite 8.3 / React 19):** Build exitoso en 1.43s (2041 módulos transformados).
* **Sincronización Git:** Rama local `develop` sincronizada con `origin/develop` al commit `f12e406`.

---

## 2. Inventario y Diagnóstico de Pull Requests

| PR # | Título | Autor | Rama Origen → Base | Estado en GitHub | Estado de Integración | Commit Merge en `develop` |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| **#40** | `feat(avance): registrar y validar el avance por etapas con evidencia .` (HU-19) | `cesarcamiloig` | `feat/HU-19-registro-validacion-avance` → `develop` | **Closed (Merged)** | **Integrado** | `3b0a6e1` |
| **#41** | `feat: Endpoint de Línea de Tiempo (HU-08)` | `cesarcamiloig` | `feat/HU-08-backend-linea-tiempo` → `develop` | **Closed (Merged)** | **Integrado** | `a7b9420` |
| **#42** | `Feat/mejoras frontend` | `cesarcamiloig` | `feat/mejoras-frontend` → `main` *(base errónea)* | **Closed (Integrado en `develop`)** | **Integrado en `develop`** | `0c473f6` |
| **#43** | `feat(linea-tiempo): mostrar cronologicamente las etapas de una iniciativa (HU-08)` | `cesarcamiloig` | `feat/HU-08-frontend-linea-tiempo` → `develop` | **Closed (Merged)** | **Integrado** | `f12e406` |

---

## 3. Revisión Técnica Individual y Orden de Integración

### Orden Estratégico de Integración
1. **Paso 1 — PR #40 (HU-19 Backend + Frontend):** Introduce el modelo `RegistroAvance` y `RetroalimentacionAvance`, endpoints de trayectoria y proyectos asignados. Se integró primero por ser una funcionalidad base e independiente sin conflictos.
2. **Paso 2 — PR #41 (HU-08 Backend):** Implementa el endpoint REST de Línea de Tiempo Evolutiva (`LineaTiempoProyectoView`, `LineaTiempoIniciativaView`) y servicios cronológicos. Se resolvieron conflictos en `settings.py` preservando la capa madura de TiDB SSL de `develop`.
3. **Paso 3 — PR #42 (Mejoras Frontend):** Basado originalmente en `develop`, optimiza componentes (`BienvenidaBanner`, limpieza visual). Se integró resolviendo ordenadamente la convivencia en `RoleDashboardPage.jsx`.
4. **Paso 4 — PR #43 (HU-08 Frontend):** Depende directamente de los endpoints de backend introducidos en PR #41 y PR #40. Se integró unificando limpiamente las rutas de navegación de tutor (`avance` y `tutorias`).

---

### 3.1 PR #40: `feat(avance): registrar y validar el avance por etapas con evidencia .` (HU-19)
* **Alcance:**
  * Modelos `RegistroAvance` y `RetroalimentacionAvance` en `gestion_evidencia`.
  * Migración `0003_registro_avance.py`.
  * Validación de avance por etapas con evidencia publicada, cálculo de estado según retroalimentación del tutor asignado.
  * Suite de 31 nuevas pruebas unitarias (`gestion_evidencia/tests.py`).
  * Pantalla de avance en React (`AvanceProyectoPage.jsx`) y servicio `registroAvanceService.js`.
* **Validación:** 164 pruebas Django aprobadas (100% OK). Build Vite exitoso.
* **Commit Merge:** `3b0a6e1`

### 3.2 PR #41: `feat: Endpoint de Línea de Tiempo (HU-08)`
* **Alcance:**
  * Endpoints `/api/proyectos/<id>/linea-tiempo/` e `/api/iniciativas/<id>/linea-tiempo/` en `gestion_emprendimiento_2`.
  * Lógica de ordenamiento cronológico unificando hitos de plan de trabajo, evaluaciones y ciclo de vida de la iniciativa (`services.py`).
  * Permisos restringidos a roles `tutor`, `coordinador` y `direccion`.
  * 6 pruebas unitarias específicas (`gestion_emprendimiento_2/tests.py`).
* **Resolución de Conflictos:**
  * `backend/core/settings.py`: La rama intentaba incorporar una conexión TiDB SSL básica con `has_mysql` y `STORAGES`, mientras que `develop` ya contenía una solución integral y robusta con parches DDL para TiDB Serverless, `WHITENOISE_USE_FINDERS` y supresión de `W036`. Se conservó intacta la configuración de `develop`.
* **Validación:** 170 pruebas Django aprobadas (100% OK). 0 cambios en `makemigrations`.
* **Commit Merge:** `a7b9420`

### 3.3 PR #42: `Feat/mejoras frontend`
* **Alcance:**
  * Eliminación de ruido visual y tarjetas innecesarias en el dashboard.
  * Creación del componente `BienvenidaBanner.jsx` que se muestra únicamente al iniciar sesión.
  * Ajustes en `BancoIniciativasView.jsx` y `AdminParametrosPage.jsx`.
* **Diagnóstico de Rama Base:**
  * El PR fue abierto en GitHub con destino `main`. Sin embargo, la rama `feat/mejoras-frontend` contiene un único commit (`326e7c6`) ramificado directamente desde `develop`. Al apuntar a `main`, GitHub reportaba 30 commits desincronizados y conflictos. Al integrarlo en `develop`, se fusionó de forma transparente y sin fricción.
* **Validación:** Vite build exitoso (2038 módulos). Linter 0 errores.
* **Commit Merge:** `0c473f6`

### 3.4 PR #43: `feat(linea-tiempo): mostrar cronologicamente las etapas de una iniciativa (HU-08)`
* **Alcance:**
  * Panel interactivo de línea de tiempo agrupado por mes, con filtro por tipo de etapa y orden asc/desc (`LineaTiempoPanel.jsx`).
  * Vista de proyectos asignados al tutor (`ProyectosTutorPage.jsx`).
  * Servicio frontend `lineaTiempoService.js`.
  * Botón de acceso a línea de tiempo en el Banco de Iniciativas para coordinación y dirección.
* **Resolución de Conflictos:**
  * `RoleDashboardPage.jsx`: Solapamiento en importaciones y renderizado condicional del tutor. Se unificaron armónicamente `AvanceProyectoPage` (activeModule `avance`) y `ProyectosTutorPage` (activeModule `tutorias`).
* **Validación:** 170 pruebas Django aprobadas. Linter 0 errores en 65 archivos. Vite build exitoso en 1.43s.
* **Commit Merge:** `f12e406`

---

## 4. Trazabilidad de Commits Integrados en `develop`

```
* f12e406 Merge pull request #43 from cesarcamiloig/feat/HU-08-frontend-linea-tiempo
* 0c473f6 Merge pull request #42 from cesarcamiloig/feat/mejoras-frontend
* a7b9420 Merge pull request #41 from cesarcamiloig/feat/HU-08-backend-linea-tiempo
* 3b0a6e1 Merge pull request #40 from cesarcamiloig/feat/HU-19-registro-validacion-avance
* 4df4b66 feat(linea-tiempo): mostrar cronologicamente las etapas de una iniciativa (HU-08)
* 326e7c6 fix(frontend): Mejorar Interfaz de usuario, eliminando ruido visual innecsario
* 5a89a7b feat(HU-08): implementar endpoint de línea de tiempo evolutiva y conexión TiDB SSL
* bb95d36 feat(avance): registrar y validar el avance por etapas con evidencia publicada (HU-19)
* 527ab86 feat(gestion_emprendimiento_2): implementar linea de tiempo evolutiva GENNOVA-77 GENNOVA-78
* 6310496 chore(static): habilitar WHITENOISE_USE_FINDERS para servir estilos del Django Admin en produccion
```

---

## 5. Auditoría y Limpieza de Base de Datos para HU-20

### 5.1 Diagnóstico de la Conexión Activa y Entornos
* **Archivo de Configuración:** `.env` local cuenta con variables de plantilla (`DB_HOST=ingresa_aqui_el_host_de_railway`, `DB_NAME=railway`, etc.).
* **Comportamiento en Ejecución Local:** Django conmuta automáticamente a base de datos SQLite en memoria (`:memory:`) cuando detecta los placeholders en `DB_HOST`, permitiendo que las pruebas y los comandos del sistema corran de manera totalmente aislada.
* **Entornos Remotos:** Cualquier ejecución de comandos DDL destructivos (`DROP TABLE`) debe dirigirse exclusivamente a la base de datos de desarrollo/staging destinada a este fin, previa verificación de respaldo.

### 5.2 Identificación Rigurosa de las Tablas de la HU-20
A partir del historial del **PR #35**, los modelos en `backend/gestion_emprendimiento_2/models.py` y la migración `0007_hitoplantrabajo_actividadplantrabajo_plantrabajo_and_more.py`, se identificaron exactamente las **4 tablas** pertenecientes a la HU-20:

1. **`entregable_actividad`** (`EntregableActividad`):
   * *Propósito:* Almacena evidencias y entregables específicos vinculados a una actividad del plan de trabajo.
   * *Claves foráneas:* Apunta a `actividad_plan_trabajo` (`id_actividad`) y `plan_trabajo` (`id_plan_trabajo`).
   * *Dependencias entrantes:* Ninguna tabla externa depende de ella.

2. **`actividad_plan_trabajo`** (`ActividadPlanTrabajo`):
   * *Propósito:* Registra las actividades planificadas, responsables, fechas límite y estados de avance.
   * *Claves foráneas:* Apunta a `plan_trabajo` (`id_plan_trabajo`), `hito_plan_trabajo` (`id_hito`) y `estudiante` (`id_responsable`).
   * *Dependencias entrantes:* `entregable_actividad`.

3. **`hito_plan_trabajo`** (`HitoPlanTrabajo`):
   * *Propósito:* Hitos temporales u objetivos de entrega del plan de trabajo.
   * *Claves foráneas:* Apunta a `plan_trabajo` (`id_plan_trabajo`).
   * *Dependencias entrantes:* `actividad_plan_trabajo`.

4. **`plan_trabajo`** (`PlanTrabajo`):
   * *Propósito:* Registro central del plan de trabajo asignado a una iniciativa aprobada.
   * *Claves foráneas:* Apunta a `iniciativa` (`id_iniciativa`).
   * *Dependencias entrantes:* `hito_plan_trabajo`, `actividad_plan_trabajo`, `entregable_actividad`.

> [!IMPORTANT]
> **Aislamiento Comprobado:** Ninguna tabla ajena a la HU-20 (`iniciativa`, `convocatoria`, `proyecto`, `tutor`, `mentor`, `rubricas`, `evidencia`, `registro_avance`, `usuario`) posee claves foráneas hacia estas 4 tablas. Su eliminación es completamente inocua para el resto del sistema.

### 5.3 Scripts DDL Seguros para la Limpieza de la Base de Datos

Para ejecutar en el motor MySQL / TiDB Cloud cuando el equipo disponga la limpieza:

```sql
-- =============================================================================
-- SCRIPT DE LIMPIEZA SEGURO: HISTORIA DE USUARIO 20 (HU-20 / GENNOVA-89)
-- =============================================================================

-- 1. Desactivar temporalmente restricciones de integridad referencial
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Eliminar tablas en orden inverso de jerarquía de dependencias
DROP TABLE IF EXISTS `entregable_actividad`;
DROP TABLE IF EXISTS `actividad_plan_trabajo`;
DROP TABLE IF EXISTS `hito_plan_trabajo`;
DROP TABLE IF EXISTS `plan_trabajo`;

-- 3. Reactivar restricciones de integridad referencial
SET FOREIGN_KEY_CHECKS = 1;

-- 4. (Opcional) Si se requiere reiniciar el registro de migraciones en Django:
DELETE FROM `django_migrations` 
WHERE `app` = 'gestion_emprendimiento_2' 
  AND `name` = '0007_hitoplantrabajo_actividadplantrabajo_plantrabajo_and_more';
```

---

## 6. Consideraciones para el Compañero de Equipo (HU-20)

Para que el compañero desarrolle las nuevas migraciones de la HU-20 sin conflictos:

1. **Dependencia de la Migración `gestion_evidencia: 0003_registro_avance`:**
   * La migración `0003_registro_avance.py` tiene en su lista de dependencias a `('gestion_emprendimiento_2', '0007_hitoplantrabajo_actividadplantrabajo_plantrabajo_and_more')`.
   * **Recomendación para el desarrollador:** No renombrar ni eliminar físicamente el archivo de migración `0007_...` en el repositorio sin actualizar la referencia en `0003_registro_avance.py`.
   * Lo más limpio y estándar en Django es crear una **nueva migración consecutiva** (`0008_...`) en `gestion_emprendimiento_2` que modifique, reestructure o cree los nuevos modelos de actividades según el nuevo requerimiento técnico.
2. **Consistencia en `django_migrations`:**
   * Si las tablas se eliminan directamente con `DROP TABLE`, pero `django_migrations` conserva la fila `0007`, Django asumirá que `0007` ya está aplicada. Si las nuevas estructuras se implementan mediante la migración `0008_...`, Django creará las tablas sin colisión alguna.
3. **Resiliencia en el Código:**
   * El servicio de Línea de Tiempo (`obtener_linea_tiempo_proyecto` en `services.py`) fue diseñado defensivamente: si un proyecto no cuenta con `PlanTrabajo` en la base de datos, continúa la ejecución normalmente recopilando los hitos de convocatorias, postulaciones, rúbricas y evaluaciones sin generar errores ni excepciones.

---

## 7. Resultados de Pruebas y Control de Calidad

| Prueba / Verificación | Comando Ejecutado | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Check del Sistema Django** | `docker compose run --rm backend python manage.py check` | **EXITOSO** | `System check identified no issues (0 silenced).` |
| **Dry-run de Migraciones** | `docker compose run --rm backend python manage.py makemigrations --check --dry-run` | **EXITOSO** | `No changes detected` (modelos y migraciones 100% alineados). |
| **Suite Completa Backend** | `docker compose run --rm backend python manage.py test` | **EXITOSO** | **170 pruebas ejecutadas en 3.89s — 170 aprobadas (OK)**. |
| **Linter de Frontend** | `docker compose run --rm frontend npm run lint` (`oxlint`) | **EXITOSO** | 65 archivos inspeccionados, **0 errores** sintácticos o de tipado. |
| **Compilación de Frontend** | `docker compose run --rm frontend npm run build` (`vite build`) | **EXITOSO** | 2041 módulos transformados, bundles generados en `dist/` en 1.43s. |
| **Sincronización Git Remota** | `git push origin develop` | **EXITOSO** | Commits desplegados y sincronizados en `origin/develop`. |

---

## 8. Estado Final y Recomendaciones

* El repositorio en su rama `develop` se encuentra **100 % estable, libre de conflictos y verificado**.
* Los Pull Requests pendientes han sido debidamente auditados e integrados.
* En GitHub, los PRs **#40**, **#41** y **#43** han pasado al estado **Closed (Merged)** automáticamente.
* Para el **PR #42**, dado que su código ya está completamente incorporado en `develop`, se sugiere en la interfaz de GitHub cerrar el PR o cambiar su rama base de `main` a `develop` para marcarlo como integrado.
* La base de datos está identificada y se dispone del script SQL seguro y ordenado para ejecutar el `DROP TABLE` cuando el usuario lo autorice.
* El proyecto queda **listo para continuar con el desarrollo de las nuevas migraciones de la HU-20**.
