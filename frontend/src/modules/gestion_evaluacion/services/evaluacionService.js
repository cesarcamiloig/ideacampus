import { apiClient } from "../../../services/apiClient"

// Contrato de la evaluación de hitos (HU-09). Solo el rol evaluador crea y edita;
// admin, Dirección del Programa y coordinación consultan todas las evaluaciones.
//
// Proyecto por evaluar (GET /evaluaciones/mis-proyectos/):
// { id, nombre_iniciativa, tipo: "emprendimiento" | "innovacion", hitos_evaluados, hitos_totales }
//
// Evaluación (una por proyecto + hito + evaluador):
// { id, proyecto, subrubrica, subrubrica_nombre, evaluador, evaluador_nombre,
//   nota_final: "4.25", comentario, creado,
//   notas: [{ criterio, criterio_nombre, nota: "4.00", comentario }] }
// nota_final va de 0 a 5 y la calcula el backend con las ponderaciones de los criterios.
//
// POST /evaluaciones/ { proyecto, subrubrica, comentario, notas: [{ criterio, nota, comentario }] }
// PUT  /evaluaciones/:id/ { comentario, notas } (reemplaza todas las notas)
// - Se debe calificar cada criterio del hito una sola vez, dentro de su escala.
// - El hito necesita al menos una evidencia registrada para poder evaluarse.
//
// Resultados (GET /proyectos/:id/resultados/):
// { nota_global: "3.80" | null, parcial, hitos_evaluados, hitos_totales,
//   hitos: [{ numero_hito, nombre, ponderacion, nota: "4.10" | null, evaluado }] }
// La nota de cada hito es el promedio de todos sus evaluadores.

function lista(data) {
    return Array.isArray(data) ? data : data?.results || []
}

export async function getMisProyectosPorEvaluar() {
    return lista(await apiClient.get("/evaluaciones/mis-proyectos/"))
}

// Filtros: { proyecto, subrubrica }. El evaluador solo recibe las suyas.
export async function getEvaluaciones(filtros = {}) {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([clave, valor]) => {
        if (valor !== undefined && valor !== null && valor !== "") params.append(clave, valor)
    })
    const texto = params.toString()
    return lista(await apiClient.get(`/evaluaciones/${texto ? `?${texto}` : ""}`))
}

export function crearEvaluacion(datos) {
    return apiClient.post("/evaluaciones/", datos)
}

export function actualizarEvaluacion(idEvaluacion, datos) {
    return apiClient.put(`/evaluaciones/${idEvaluacion}/`, datos)
}

export function getResultadosProyecto(idProyecto) {
    return apiClient.get(`/proyectos/${idProyecto}/resultados/`)
}
