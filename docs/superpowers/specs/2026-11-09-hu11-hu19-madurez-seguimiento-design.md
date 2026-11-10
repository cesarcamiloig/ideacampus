# Documento de Diseño Técnico: HU-11 (Cálculo y Gestión de Madurez M0-M9) y Cierre de HU-19 (Seguimiento de Avance)

- **Fecha:** 2026-11-09
- **Autor / Responsable:** César Camilo Izquierdo
- **Historias de Usuario:** HU-11 (Cálculo de Madurez M0-M9) y HU-19 (Seguimiento y Avance por Etapas)
- **Módulos Afectados:** `gestion_evaluacion`, `gestion_evidencia`, `gestion_emprendimiento_2`, `gestion_convocatorias`
- **Rama:** `feat/HU-11-calculo-madurez`

---

## 1. Contexto e Intención

El proyecto **IdeaCampus (GENNOVA)** sistematiza la trayectoria de las iniciativas de emprendimiento e innovación estudiantil en la UFPS. Para responder a procesos de acreditación y toma de decisiones objetivas, el sistema requiere:

1. **HU-11 (Cálculo de Madurez M0-M9):** Reflejar el nivel de madurez tecnológica (escala adaptada TRL M0 a M9) evaluado formalmente por el **evaluador asignado** (o coordinación) a partir de evidencias validadas y resultados de evaluación, garantizando un registro auditable, determinista y trazable (RNF13) sin permitir la alteración arbitraria por roles no autorizados o estudiantes (solo lectura).
2. **HU-19 (Seguimiento y Avance por Etapas de la Iniciativa):** Cerrar la integración completa del registro de avances y validación de tutor con la **Línea de Tiempo Evolutiva (HU-08)** y el sistema de alertas automáticas (**HU-12** / `AlertaRol`) cuando el tutor solicita ajustes.

---

## 2. Objetivos, No-Objetivos y Anti-Objetivos

### Objetivos
- Proveer el modelo y persistencia de madurez tecnológica para cada proyecto/iniciativa (`NivelMadurezHistorial` y campo/propiedad de nivel actual `M0`..`M9`).
- Implementar el endpoint REST para que el evaluador asignado al proyecto (o roles de coordinación/dirección) registre formalmente la evaluación/ascenso de madurez con justificación y evidencias validadas vinculadas.
- Asegurar que para estudiantes, tutores generales y visualizadores el nivel sea estrictamente de **solo lectura**.
- Validar las precondiciones de negocio (RN-07: el nivel se fundamenta en evidencias validadas por el tutor y/o evaluaciones; RB-2: cada ascenso queda trazado con fecha, criterio y evidencias asociadas).
- Integrar los eventos de madurez y de validación de avance (HU-19) en la Línea de Tiempo Evolutiva (`LineaTiempoProyectoView` / `obtener_linea_tiempo_proyecto`).
- Notificar al estudiante mediante `AlertaRol` cuando el tutor solicita ajustes en un avance reportado (HU-19 -> HU-12).

### No-Objetivos
- No modificar el sistema de cálculo de notas numéricas de rúbricas (HU-06 / HU-09).
- No implementar la interfaz gráfica de usuario en React en esta tarea (el alcance asignado es Backend).

### Anti-Objetivos
- No permitir que el nivel de madurez sea editado arbitrariamente con un campo editable abierto sin trazabilidad o por usuarios no autorizados.
- No romper las pruebas existentes ni las migraciones de base de datos actuales.

---

## 3. Restricciones y Reglas de Negocio
- **RN-07:** El registro de avance lo realiza el estudiante o tutor, pero solo cuenta formalmente para la madurez cuando el tutor asignado lo valida.
- **RN-11:** El nivel de madurez y sus ascensos quedan auditados con fecha, criterio cumplido y evidencia asociada.
- **RB-3 (HU-11 CA-2):** El nivel de madurez no se edita directamente como un simple atributo de formulario; es una evaluación formal auditable con histórico inmutable.
- **RNF13:** Auditoría de cambios y consistencia estricta en MySQL / SQLite.
- **Compatibilidad RBAC:** Autenticación vía JWT (`JWTAuthentication`) y permisos basados en `TieneRolPermitido`.

---

## 4. Enfoques Considerados y Selección

### Enfoque A: Automatización implícita por reglas duras (Black-box)
El sistema recalcula silenciosamente el nivel sin intervención humana.
- *Desventaja:* No permite el criterio profesional del evaluador académico requerido por el documento del proyecto y la retroalimentación del Product Owner ("debe ser manual").

### Enfoque B: Evaluación manual auditable por el Evaluador (Seleccionado)
El evaluador asignado (o la Dirección/Coordinación) examina el expediente, las evidencias validadas por el tutor y las evaluaciones de hito, y registra manualmente la transición/confirmación del nivel de madurez (M0 a M9), documentando el criterio cumplido y enlazando las evidencias de soporte.
- *Ventaja:* Cumple con la directriz explícita del usuario ("debe ser manual"), respeta la autonomía académica del evaluador, mantiene la inmutabilidad histórica requerida por RNF13 y previene modificaciones no autorizadas por parte de estudiantes.

---

## 5. Diseño Detallado de la Implementación Backend

### 5.1. Modelos de Datos (`gestion_evaluacion/models.py`)

#### `NivelMadurez(models.TextChoices)`
- `M0 = "M0", "M0: Ideación Inicial"`
- `M1 = "M1", "M1: Formulación Tecnológica"`
- `M2 = "M2", "M2: Concepto Validado"`
- `M3 = "M3", "M3: Prueba de Concepto"`
- `M4 = "M4", "M4: Prototipo Básico"`
- `M5 = "M5", "M5: Prototipo de Alta Fidelidad"`
- `M6 = "M6", "M6: Sistema de Demostración"`
- `M7 = "M7", "M7: Validación Real"`
- `M8 = "M8", "M8: Sistema Calificado"`
- `M9 = "M9", "M9: Transferencia"`

#### `RegistroMadurez(models.Model)`
- `proyecto`: ForeignKey a `gestion_emprendimiento_2.Proyecto` (on_delete=models.CASCADE, related_name="registros_madurez", db_column="id_proyecto").
- `nivel`: CharField(max_length=5, choices=NivelMadurez.choices).
- `evaluador`: ForeignKey a `Usuario` (on_delete=models.PROTECT, related_name="evaluaciones_madurez", db_column="id_usuario"). Sin limit_choices_to para permitir que Administrador o Coordinador también puedan registrar la evaluación.
- `criterio_cumplido`: TextField (explicación del criterio alcanzado).
- `evidencias`: ManyToManyField a `gestion_evidencia.Evidencia` (blank=True, related_name="registros_madurez", db_table="registro_madurez_evidencia").
- `evaluacion`: ForeignKey opcional a `gestion_evaluacion.Evaluacion` (null=True, blank=True, on_delete=models.SET_NULL, related_name="registros_madurez", db_column="id_evaluacion").
- `fecha_registro`: DateTimeField(auto_now_add=True).
- Metadatos: `ordering = ["-fecha_registro", "-id"]`, `db_table = "registro_madurez"`.

En `Proyecto` (y en el serializer del expediente), la propiedad `nivel_madurez_actual` retorna el nivel del último `RegistroMadurez`, o por defecto `M0` si aún no tiene registros.
Al guardar un nuevo `RegistroMadurez`, se sincroniza automáticamente `proyecto.iniciativa.etapa_actual = f"Nivel {nivel}"` para mantener consistencia con los demás módulos.

### 5.2. Serializers y Validación de Negocio (`gestion_evaluacion/serializers.py`)
- `RegistroMadurezSerializer`:
  - Retorna `id`, `nivel`, `nivel_display`, `criterio_cumplido`, `evaluador` (id, nombre, correo), `fecha_registro`, `evaluacion_id`, y lista de `evidencias` detalladas (id, titulo, tipo, etapa).
- `RegistroMadurezCrearSerializer`:
  - Valida permisos: si el usuario opera con rol `evaluador`, debe estar asignado a `proyecto.evaluador`. Si opera con rol `coordinador`, `direccion_del_programa` o `admin`, tiene potestad institucional para registrarlo.
  - Valida `nivel`: debe ser una opción válida en `NivelMadurez`. Se permite mantener o ascender de nivel justificadamente.
  - Valida `evidencias`: si se envían evidencias, deben pertenecer al mismo proyecto y tener al menos un `RegistroAvance` validado por el tutor (`RetroalimentacionAvance.aprobado == True`) según la regla RN-07.
  - Para `M0` o registros basados puramente en rúbricas/evaluación, la lista de evidencias puede ser vacía.

### 5.3. Endpoints REST (`gestion_evaluacion/views.py` y `urls.py`)
- `GET /api/proyectos/{id_proyecto}/madurez/`:
  - Retorna `{ "proyecto_id": X, "nivel_actual": "M0", "niveles_disponibles": [...], "historial": [...] }`.
  - Permiso: Todos los roles académicos autenticados (lectura).
- `POST /api/proyectos/{id_proyecto}/madurez/`:
  - Registra una nueva evaluación de nivel de madurez.
  - Permiso: Evaluador asignado, Coordinador, Dirección del Programa, Admin.
- Bloqueo de edición manual directa: Handlers explícitos para `PUT` y `PATCH` sobre `/api/proyectos/{id_proyecto}/madurez/` que retornan `HTTP 400 Bad Request` con `{"error": "El nivel de madurez no se puede editar directamente. Debe registrarse a través de una evaluación formal."}` (cumplimiento estricto de CA-2 y CA-3).

### 5.4. Integración HU-19 con Línea de Tiempo (HU-08) y Alertas (HU-12)
1. **Línea de tiempo (`backend/gestion_emprendimiento_2/services.py`):**
   - En `obtener_linea_tiempo_proyecto`:
     - Incorporar eventos de `RetroalimentacionAvance` (`tipo_evento = "avance_etapa"`, fecha = `retroalimentacion.fecha`, responsable = tutor, estado = "Aprobado" / "Requiere ajustes", observaciones = comentario del tutor).
     - Incorporar eventos de `RegistroMadurez` (`tipo_evento = "cambio_madurez"`, fecha = `registro.fecha_registro`, responsable = evaluador, estado = f"Nivel {registro.nivel}", observaciones = criterio_cumplido).
2. **Alertas automáticas (`backend/gestion_evidencia/views.py`):**
   - En el endpoint `retroalimentar`, cuando `aprobado == False` (solicitud de ajustes):
     - Crear una `AlertaRol` con `tipo="entrega_documentacion"`, `prioridad="alta"`, `modulo_destino="avance"`, dirigida al estudiante titular del proyecto (y a los integrantes del equipo si existen), informando que el tutor ha solicitado ajustes en el avance de la etapa correspondiente.

---

## 6. Estrategia de Pruebas Automatizadas
- Pruebas unitarias y de integración en `gestion_evaluacion/tests.py`:
  - Consulta de madurez inicial (retorna M0 por defecto).
  - Registro exitoso de ascenso de madurez por el evaluador asignado con evidencias validadas.
  - Intento fallido de registro de madurez por un estudiante (debe responder 403 Forbidden).
  - Intento fallido de registro por un evaluador no asignado al proyecto (403 Forbidden).
  - Intento de asociar evidencias no validadas o de otro proyecto (validación rechazada).
  - Verificación de inmutabilidad del historial de ascensos.
- Pruebas de integración en `gestion_evidencia/tests.py` y `gestion_emprendimiento_2/tests.py`:
  - Aparición del evento de madurez en la línea de tiempo.
  - Aparición del evento de validación de avance en la línea de tiempo.
  - Emisión de `AlertaRol` al solicitar ajustes en HU-19.
- Ejecución completa de la suite de pruebas del repositorio (asegurando que los 183 tests existentes sigan en verde más las nuevas pruebas).

---

## 7. Lo que queda a cargo del Desarrollador (Builder)
- Creación de la migración en `gestion_evaluacion`.
- Implementación de los serializers, vistas y rutas.
- Ajustes en el servicio de línea de tiempo y en la acción de retroalimentación de evidencia.
- Verificación exhaustiva con el comando de tests.
