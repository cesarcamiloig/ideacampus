# Implementación de HU-11 (Cálculo de Madurez M0-M9) y Cierre de Integraciones HU-19

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar en el backend la gestión y cálculo del nivel de madurez tecnológica M0-M9 por evaluación auditable (HU-11) y completar las integraciones de la validación de avances con la línea de tiempo (HU-08) y alertas automáticas (HU-12) para HU-19.

**Architecture:** Módulo Django REST Framework con modelo relacional `RegistroMadurez` en `gestion_evaluacion`, serializers con validación de roles y evidencias validadas (RN-07, RN-11), endpoints REST con bloqueo de edición manual (CA-2, CA-3), compilación de eventos en la Línea de Tiempo Evolutiva en `gestion_emprendimiento_2/services.py`, y despacho de `AlertaRol` ante solicitudes de ajuste en `gestion_evidencia`.

**Tech Stack:** Django 6.1, Django REST Framework, JWT Authentication, SQLite/MySQL.

**Spec:** `docs/superpowers/specs/2026-11-09-hu11-hu19-madurez-seguimiento-design.md`

## Global Constraints
- Persistencia compatible con MySQL 8.0 y TiDB Cloud / SQLite fallback (`core/settings.py`).
- Autenticación mediante `gestion_administrativa.authentication.JWTAuthentication`.
- Autorización y RBAC mediante `TieneRolPermitido` y verificación de asignaciones en `Proyecto`.
- Nivel de madurez de solo lectura para estudiantes y sin edición manual directa (PUT/PATCH prohibidos).
- Respuestas de error estandarizadas en JSON (`{"error": "..."}`).

## Review Focus
1. Intento de creación de `RegistroMadurez` por un estudiante -> debe rechazar con HTTP 403 Forbidden.
2. Intento de creación de `RegistroMadurez` por un evaluador no asignado al proyecto -> debe rechazar con HTTP 403 Forbidden.
3. Intento de asociar evidencia de otro proyecto o no validada por tutor -> debe rechazar con HTTP 400 Bad Request.
4. Intento de modificación directa (`PUT` o `PATCH`) en `/api/proyectos/{id}/madurez/` -> debe rechazar con HTTP 400 Bad Request.
5. Solicitud de retroalimentación con `aprobado=False` en HU-19 -> debe crear `AlertaRol` dirigida al estudiante titular y a los miembros de su equipo.

---

### Task 1: Modelo `RegistroMadurez`, TextChoices `NivelMadurez` y Migraciones

**Files:**
- Modify: `backend/gestion_evaluacion/models.py`
- Modify: `backend/gestion_emprendimiento_2/models.py` (propiedad `nivel_madurez_actual`)
- Create: `backend/gestion_evaluacion/migrations/0003_registro_madurez.py`
- Test: `backend/gestion_evaluacion/tests.py`

**Interfaces:**
- Produces: `NivelMadurez(TextChoices)` con M0..M9, `RegistroMadurez(Model)` con campos `proyecto`, `nivel`, `evaluador`, `criterio_cumplido`, `evidencias`, `evaluacion`, `fecha_registro`.

- [ ] **Step 1: Write the failing test**

```python
# En backend/gestion_evaluacion/tests.py
def test_modelo_registro_madurez_creacion_e_historial(self):
    from gestion_evaluacion.models import NivelMadurez, RegistroMadurez
    # Verificar que el proyecto inicia en M0
    self.assertEqual(self.proyecto.nivel_madurez_actual, "M0")
    reg = RegistroMadurez.objects.create(
        proyecto=self.proyecto,
        nivel=NivelMadurez.M1,
        evaluador=self.evaluador,
        criterio_cumplido="Formulación tecnológica validada",
    )
    self.assertEqual(reg.nivel, "M1")
    self.assertEqual(self.proyecto.nivel_madurez_actual, "M1")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_evaluacion`
Expected: FAIL (ImportError o AttributeError: NivelMadurez / nivel_madurez_actual no existe)

- [ ] **Step 3: Implement `NivelMadurez`, `RegistroMadurez` y `nivel_madurez_actual`**

1. Agregar `NivelMadurez` y `RegistroMadurez` en `backend/gestion_evaluacion/models.py`.
2. Agregar propiedad `@property def nivel_madurez_actual(self)` en `backend/gestion_emprendimiento_2/models.py` en la clase `Proyecto`.
3. Generar migración con `python manage.py makemigrations gestion_evaluacion`.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_evaluacion`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/gestion_evaluacion/models.py backend/gestion_emprendimiento_2/models.py backend/gestion_evaluacion/migrations/ backend/gestion_evaluacion/tests.py
git commit -m "feat(evaluacion): agregar modelo RegistroMadurez y propiedad nivel_madurez_actual (HU-11)"
```

---

### Task 2: Serializadores y Validación de Reglas de Negocio de Madurez (RN-07, RN-11)

**Files:**
- Modify: `backend/gestion_evaluacion/serializers.py`
- Test: `backend/gestion_evaluacion/tests.py`

**Interfaces:**
- Produces: `RegistroMadurezSerializer` (lectura completa), `RegistroMadurezCrearSerializer` (escritura y validaciones).

- [ ] **Step 1: Write the failing tests**

```python
# Pruebas en backend/gestion_evaluacion/tests.py:
# 1. Serializer valida evidencias de otro proyecto -> ValidationError
# 2. Serializer valida evidencias no aprobadas por tutor -> ValidationError
# 3. Serializer crea registro válido y sincroniza proyecto.iniciativa.etapa_actual
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_evaluacion`
Expected: FAIL

- [ ] **Step 3: Implement `RegistroMadurezSerializer` y `RegistroMadurezCrearSerializer`**

En `backend/gestion_evaluacion/serializers.py`:
- Implementar `RegistroMadurezSerializer` serializando `id`, `nivel`, `nivel_display`, `criterio_cumplido`, `evaluador`, `evidencias`, `evaluacion_id`, `fecha_registro`.
- Implementar `RegistroMadurezCrearSerializer`:
  - `validate_evidencias`: comprobar que pertenezcan a `proyecto` y que tengan al menos una `RetroalimentacionAvance` con `aprobado=True` en sus `registros_avance`.
  - `create`: guardar el `RegistroMadurez` y actualizar `proyecto.iniciativa.etapa_actual = f"Nivel {nivel}"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_evaluacion`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/gestion_evaluacion/serializers.py backend/gestion_evaluacion/tests.py
git commit -m "feat(evaluacion): implementar serializadores y validacion RN-07 para madurez (HU-11)"
```

---

### Task 3: Vistas y Endpoints REST de Madurez con Bloqueo de Edición Manual

**Files:**
- Modify: `backend/gestion_evaluacion/views.py`
- Modify: `backend/gestion_evaluacion/urls.py`
- Test: `backend/gestion_evaluacion/tests.py`

**Interfaces:**
- Produces: `ProyectoMadurezView(APIView)` respondiendo a `GET`, `POST`, `PUT`, `PATCH` en `/api/proyectos/<id_proyecto>/madurez/`.

- [ ] **Step 1: Write the failing tests**

```python
# En backend/gestion_evaluacion/tests.py:
# 1. GET /api/proyectos/{id}/madurez/ -> retorna 200 con nivel_actual e historial
# 2. POST /api/proyectos/{id}/madurez/ por estudiante -> 403 Forbidden
# 3. POST /api/proyectos/{id}/madurez/ por evaluador no asignado -> 403 Forbidden
# 4. POST /api/proyectos/{id}/madurez/ por evaluador asignado -> 201 Created
# 5. PUT o PATCH /api/proyectos/{id}/madurez/ -> 400 Bad Request ("El nivel de madurez no se puede editar directamente")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_evaluacion`
Expected: FAIL (404 Not Found o View no definida)

- [ ] **Step 3: Implement `ProyectoMadurezView` y registrar ruta**

1. En `backend/gestion_evaluacion/views.py`:
   - Crear `ProyectoMadurezView(APIView)` con autenticación `JWTAuthentication` y `TieneRolPermitido`.
   - `get()`: consultar proyecto, devolver `{ "proyecto_id": ..., "nivel_actual": ..., "niveles_disponibles": [...], "historial": [...] }`.
   - `post()`: verificar permisos (si es evaluador, debe ser `proyecto.evaluador`; si es coordinador/direccion/admin, permitido). Guardar vía `RegistroMadurezCrearSerializer`.
   - `put()` y `patch()`: responder `HTTP 400 Bad Request` con mensaje de error de bloqueo directo.
2. En `backend/gestion_evaluacion/urls.py`:
   - Registrar `path("proyectos/<int:id_proyecto>/madurez/", ProyectoMadurezView.as_view(), name="proyecto_madurez")`.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_evaluacion`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/gestion_evaluacion/views.py backend/gestion_evaluacion/urls.py backend/gestion_evaluacion/tests.py
git commit -m "feat(evaluacion): endpoints REST de consulta y evaluacion de madurez (HU-11)"
```

---

### Task 4: Cierre de HU-19 — Alertas Automáticas al Solicitar Ajustes (HU-12 / `AlertaRol`)

**Files:**
- Modify: `backend/gestion_evidencia/views.py`
- Test: `backend/gestion_evidencia/tests.py`

**Interfaces:**
- Consumes: `AlertaRol` de `gestion_convocatorias.models`.
- Produces: Despacho de alerta cuando `aprobado == False` en `RegistroAvanceViewSet.retroalimentar`.

- [ ] **Step 1: Write the failing test**

```python
# En backend/gestion_evidencia/tests.py:
# test_retroalimentacion_observada_genera_alerta_al_estudiante:
# Tutor retroalimenta con aprobado=False
# Se verifica que existe AlertaRol con tipo='entrega_documentacion', prioridad='alta', usuario=titular
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_evidencia`
Expected: FAIL (AlertaRol no encontrada)

- [ ] **Step 3: Implementar generación de `AlertaRol` en `retroalimentar`**

En `backend/gestion_evidencia/views.py`:
- Si `not retroalimentacion.aprobado`:
  - Obtener titular `registro.proyecto.iniciativa.usuario`.
  - Crear `AlertaRol` para el titular y miembros del equipo con:
    - `titulo`: f"Ajustes requeridos en avance de {registro.etapa.nombre}"
    - `mensaje`: f"El tutor {perfil_tutor.usuario.nombre} ha solicitado ajustes en el avance: {serializer.validated_data.get('comentario')}"
    - `tipo`: "entrega_documentacion"
    - `prioridad`: "alta"
    - `modulo_destino`: "avance"

- [ ] **Step 4: Run test to verify it passes**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_evidencia`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/gestion_evidencia/views.py backend/gestion_evidencia/tests.py
git commit -m "feat(avance): notificar al estudiante con alerta automatica cuando se solicitan ajustes (HU-19/HU-12)"
```

---

### Task 5: Integración de Avances (HU-19) y Madurez (HU-11) en Línea de Tiempo Evolutiva (HU-08)

**Files:**
- Modify: `backend/gestion_emprendimiento_2/services.py`
- Test: `backend/gestion_emprendimiento_2/tests.py`

**Interfaces:**
- Consumes: `RetroalimentacionAvance` de `gestion_evidencia`, `RegistroMadurez` de `gestion_evaluacion`.
- Produces: Eventos en `obtener_linea_tiempo_proyecto` con `tipo_evento="avance_etapa"` y `tipo_evento="cambio_madurez"`.

- [ ] **Step 1: Write the failing tests**

```python
# En backend/gestion_emprendimiento_2/tests.py:
# 1. Proyecto con retroalimentación de tutor -> línea de tiempo contiene evento 'avance_etapa'.
# 2. Proyecto con registro de madurez -> línea de tiempo contiene evento 'cambio_madurez'.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_emprendimiento_2`
Expected: FAIL

- [ ] **Step 3: Implementar la compilación de eventos en `obtener_linea_tiempo_proyecto`**

En `backend/gestion_emprendimiento_2/services.py`:
- Consultar `RetroalimentacionAvance` relacionados con el proyecto y agregar eventos con:
  - `nombre`: f"Avance validado: {retro.registro_avance.etapa.nombre}" (o "Ajustes solicitados...")
  - `fecha`: retro.fecha
  - `estado`: "aprobado" if retro.aprobado else "requiere_ajustes"
  - `responsable`: retro.tutor.usuario.nombre
  - `observaciones`: retro.comentario
  - `tipo_evento`: "avance_etapa"
- Consultar `RegistroMadurez` relacionados con el proyecto y agregar eventos con:
  - `nombre`: f"Madurez Tecnológica: Nivel {reg.nivel}"
  - `fecha`: reg.fecha_registro
  - `estado`: f"Nivel {reg.nivel}"
  - `responsable`: reg.evaluador.nombre
  - `observaciones`: reg.criterio_cumplido
  - `tipo_evento`: "cambio_madurez"

- [ ] **Step 4: Run test to verify it passes**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test gestion_emprendimiento_2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/gestion_emprendimiento_2/services.py backend/gestion_emprendimiento_2/tests.py
git commit -m "feat(timeline): integrar avances por etapa y ascensos de madurez en linea de tiempo (HU-08/HU-11/HU-19)"
```

---

### Task 6: Verificación Integral del Sistema y Regresiones

**Files:**
- Test: Toda la suite de pruebas del backend

- [ ] **Step 1: Run full test suite**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py test`
Expected: PASS en todos los tests (>= 195 tests, cero fallos y cero errores).

- [ ] **Step 2: Run system check**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py check`
Expected: "System check identified no issues"

- [ ] **Step 3: Verification of migrations**

Run: `docker run --rm -v "C:\Users\Cesar Camilo\Proyectos\ideacampus:/app" -w /app/backend ideacampus-backend:latest python manage.py makemigrations --check`
Expected: "No changes detected"

- [ ] **Step 4: Final commit and summary documentation**

```bash
git add -A
git commit -m "chore: verificacion integral de backend para HU-11 y HU-19"
```
