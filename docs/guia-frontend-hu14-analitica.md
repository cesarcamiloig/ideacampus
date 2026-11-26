# Guía frontend · HU-14 Dashboard de indicadores (Dirección del Programa)

> **Cómo usar esta guía:** sirve para leerla tú o para pegarla completa como prompt a tu asistente de IA.
> Si la usas como prompt, empieza con:
> *"Implementa en el frontend de IdeaCampus (React 19 + Vite + Tailwind) el dashboard de la HU-14 siguiendo esta guía. No modifiques el backend."*

## 1. Objetivo

> *Como Dirección del Programa, quiero consultar un dashboard con indicadores y métricas de impacto, aplicando filtros por periodo, cohorte, estudiante, tutor o estado, para sustentar procesos de acreditación y toma de decisiones con datos confiables.*

El backend ya está terminado: rama `feat/HU-14-Bacckend-Metricas`, app `backend/gestion_analitica`. En el frontend falta construir una pantalla con tres partes:

1. **Panel de filtros** que se puedan combinar.
2. **Indicadores**: tarjetas de resumen y gráficas de distribución.
3. **Tabla de proyectos**, paginada y ordenable.

El panel de filtros controla a la vez los indicadores y la tabla.

## 2. Conceptos clave (no los confundas)

Estos tres conceptos suenan parecido, pero no son lo mismo. En la interfaz usa exactamente estos nombres:

| Concepto | Qué significa | Cómo se filtra |
|---|---|---|
| **Vigencia** | Si el proyecto sigue en marcha. **Activo** = estado `activo`. **Inactivo** = `pausado`, `finalizado` o `cancelado`. | `vigencia` o `estado` |
| **Aprobación en convocatoria** | La iniciativa fue aceptada en la convocatoria. **Todos** los proyectos del dashboard ya pasaron por aquí, porque un proyecto se crea en el momento en que se aprueba su iniciativa. | No es un filtro |
| **Aprobación por hitos** | Resultado académico de las evaluaciones. Un proyecto está **aprobado** solo si **todos** los hitos de su rúbrica están calificados **y cada hito** tiene nota ≥ 3.00. | `aprobado_hitos` |

Detalles de la aprobación por hitos:
- Con un solo hito aprobado no alcanza: si falta calificar cualquier hito, el proyecto **no** está aprobado.
- La nota de un hito es el promedio de las notas de sus evaluadores, redondeado a 2 decimales. Es el mismo valor que se ve en la pantalla de resultados de evaluación.
- Una evaluación creada pero sin nota todavía no cuenta como calificada.
- Basta con que un hito quede por debajo de 3.00 para que el proyecto no esté aprobado, aunque los demás tengan notas altas.

## 3. Reglas del contrato

- Todos los endpoints son **GET** y están bajo `/api/analitica/`.
- Solo responden al rol **`direccion_del_programa`**; cualquier otro rol recibe **403**.
- Haz todas las peticiones con `apiClient` (`frontend/src/services/apiClient.js`). Ese cliente ya envía `Authorization: Bearer` y la cabecera `X-Rol-Activo`. **No uses `fetch` directo.**
- **Listado y métricas aceptan los mismos filtros.** Cuando cambie un filtro, vuelve a pedir los dos con los mismos parámetros para que la tabla y los totales coincidan.
- Cómo se combinan los filtros:
  - **Filtros distintos se combinan con AND.** `?tipo=emprendimiento&vigencia=activos&aprobado_hitos=true` devuelve los emprendimientos activos aprobados por hitos.
  - **Varios valores de un mismo filtro se combinan con OR.** Se envían separados por coma: `?estado=pausado,finalizado`.
  - **Un filtro vacío no se envía.** Nada de `?tutor=` ni valores `undefined`.

## 4. Endpoints

### 4.1 `GET /analitica/filtros/`: opciones para los selectores

Pídelo **una sola vez**, al montar la página.

```json
{
  "periodos":    [{ "id": "2026-1", "nombre": "2026-I", "anio": 2026, "semestre": "1", "es_vigente": true }],
  "cohortes":    [{ "id": 3, "nombre": "Convocatoria 2026-I", "periodo": "2026-1", "estado": "abierta" }],
  "tutores":     [{ "id": 1, "nombre": "Ana Pérez", "area_conocimiento": "Software" }],
  "estudiantes": [{ "id": 12, "nombre": "Iris Gómez", "codigo": "1150002" }],
  "estados":     [{ "valor": "activo", "etiqueta": "Activo" }, { "valor": "pausado", "etiqueta": "Pausado" }, "..."],
  "vigencias":   [{ "valor": "activos",   "etiqueta": "Activos",   "estados": ["activo"] },
                  { "valor": "inactivos", "etiqueta": "Inactivos", "estados": ["pausado", "finalizado", "cancelado"] }],
  "aprobacion_hitos": [{ "valor": "true",  "etiqueta": "Aprobados (todos los hitos con nota >= 3.0)" },
                       { "valor": "false", "etiqueta": "No aprobados (hitos pendientes o con nota < 3.0)" }],
  "tipos":       [{ "valor": "emprendimiento", "etiqueta": "Emprendimiento" }, { "valor": "innovacion", "etiqueta": "Innovación" }],
  "origenes_academicos": [{ "valor": "semillero", "etiqueta": "Semillero de Investigación" }, "..."],
  "sectores_tecnologicos": ["Agrotech", "IoT"],
  "etapas":      ["Validación"],
  "semestres":   [5, 7, 9],
  "niveles_madurez": [{ "valor": "M0", "etiqueta": "M0: Ideación Inicial" }, "... hasta M9"]
}
```

Qué id corresponde a cada lista:
- En `estudiantes`, `id` es el **id de usuario**, que es el valor que se manda en el filtro `estudiante`.
- En `tutores`, `id` es el `id_tutor`.
- En `cohortes`, `id` es el id de la convocatoria.

### 4.2 Parámetros de filtro (sirven para `proyectos/` y `metricas/`)

| Parámetro | Valores | ¿Varios? | Control sugerido |
|---|---|---|---|
| `periodo` | id del periodo académico (`2026-1`) | sí | select múltiple |
| `anio` | entero (`2026`) | sí | select |
| `cohorte` | id de la convocatoria de ingreso | sí | select múltiple |
| `estudiante` | id de usuario (postulante o integrante del equipo) | sí | combobox con búsqueda |
| `tutor` | id_tutor | sí | select |
| `mentor` | id_mentor (asignación activa) | sí | *(opcional)* |
| `vigencia` | `activos` \| `inactivos` | no | segmented: Todos / Activos / Inactivos |
| `estado` | `activo`, `pausado`, `finalizado`, `cancelado` | sí | chips |
| `aprobado_hitos` | `true` (aprobados) \| `false` (no aprobados) | no | segmented: Todos / Aprobados / No aprobados |
| `tipo` | `emprendimiento` \| `innovacion` | sí | segmented o chips |
| `origen_academico` | `asignatura`, `proyecto_aula`, `integrador`, `semillero`, `practica`, `trabajo_grado` | sí | select |
| `sector_tecnologico` | texto (no distingue mayúsculas) | sí | select |
| `etapa_actual` | texto (no distingue mayúsculas) | sí | select |
| `semestre` | entero (semestre de algún integrante) | sí | select |
| `nivel_madurez` | `M0` … `M9` (nivel vigente) | sí | select |
| `con_tutor` | `true` \| `false` | no | select: Todos / Con tutor / Sin tutor |
| `fecha_desde`, `fecha_hasta` | `AAAA-MM-DD` (fecha de creación del proyecto) | no | inputs `type="date"` |
| `q` | texto (nombre del proyecto o de la iniciativa) | no | buscador con *debounce* de ~400 ms |

Para ordenar el panel, deja **visibles** los filtros principales de la HU: Periodo, Cohorte, Estudiante, Tutor, Vigencia/Estado, Aprobación por hitos y Tipo. El resto puede ir dentro de un desplegable **"Más filtros"**.

**Parámetros que solo acepta `proyectos/`:**
- `page`: empieza en 1.
- `page_size`: 20 por defecto, máximo 100.
- `ordering`: `creado`, `nombre`, `estado`, `tipo`, `periodo` o `nivel_madurez`. Con prefijo `-` el orden es descendente; si no se envía, se usa `-creado`.

### 4.3 `GET /analitica/proyectos/`: tabla

```json
{
  "count": 42,
  "next": "http://localhost:8000/api/analitica/proyectos/?page=2&tipo=emprendimiento",
  "previous": null,
  "filtros_aplicados": { "tipo": ["emprendimiento"], "aprobado_hitos": true },
  "results": [{
    "id_proyecto": 7, "nombre_proyecto": "App Agro", "id_iniciativa": 15,
    "estado": "activo", "estado_display": "Activo", "vigencia": "activo",
    "aprobado_hitos": true,
    "tipo": "emprendimiento", "tipo_display": "Emprendimiento",
    "origen_academico": "semillero", "origen_academico_display": "Semillero de Investigación",
    "sector_tecnologico": "Agrotech", "etapa_actual": "Validación",
    "periodo": { "id": "2026-1", "nombre": "2026-I" },
    "cohorte": { "id": 3, "nombre": "Convocatoria 2026-I" },
    "tutor": { "id": 1, "nombre": "Ana Pérez" },
    "postulante": { "id": 12, "nombre": "Iris Gómez", "correo": "iris@ufps.edu.co" },
    "integrantes": 2, "nivel_madurez": "M3", "creado": "2026-03-02T14:10:00Z"
  }]
}
```

Columnas sugeridas para la tabla:
- **Proyecto**
- **Tipo**
- **Estado**: insignia de color según la vigencia.
- **Aprobación por hitos**: insignia "Aprobado" / "No aprobado".
- **Periodo**, **Cohorte**, **Tutor**, **Postulante**, **Integrantes**
- **Madurez**: M0–M9.
- **Creado**

Cómo mostrar algunos valores:
- `periodo` y `tutor` pueden venir en `null`: muestra "Sin periodo" o "Sin tutor".
- `aprobado_hitos: false` puede significar dos cosas: que faltan hitos por calificar o que algún hito quedó por debajo de 3. Por eso conviene el texto "No aprobado" y no "Reprobado".
- `next` y `previous` son URLs absolutas. No las uses para navegar: guarda tú el número de página y vuelve a llamar con `page`.

### 4.4 `GET /analitica/metricas/`: indicadores

```json
{
  "filtros_aplicados": { "periodo": ["2026-1"] },
  "resumen": {
    "total_proyectos": 42,
    "proyectos_activos": 30, "proyectos_inactivos": 12, "tasa_actividad": 71.43,
    "proyectos_aprobados_hitos": 14, "tasa_aprobacion_hitos": 33.33,
    "proyectos_con_tutor": 35, "proyectos_sin_tutor": 7, "cobertura_tutoria": 83.33,
    "estudiantes_vinculados": 118, "tutores_vinculados": 9, "mentores_vinculados": 6
  },
  "por_estado":  [{ "valor": "activo", "etiqueta": "Activo", "total": 30, "porcentaje": 71.43 }],
  "por_tipo":    ["...mismo formato..."],
  "por_periodo": ["..."],
  "por_cohorte": ["..."],
  "por_tutor":   ["..."],
  "caracterizacion": {
    "origen_academico":     ["...mismo formato..."],
    "sector_tecnologico":   ["..."],
    "etapa_actual":         ["..."],
    "semestre_estudiantes": [{ "valor": 7, "etiqueta": "Semestre 7", "total": 20 }]
  },
  "madurez": {
    "distribucion": [{ "nivel": "M0", "etiqueta": "M0: Ideación Inicial", "total": 10, "porcentaje": 23.81 }, "... M9"],
    "nivel_promedio": 2.4, "proyectos_con_avance_madurez": 32, "tasa_avance_madurez": 76.19
  },
  "evaluacion": {
    "evaluaciones_registradas": 50, "evaluaciones_calificadas": 48,
    "proyectos_evaluados": 25, "nota_promedio": 3.85
  },
  "seguimiento": {
    "registros_avance": 80, "proyectos_con_avance": 28, "porcentaje_avance_promedio": 55.2,
    "actividades_total": 200, "actividades_completadas": 150, "actividades_vencidas": 12,
    "tasa_cumplimiento_actividades": 75.0, "evidencias_registradas": 140
  }
}
```

Cómo leer los datos:
- **Formato común.** Todos los `por_*` y los bloques de `caracterizacion` usan `{ valor, etiqueta, total, porcentaje }` y ya vienen ordenados de mayor a menor. Muestra `etiqueta`; usa `valor` para aplicar ese filtro cuando se haga clic en una barra.
- **Porcentajes.** Llegan en escala 0–100 y con 2 decimales; solo hay que agregar el `%`.
- **Valores que pueden ser `null`** cuando no hay datos: `nota_promedio`, `nivel_promedio` y `porcentaje_avance_promedio`. Muéstralos como "—", nunca como 0.
- **Madurez.** `madurez.distribucion` siempre trae los 10 niveles, aunque alguno esté en 0, así que sirve directo para un histograma M0–M9.
- **Escala de notas.** `nota_promedio` va de 0 a 5.
- **Dos indicadores de evaluación distintos.** `tasa_aprobacion_hitos` es el porcentaje de proyectos que **cumplen la regla de aprobación** (sección 2). `evaluacion.nota_promedio` es el **promedio de todas las notas** registradas. Presenta los dos por separado.

## 5. Errores

| Código | Significado | Qué hacer |
|---|---|---|
| 400 | Algún filtro llegó con un valor inválido | Ver el formato abajo |
| 401 | Token inválido o expirado | `apiClient` ya limpia la sesión; redirige al login |
| 403 | El rol activo no es Dirección del Programa | Mostrar "No tienes acceso a este módulo" |

En el 400, cada clave es el nombre del parámetro y su valor es **un mensaje de texto** (no una lista):

```json
{ "aprobado_hitos": "Debe ser true o false.",
  "fecha_hasta": "No puede ser anterior a fecha_desde." }
```

`apiClient` lanza un `Error` con `error.status` y `error.data`. En estos endpoints **lee `error.data`**: `error.message` sale genérico porque la respuesta no trae ni `error` ni `detail`. Si los selectores se llenan solo con las opciones de `filtros/`, en la práctica el único 400 posible es un rango de fechas invertido, y vale la pena validarlo antes de enviar.

## 6. Dónde integrarlo en el código actual

1. **Módulo nuevo** `frontend/src/modules/gestion_analitica/`, con la misma estructura que los demás:
   ```
   gestion_analitica/
     services/analiticaService.js
     pages/DashboardAnaliticaPage.jsx
     components/PanelFiltros.jsx
     components/TarjetasResumen.jsx
     components/GraficoBarras.jsx
     components/TablaProyectos.jsx
     hooks/useFiltrosAnalitica.js   (opcional)
   ```
2. **Menú.** En `modules/gestion_administrativa/pages/RoleDashboardPage.jsx`, el rol `direccion_del_programa` ya tiene los módulos `dashboard` ("Panel Estratégico") e `indicadores` ("Métricas para Acreditación"), pero hoy los dos muestran una tarjeta genérica. Agrega una rama a la cadena de condiciones de `activeModule`, antes del fallback:
   ```jsx
   ) : normalizedRole === "direccion_del_programa" && (activeModule === "dashboard" || activeModule === "indicadores") ? (
     <DashboardAnaliticaPage key="dashboard-analitica" />
   ) : ...
   ```
3. **Estilos.** Usa `components/ui` (`Tarjeta`, `CabeceraTarjeta`, `BOTON_PRIMARIO`, `SECCION`, `TARJETA`, `Cargando`, …) para mantener el estilo del resto de la app. Los íconos salen de `lucide-react`.
4. **Gráficas.** El proyecto **no tiene** librería de gráficas instalada. Para empezar alcanza con barras horizontales hechas con divs y Tailwind (ancho = `porcentaje%`). Si quieres agregar una librería, como Recharts, coordínalo antes con el equipo.

### Servicio sugerido

```js
// modules/gestion_analitica/services/analiticaService.js
import { apiClient } from "../../../services/apiClient"

// Arma el query string omitiendo vacíos; los arrays van separados por coma
export function construirQuery(filtros = {}) {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === "") return
    if (Array.isArray(valor)) {
      if (valor.length) params.set(clave, valor.join(","))
    } else {
      params.set(clave, String(valor)) // los booleanos salen como "true" / "false"
    }
  })
  const query = params.toString()
  return query ? `?${query}` : ""
}

export const getOpcionesFiltros = () => apiClient.get("/analitica/filtros/")

export const getMetricas = (filtros) =>
  apiClient.get(`/analitica/metricas/${construirQuery(filtros)}`)

export const getProyectos = (filtros, { page = 1, pageSize = 20, ordering = "-creado" } = {}) =>
  apiClient.get(
    `/analitica/proyectos/${construirQuery({ ...filtros, page, page_size: pageSize, ordering })}`,
  )
```

### Estado inicial de los filtros

```js
const FILTROS_INICIALES = {
  periodo: [], cohorte: [], estudiante: [], tutor: [],
  vigencia: "",        // "" | "activos" | "inactivos"
  estado: [],
  aprobado_hitos: "",  // "" (todos) | "true" | "false"
  tipo: [], origen_academico: [], sector_tecnologico: [], etapa_actual: [],
  semestre: [], nivel_madurez: [],
  con_tutor: "", fecha_desde: "", fecha_hasta: "", q: "",
}
```

### Flujo de la página

1. **Al montar**, pide `getOpcionesFiltros()` y llena los selectores.
2. **Cuando cambie cualquier filtro:**
   - vuelve a la **página 1**;
   - lanza `getMetricas(filtros)` y `getProyectos(filtros, {...})` en paralelo con `Promise.all`;
   - pasa el buscador `q` por un *debounce*.
3. **Al cambiar de página o de orden**, vuelve a pedir **solo** `getProyectos`.
4. **Filtros activos**: muéstralos como chips que se puedan quitar y agrega un botón **"Limpiar filtros"**. Para armar los chips puedes usar `filtros_aplicados` de la respuesta. Ahí `aprobado_hitos` llega como booleano (`true` / `false`).
5. **Clic en las tarjetas y gráficas** (opcional, pero muy útil):
   - en una barra de `por_tipo`, `por_estado`, `por_periodo` o `por_tutor`, agrega su `valor` al filtro correspondiente;
   - en la tarjeta "Aprobados por hitos", aplica `aprobado_hitos=true`.
6. **Estados de la interfaz:**
   - **Cargando**: skeleton o el componente `Cargando`.
   - **Vacío**: si `total_proyectos === 0`, mostrar "No hay proyectos con estos filtros".
   - **Error**: mensaje con opción de reintentar.

### Distribución sugerida

```
┌ Filtros ──────────────────────────────────────────────────────────────────────────┐
│ Periodo  Cohorte  Estudiante  Tutor  Vigencia  Aprobación por hitos  Tipo  [Más ▾] │
│ chips de filtros activos …                                     [Limpiar filtros]  │
└───────────────────────────────────────────────────────────────────────────────────┘
[Total proyectos] [Activos · tasa] [Aprobados por hitos · tasa] [Cobertura tutoría] [Estudiantes] [Nota promedio]
┌ Por estado ─────────┐ ┌ Por tipo ──────────┐ ┌ Madurez M0–M9 ───────┐
┌ Por periodo ────────┐ ┌ Por tutor ─────────┐ ┌ Seguimiento: actividades · avances · evidencias ┐
┌ Caracterización: origen académico · sector · semestre ──────────────────────────────┐
┌ Tabla de proyectos (paginada, ordenable) ───────────────────────────────────────────┐
```

## 7. Criterios de aceptación

- [ ] Con el rol `direccion_del_programa`, el dashboard aparece en "Panel Estratégico" y en "Métricas para Acreditación".
- [ ] Se puede filtrar por periodo, cohorte, estudiante, tutor y vigencia/estado, y combinar esos filtros.
- [ ] Se puede filtrar por **aprobación por hitos** (Todos / Aprobados / No aprobados), y la interfaz no la confunde con la aprobación en la convocatoria.
- [ ] La tabla muestra la insignia de aprobación por hitos y el resumen muestra el total y la tasa de aprobados.
- [ ] Se puede filtrar por tipo (emprendimiento / innovación) y por variables de caracterización (origen, sector, etapa, semestre, madurez).
- [ ] Indicadores y tabla se actualizan juntos con cualquier cambio de filtro.
- [ ] La tabla pagina y ordena.
- [ ] Los `null` se muestran como "—", nunca como 0.
- [ ] Los estados de cargando, vacío y error están cubiertos, y un 403 muestra un mensaje claro.
- [ ] `npm run lint` pasa sin errores nuevos.

## 8. Cómo probar en local

1. Levanta el backend con la rama `feat/HU-14-Bacckend-Metricas` (o `develop`, una vez se haga el merge).
2. Inicia sesión con un usuario que tenga el rol `direccion_del_programa` y elígelo como rol activo.
3. Para probar los endpoints sin la interfaz, usa Postman, Thunder Client o curl con la cabecera `Authorization: Bearer <token>`. El token está en `localStorage.token`. Abrir la URL en el navegador no sirve, porque así no se envía el token.
   - `GET http://localhost:8000/api/analitica/filtros/`
   - `GET http://localhost:8000/api/analitica/metricas/?vigencia=activos&tipo=emprendimiento`
   - `GET http://localhost:8000/api/analitica/proyectos/?aprobado_hitos=true&periodo=2026-1&ordering=nombre`
4. **Datos de prueba:**
   - Si no hay proyectos, aprueba alguna iniciativa: el proyecto se crea automáticamente.
   - Para ver un proyecto **aprobado por hitos**, la rúbrica de su tipo debe tener hitos y un evaluador debe calificar **todos** esos hitos con nota ≥ 3.

Si tienes dudas del contrato, revisa el código en `backend/gestion_analitica/`: filtros en `filtros.py`, métricas en `services.py` y vistas en `views.py`.
