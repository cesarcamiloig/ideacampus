import { apiClient } from "../../../services/apiClient"

// Endpoints de rúbricas (GENNOVA-69). Modelos Rubrica → SubRubrica → CriterioRubrica:
// {
//   id, nombre, tipo_iniciativa: "emprendimiento" | "innovacion",
//   subrubricas: [{
//     id, numero_hito, nombre, descripcion, ponderacion: "15.00",
//     criterios: [{ id, nombre, descripcion, ponderacion: "35.00", escala_min, escala_max }]
//   }]
// }
// Solo existen dos rúbricas (una por tipo de iniciativa): no se crean ni se eliminan, solo se editan.
// El id de cada rúbrica no es fijo: se busca en la lista por tipo_iniciativa.
//
// Reglas del PUT (se envía la rúbrica completa, PATCH no está permitido):
// - Hito o criterio existente: se envía con su id y el backend lo actualiza.
// - Hito o criterio nuevo: se envía sin id y el backend lo crea.
// - Hito o criterio quitado: no se incluye y el backend lo borra.

export function getRubricas() {
    return apiClient.get("/rubricas/")
}

export function getRubrica(id) {
    return apiClient.get(`/rubricas/${id}/`)
}

// Solo los hitos (sin criterios) de la rúbrica de un tipo de iniciativa:
// [{ id, numero_hito, nombre, tipo_iniciativa }]
export function getHitos(tipoIniciativa) {
    return apiClient.get(`/rubricas/hitos/?tipo_iniciativa=${encodeURIComponent(tipoIniciativa)}`)
}

// Solo admin y direccion_del_programa. Responde con la rúbrica actualizada (los nuevos ya traen id).
export function updateRubrica(id, rubrica) {
    return apiClient.put(`/rubricas/${id}/`, rubrica)
}

// Responde { completa: boolean, problemas: string[] }
export function validarRubricaServidor(id) {
    return apiClient.get(`/rubricas/${id}/validar/`)
}
