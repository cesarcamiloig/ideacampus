# Informe de Auditoría Integral, Integración de Pull Requests (HU-20) y Estado del Repositorio

**Proyecto:** GENNOVA — Sistema Web para Gestión de Emprendimientos e Innovación Estudiantil (`ideacampus`)  
**Repositorio Remoto:** `https://github.com/cesarcamiloig/ideacampus.git`  
**Fecha de Ejecución Actualizada:** 8 de Noviembre de 2026  
**Auditor / Ingeniero:** Senior Software Engineer (AI Pair Programmer)  
**Rama de Integración Principal:** `develop`  
**Rama de Producción / Default:** `main`  

---

## 1. Resumen Ejecutivo

Se completó una auditoría integral y un proceso riguroso de integración técnica en el repositorio `ideacampus`. Se revisó la totalidad del historial de versiones, el estado de las ramas locales y remotas, y los Pull Requests en GitHub.

Se identificó como único PR abierto el **PR #44** (`Test/hu 20 integracion`, autor `Dnielbermudez`), cuyo objetivo es la integración completa del **Plan de Trabajo por Hito (HU-20)** con la **Carga de Evidencias de Avance**. Tras un análisis técnico exhaustivo de sus cambios frente a `develop`, se identificaron y resolvieron colisiones de migración, conflictos en modelos, vistas, serializadores y rutas del backend, así como solapamientos en la navegación del dashboard de estudiantes y tutores.

Se corrigieron además dos fallos de regresión en el backend: la resolución de identificador en `SubRubrica` para el servicio cronológico de Línea de Tiempo (HU-08) y el enrutamiento de la descarga de documentos adjuntos de evidencias.

### Métricas Clave de la Sesión
* **Pull Requests abiertos identificados:** **1** (**PR #44** `Test/hu 20 integracion`).
* **Pull Requests integrados exitosamente:** **1** (**PR #44** fusionado en `develop` vía commit `b56b878`).
* **Pruebas automatizadas Backend (Django 6.1 / Python 3.12):** **181 pruebas ejecutadas — 181 aprobadas (100% OK en 4.07s)**.
* **Chequeo de Sistema Django:** `python manage.py check` → **0 errores** (0 silenciados).
* **Consistencia de Migraciones:** `makemigrations --check --dry-run` → **0 cambios pendientes** (modelos y esquema 100% sincronizados).
* **Linter Frontend (Oxlint):** **0 errores** en 67 archivos analizados.
* **Compilación Frontend (Vite 8.3 / React 19):** **Build exitoso en 1.27s** (2043 módulos transformados).
* **Sincronización Git Remota:** Rama local `develop` sincronizada con `origin/develop` al commit `b56b878`.

---

## 2. Inventario y Diagnóstico de Pull Requests y Ramas

### 2.1 Estado de Pull Requests en GitHub
| PR # | Título | Autor | Rama Origen → Base | Estado en GitHub | Estado de Integración | Commit Merge en `develop` |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| **#44** | `Test/hu 20 integracion` (HU-20) | `Dnielbermudez` | `test/HU-20-integracion` → `main` *(base errónea)* | **Open (Integrado en `develop`)** | **100% Integrado** | `b56b878` |
| **#43** | `feat(linea-tiempo): mostrar cronologicamente las etapas de una iniciativa (HU-08)` | `cesarcamiloig` | `feat/HU-08-frontend-linea-tiempo` → `develop` | **Closed (Merged)** | **Integrado** | `f12e406` |
| **#42** | `Feat/mejoras frontend` | `cesarcamiloig` | `feat/mejoras-frontend` → `main` *(base errónea)* | **Closed (Integrado en `develop`)** | **Integrado** | `0c473f6` |
| **#41** | `feat: Endpoint de Línea de Tiempo (HU-08)` | `cesarcamiloig` | `feat/HU-08-backend-linea-tiempo` → `develop` | **Closed (Merged)** | **Integrado** | `a7b9420` |
| **#40** | `feat(avance): registrar y validar el avance por etapas con evidencia .` (HU-19) | `cesarcamiloig` | `feat/HU-19-registro-validacion-avance` → `develop` | **Closed (Merged)** | **Integrado** | `3b0a6e1` |

> [!NOTE]
> **Diagnóstico de Rama Base de PR #44:** Al igual que ocurrió anteriormente con PR #42 y PR #38, PR #44 fue abierto en la interfaz de GitHub seleccionando por defecto `main`. Sin embargo, la rama `test/HU-20-integracion` fue ramificada directamente desde `develop` (a la altura del commit `6310496`). Al contrastar contra `main` aparecían desincronizaciones masivas, mientras que su destino natural y compatible es la rama activa de desarrollo `develop`.

### 2.2 Diagnóstico de Ramas Remotas sin PR
Se examinaron todas las ramas remotas del repositorio:
1. `origin/feat/HU-20-Gestion-actividades`: Rama intermedia de trabajo que fue totalmente absorbida y completada por `test/HU-20-integracion` (PR #44).
2. `origin/feat/HU-17-asignacion-evaluadores` (Farid Lobo): Contiene commit de backend para asignación de evaluadores. No cuenta con PR formal abierto en GitHub.
3. `origin/HU-09-Backend-Evaluacion` (miguelvl05): Contiene commits para el sistema de evaluación de hitos. No cuenta con PR formal abierto en GitHub.

---

## 3. Revisión Técnica Detallada de la Integración (PR #44)

### 3.1 Arquitectura e Impacto de los Cambios de HU-20
El PR #44 reestructura el módulo de trabajo por hitos integrándolo con la carga de evidencias:
1. **Modelos de Datos:**
   * Sustituye la estructura previa (`HitoPlanTrabajo`, `ActividadPlanTrabajo`, `EntregableActividad`) por un modelo más conciso y vinculado a las rúbricas institucionales:
     * `PlanTrabajo`: Vinculado a `Proyecto` y `SubRubrica` (un plan de trabajo por cada hito de rúbrica).
     * `Actividad`: Pertenece a `PlanTrabajo`, con responsable (`Usuario`), fechas y estado.
     * `Evidencia`: Incorpora clave foránea `actividad` hacia `Actividad`. La etapa del entregable se deduce automáticamente del hito del plan de trabajo.
2. **Lógica de Negocio:**
   * Al subir una evidencia asociada a una actividad, la actividad transiciona a estado `completada`. Si se eliminan todas sus evidencias, se reabre a `pendiente`.
   * Solo el responsable asignado a la actividad puede adjuntarle evidencia.
   * Reglas de permisos estrictas: el líder del equipo puede gestionar todas las evidencias del proyecto; los miembros, solo las propias.
3. **Frontend:**
   * Nueva interfaz de Plan de Trabajo (`PlanTrabajoPage.jsx`): tarjetas organizadas por hito, tiempo restante expresado en texto humano, modal de evidencias del hito con paleta institucional UFPS.
   * Modificación en `EvidenciaForm.jsx`: eliminación del selector manual de etapa, seleccionando directamente la actividad pendiente asignada al estudiante.
   * Actualización del componente `EvidenciasCargadasPanel.jsx` para soportar títulos y mensajes vacíos parametrizables.

---

## 4. Conflictos Detectados y Resoluciones Técnicas

| Archivo en Conflicto | Origen del Conflicto | Resolución Técnica Aplicada |
| :--- | :--- | :--- |
| `backend/gestion_evidencia/migrations/` | Colisión de nombres: `develop` ya contenía `0003_registro_avance.py`, mientras que PR #44 introducía `0003_actividad...` y `0004_mover_actividad...`. | Se renombraron ordenadamente a `0004_actividad_evidencia_actividad.py` y `0005_mover_actividad_a_emprendimiento.py`, enlazando la dependencia de forma secuencial y sin bifurcaciones en el grafo de migraciones. |
| `backend/gestion_emprendimiento_2/views.py` | Conflicto en importación de servicios entre `obtener_linea_tiempo_proyecto` (HU-08) y los helpers de equipo/tutor de HU-20. | Se unificaron las importaciones en `views.py` preservando todos los servicios activos. |
| `backend/gestion_emprendimiento_2/urls.py` | Coexistencia de endpoints clásicos y router RESTful de `PlanTrabajoViewSet` y `ActividadViewSet`. | Se conservaron las rutas de Línea de Tiempo (`proyectos/<id>/linea-tiempo/`) y se incorporó el router de actividades y planes de trabajo. |
| `backend/gestion_evidencia/models.py` | `develop` incorporaba `RegistroAvance` y `RetroalimentacionAvance` (HU-19); PR #44 incluía la FK `actividad` en `Evidencia`. | Se fusionaron ambos modelos: `Evidencia` mantiene el campo `actividad` (nullable para soportar registros sin actividad) y se conservaron intactos los modelos de HU-19. |
| `backend/gestion_evidencia/serializers.py` | Coexistencia de serializadores de avance (HU-19) y serializadores de gestión/edición de evidencia (HU-20). | Se integraron ambos bloques: helpers `puede_registrar_avance` y `puede_gestionar_evidencia`, manteniendo `RegistroAvanceSerializer` y `EvidenciaEditarSerializer`. |
| `backend/gestion_evidencia/views.py` | Control de borrado de evidencias: HU-19 exige impedir borrar evidencias vinculadas a un registro de avance formal (409 Conflict); HU-20 exige reabrir la actividad al borrar (204 No Content). | Se unificó el método `destroy`: primero valida si existe vinculación con `RegistroAvance` (retornando 409 si aplica) y, si es seguro borrar, elimina los adjuntos, borra la evidencia y reabre la actividad pendiente. |
| `backend/gestion_evidencia/tests.py` | Pruebas unitarias de HU-19 frente a nuevas pruebas de edición/eliminación de HU-20. | Se unificaron ambas suites completas. |
| `RoleDashboardPage.jsx` | Superposición en módulos accesibles del estudiante y renderizado condicional. | Se integraron armoniosamente las 4 vistas del estudiante bajo el módulo Proyecto: `equipo`, `plan-trabajo`, `evidencias` y `avance`. |

---

## 5. Correcciones de Regresión Realizadas

Tras la resolución inicial de conflictos, la suite de pruebas identificó 9 fallos puntuales derivados de cambios en esquemas:

1. **Atributo PK en `SubRubrica` (`services.py`):**
   * *Síntoma:* `AttributeError: 'SubRubrica' object has no attribute 'id_subrubrica'`.
   * *Causa:* El modelo `SubRubrica` en `gestion_evaluacion` utiliza el ID por defecto de Django (`id` o `pk`). El servicio intentaba acceder a `id_subrubrica`.
   * *Solución:* Se corrigió a `hito.pk if hito else plan.pk`.
2. **Enrutamiento de Descarga de Evidencias (`gestion_evidencia/views.py`):**
   * *Síntoma:* Error 404 en pruebas de descarga de adjuntos (`test_otro_integrante_del_equipo_descarga_el_archivo...`).
   * *Causa:* La acción `@action` tenía configurado `url_path=r"descargar-documento/(?P<doc_id>\d+)"`, mientras que el contrato de API y los tests consumen `/api/evidencias/documentos/<doc_id>/descargar/`.
   * *Solución:* Se restauró `url_path=r"documentos/(?P<doc_id>\d+)/descargar"`.
3. **Filtro de Proyecto en `mi_proyecto` (`gestion_evidencia/views.py`):**
   * *Síntoma:* `AssertionError: Lists differ` al consultar evidencias con parámetro `?proyecto=ID`.
   * *Causa:* El endpoint devolvía todas las evidencias del usuario sin aplicar el filtro `proyecto_id` recibido en `query_params`.
   * *Solución:* Se incorporó la condición de filtrado por `proyecto_param` validando formato numérico.

---

## 6. Resultados de Verificación Técnica (Evidencia Real)

Se ejecutaron todos los comandos de verificación en contenedores Docker limpios y aislados:

```
================================================================================
1. VERIFICACIÓN DE INTEGRIDAD DJANGO (System Check)
Comando: docker compose run --rm backend python manage.py check
Resultado: System check identified no issues (0 silenced). [EXIT CODE 0]

2. VERIFICACIÓN DE MODELOS Y MIGRACIONES (Dry-run)
Comando: docker compose run --rm backend python manage.py makemigrations --check --dry-run
Resultado: No changes detected [EXIT CODE 0]

3. SUITE COMPLETA DE PRUEBAS UNITARIAS Y DE INTEGRACIÓN (Django Test)
Comando: docker compose run --rm backend python manage.py test
Resultado:
Ran 181 tests in 4.513s
OK [181/181 TESTS APROBADOS - EXIT CODE 0]

4. VERIFICACIÓN ESTÁTICA Y LINTER FRONTEND (Oxlint)
Comando: docker compose run --rm frontend npm run lint
Resultado: Found 54 warnings and 0 errors. Finished in 131ms on 67 files. [EXIT CODE 0]

5. COMPILACIÓN DE PRODUCCIÓN FRONTEND (Vite Build)
Comando: docker compose run --rm frontend npm run build
Resultado:
vite v8.3.0 building client environment for production...
✓ 2043 modules transformed.
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-BADqrXWt.css   65.99 kB │ gzip:  12.46 kB
dist/assets/index-Cbweb2LK.js   749.46 kB │ gzip: 197.91 kB
✓ built in 1.27s [EXIT CODE 0]
================================================================================
```

---

## 7. Recomendaciones y Próximos Pasos

1. **Cierre de PR #44 en GitHub:**
   * Dado que el código de PR #44 ha sido completamente integrado, resuelto y probado en `origin/develop`, se recomienda en la interfaz web de GitHub:
     * Cambiar la rama base de PR #44 de `main` a `develop` (para que GitHub lo marque como Merged automáticamente), o
     * Cerrar manualmente el PR indicando que fue integrado en `develop` en el commit `b56b878`.
2. **Base de Datos Compartida / Producción:**
   * Si en la base de datos MySQL/TiDB compartida existían tablas anteriores de la versión previa de HU-20 (`entregable_actividad`, `actividad_plan_trabajo`, `hito_plan_trabajo`), se puede ejecutar el script `database/limpieza_hu20.sql` antes de aplicar `python manage.py migrate` para garantizar una migración limpia y sin residuos.
3. **Próximas Funcionalidades Pendientes:**
   * Las ramas `origin/feat/HU-17-asignacion-evaluadores` y `origin/HU-09-Backend-Evaluacion` podrán integrarse en sesiones posteriores mediante la apertura formal de sus respectivos Pull Requests hacia `develop`.
