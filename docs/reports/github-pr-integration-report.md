# Informe de Auditoría Integral, Integración de Pull Requests (HU-17, HU-20) y Estado del Repositorio

**Proyecto:** GENNOVA — Sistema Web para Gestión de Emprendimientos e Innovación Estudiantil (`ideacampus`)  
**Repositorio Remoto:** `https://github.com/cesarcamiloig/ideacampus.git`  
**Fecha de Ejecución Actualizada:** 8 de Noviembre de 2026  
**Auditor / Ingeniero:** Senior Software Engineer (AI Pair Programmer)  
**Rama de Integración Principal:** `develop`  
**Rama de Producción / Default:** `main`  

---

## 1. Resumen Ejecutivo

Se completó una auditoría exhaustiva e integral del estado del repositorio `ideacampus`, abarcando todas las ramas locales y remotas, la totalidad de los Pull Requests en GitHub y la estabilidad funcional del stack en contenedores Docker.

### Diagnóstico de PRs en GitHub:
1. **PR #45 (`Feat/hu 17 asignacion evaluadores`, autor: `Miguel-0405`):**
   * **Estado:** **ABIERTO** en GitHub con rama origen `feat/HU-17-asignacion-evaluadores`.
   * **Problema diagnosticado:** Creado con rama base errónea `main` (lo que marcaba estado `dirty` en GitHub por divergencia histórica con `develop`).
   * **Resolución e Integración:** Se integró en `develop`. Se resolvió de forma limpia el único conflicto en `frontend/src/modules/gestion_convocatorias/components/BancoIniciativasView.jsx` (armonizando la coexistencia del panel de Línea de Tiempo HU-08 y el nuevo panel de Evaluador HU-17).
2. **PR #44 (`Test/hu 20 integracion`, autor: `Dnielbermudez`):**
   * **Estado:** **ABIERTO** en GitHub con rama origen `test/HU-20-integracion`.
   * **Diagnóstico:** Se constató que su código y pruebas ya estaban 100% integrados y estabilizados en `develop` (commits `6dcd6fe`, `b56b878` y `5cd2546`). Permanece abierto únicamente porque su rama base configurada en GitHub es `main`.

### Métricas Clave de la Sesión
* **Pull Requests abiertos identificados:** **2** (**PR #44** y **PR #45**).
* **Pull Requests integrados exitosamente:** **PR #45** integrado en `develop` vía commit `bb128f7` (PR #44 ya consolidado).
* **Pruebas automatizadas Backend (Django 6.1 / Python 3.12):** **183 pruebas ejecutadas — 183 aprobadas (100% OK en 5.08s)**.
* **Chequeo de Sistema Django:** `python manage.py check` → **0 errores** (0 silenciados).
* **Consistencia de Migraciones:** `makemigrations --check --dry-run` → **0 cambios pendientes**.
* **Migraciones de Base de Datos:** **71 migraciones aplicadas satisfactoriamente** (incluyendo `0007_iniciativa_evaluador` y `0008_quitar_evaluador_de_iniciativa` de HU-17).
* **Linter Frontend (Oxlint):** **0 errores** en 69 archivos analizados.
* **Compilación Frontend (Vite 8.3 / React 19):** **Build exitoso en 1.80s** (2045 módulos transformados).
* **Servicios en Ejecución (Docker Compose):**
  * Backend Django WSGI en `http://localhost:8000/` → **HTTP 200 OK**.
  * Frontend Vite en `http://localhost:5173/` → **HTTP 200 OK**.
  * Endpoint autenticado `/api/proyectos/evaluadores/` → **HTTP 403 Forbidden** (control de acceso y rutas validados).

---

## 2. Inventario y Diagnóstico de Pull Requests y Ramas

### 2.1 Estado de Pull Requests en GitHub
| PR # | Título | Autor | Rama Origen → Base | Estado en GitHub | Estado de Integración en `develop` | Notas Técnicas |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| **#45** | `Feat/hu 17 asignacion evaluadores` | `Miguel-0405` | `feat/HU-17-asignacion-evaluadores` → `main` | **Open** | **100% Integrado (Commit `bb128f7`)** | Base en PR configurada en `main`. Integrado en `develop` resolviendo colisión en `BancoIniciativasView.jsx`. 183 tests OK. |
| **#44** | `Test/hu 20 integracion` | `Dnielbermudez` | `test/HU-20-integracion` → `main` | **Open** | **100% Integrado (Commit `b56b878`)** | Base en PR configurada en `main`. Código ya incorporado y probado en `develop`. |
| **#43** | `feat(linea-tiempo): mostrar cronologicamente las etapas...` (HU-08) | `cesarcamiloig` | `feat/HU-08-frontend-linea-tiempo` → `develop` | **Closed (Merged)** | **Integrado** | Commit `f12e406`. |
| **#42** | `Feat/mejoras frontend` | `cesarcamiloig` | `feat/mejoras-frontend` → `main` | **Closed (Unmerged en main)** | **Integrado en `develop`** | Commit `0c473f6`. |
| **#41** | `feat: Endpoint de Línea de Tiempo (HU-08)` | `cesarcamiloig` | `feat/HU-08-backend-linea-tiempo` → `develop` | **Closed (Merged)** | **Integrado** | Commit `a7b9420`. |
| **#40** | `feat(avance): registrar y validar el avance por etapas...` (HU-19) | `cesarcamiloig` | `feat/HU-19-registro-validacion-avance` → `develop` | **Closed (Merged)** | **Integrado** | Commit `3b0a6e1`. |
| **#39** | `Feat/hu 05 asignacion tutor` | `cesarcamiloig` | `feat/HU-05-asignacion-tutor` → `develop` | **Closed (Merged)** | **Integrado** | Commit `c500695`. |
| **#38** | `Feat/hu 05 asignacion tutor` | `cesarcamiloig` | `feat/HU-05-asignacion-tutor` → `main` | **Closed (Unmerged)** | **Integrado vía PR #39** | Duplicado hacia `main`. |
| **#37** | `Feat/hu 10 frontend asignacion mentorias` | `cesarcamiloig` | `feat/HU-10-frontend-asignacion-mentorias` → `develop` | **Closed (Merged)** | **Integrado** | Commit `f8f0a80`. |
| **#36** | `Test/hu 07 integracion` | `cesarcamiloig` | `test/HU-07-integracion` → `develop` | **Closed (Merged)** | **Integrado** | Commit `48326be`. |
| **#35** | `feat(HU-20): gestion del plan de trabajo...` | `cesarcamiloig` | `feat/HU-20-backend-plan-trabajo` → `develop` | **Closed (Merged)** | **Integrado** | Commit `7c184e8`. |

### 2.2 Diagnóstico de Ramas Remotas sin PR
1. `origin/HU-09-Backend-Evaluacion` (miguelvl05):
   * Contiene 2 commits de backend para el cálculo y guardado de evaluaciones de hitos (`a19009a` y `114c924`).
   * **Diagnóstico:** No tiene PR abierto. Corresponde exclusivamente al backend de HU-09; el frontend correspondiente aún no ha sido desarrollado ni subido. Se verificó experimentalmente su fusión (228 tests pasaron), pero se mantuvo en su rama a la espera de la implementación del módulo frontend respectivo y la apertura de su PR formal.
2. `origin/feat/HU-20-Gestion-actividades`:
   * Rama histórica de trabajo absorbida en su totalidad por PR #44.
3. `origin/fix/correcciones-frontend`:
   * Rama descartada correspondiente a los PRs cerrados #21 y #22.

---

## 3. Revisión Técnica Detallada de la Integración de HU-17 (PR #45)

### 3.1 Arquitectura e Impacto de los Cambios
La funcionalidad de **Asignación de Evaluadores a Proyectos (HU-17)** permite al coordinador asignar, consultar y relevar evaluadores institucionales para proyectos aprobados:
1. **Modelado y Persistencia:**
   * La relación se establece directamente a nivel de `Proyecto` mediante `proyecto.id_evaluador` (ForeignKey hacia `Usuario`, filtrando por rol activo `evaluador`).
   * Un evaluador puede estar asignado simultáneamente a múltiples proyectos, pero un proyecto tiene un único evaluador principal.
2. **Historial de Migraciones en `gestion_convocatorias`:**
   * Se incorporaron `0007_iniciativa_evaluador.py` y `0008_quitar_evaluador_de_iniciativa.py`, manteniendo exacta sincronía con la base de datos remota TiDB Cloud sin alterar el grafo de dependencias.
3. **Servicios y Controladores Backend (`gestion_emprendimiento_2`):**
   * Se habilitó el rol `coordinador` dentro de `ROLES_GESTORES_PROYECTO` en `views.py`.
   * Se incorporó el método `GET` en `AsignarEvaluadorView` para devolver `id_evaluador`, `evaluador_nombre` y `evaluador_correo`.
   * En el método `PATCH`, se enriqueció la respuesta con `nombre_proyecto` y `evaluador_correo`.
4. **Módulo Frontend (`gestion_acompaniamiento` y `gestion_convocatorias`):**
   * Creación de `EvaluadorPanel.jsx`: interfaz lateral accesible, con gestión de estados, confirmación de baja y compatibilidad con lectores de pantalla.
   * Creación de `evaluadorAsignacionService.js`: cliente para interactuar con los endpoints de evaluación.
   * Actualización de `BancoIniciativasView.jsx`: activación del botón "Evaluador" para proyectos aprobados.

---

## 4. Conflictos Detectados y Resoluciones Técnicas

| Archivo | Conflicto | Resolución Técnica |
| :--- | :--- | :--- |
| `frontend/src/modules/gestion_convocatorias/components/BancoIniciativasView.jsx` | Colisión en importaciones, hooks de estado y renderizado de paneles modales entre `LineaTiempoPanel` (HU-08) y `EvaluadorPanel` (HU-17). | Se unificaron los bloques sin pérdidas: se preservaron las rutas y estados de HU-08 y se agregaron las de HU-17, permitiendo al coordinador alternar entre ambos paneles de forma independiente. |
| `backend/core/settings.py` | En entornos locales donde `DB_HOST` mantiene el valor por defecto (`ingresa_aqui_el_host_de_railway`), el servidor `runserver` fallaba al intentar resolver el host inexistente. | Se ajustó la lógica de fallback de bases de datos para que `runserver` y `migrate` operen automáticamente con `BASE_DIR / 'db.sqlite3'` ante hosts no configurados, preservando TiDB/MySQL con SSL cuando se suministren credenciales reales. |

---

## 5. Resultados de Verificación Técnica (Evidencia Real)

```
================================================================================
1. CHEQUEO DE SISTEMA DJANGO (System Check)
Comando: docker compose run --rm backend python manage.py check
Resultado: System check identified no issues (0 silenced). [EXIT CODE 0]

2. CHEQUEO DE MIGRACIONES (Dry-run)
Comando: docker compose run --rm backend python manage.py makemigrations --check --dry-run
Resultado: No changes detected [EXIT CODE 0]

3. APLICACIÓN DE MIGRACIONES
Comando: docker compose run --rm backend python manage.py migrate
Resultado: Running migrations: 71 applied successfully. [EXIT CODE 0]

4. SUITE DE PRUEBAS UNITARIAS Y DE INTEGRACIÓN (Django Test)
Comando: docker compose run --rm backend python manage.py test
Resultado:
Found 183 test(s).
Creating test database for alias 'default'...
.......................................................................................
Ran 183 tests in 5.084s
OK [183/183 TESTS APROBADOS - EXIT CODE 0]

5. LINTER FRONTEND (Oxlint)
Comando: docker compose run --rm frontend npm run lint
Resultado: Found 54 warnings and 0 errors. Finished in 191ms on 69 files. [EXIT CODE 0]

6. COMPILACIÓN DE PRODUCCIÓN FRONTEND (Vite Build)
Comando: docker compose run --rm frontend npm run build
Resultado:
vite v8.3.0 building client environment for production...
✓ 2045 modules transformed.
dist/index.html                   0.46 kB │ gzip:   0.30 kB
dist/assets/index-BADqrXWt.css   65.99 kB │ gzip:  12.46 kB
dist/assets/index-CqjJJIRT.js   756.84 kB │ gzip: 198.86 kB
✓ built in 1.80s [EXIT CODE 0]

7. SERVICIOS EN TIEMPO DE EJECUCIÓN (HTTP Endpoints)
- GET http://localhost:8000/admin/login/    → HTTP 200 OK
- GET http://localhost:5173/                → HTTP 200 OK
- GET http://localhost:8000/api/proyectos/evaluadores/ (sin token) → HTTP 403 Forbidden
================================================================================
```

---

## 6. Recomendaciones para el Cierre Administrativo en GitHub

1. **PR #45 (`Feat/hu 17 asignacion evaluadores`):**
   * El código fue 100% probado e integrado en `origin/develop`.
   * En GitHub, se recomienda editar el PR para cambiar la rama base de `main` a `develop` (para registrar el merge automático) o cerrarlo con referencia al commit `bb128f7`.
2. **PR #44 (`Test/hu 20 integracion`):**
   * El código ya está completamente integrado en `develop` (commit `b56b878`).
   * Igualmente, cambiar su base en GitHub a `develop` o proceder a cerrarlo con referencia a `b56b878`.
3. **Rama `HU-09-Backend-Evaluacion`:**
   * La lógica backend está lista y pasó las 228 pruebas en laboratorio.
   * Se sugiere que el equipo de frontend desarrolle la vista correspondiente antes de abrir el PR de HU-09.
