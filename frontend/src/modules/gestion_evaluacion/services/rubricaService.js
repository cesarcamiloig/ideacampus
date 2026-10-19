import { apiClient } from "../../../services/apiClient"

// TODO: confirmar endpoints con el backend (GENNOVA-69).
// Formato basado en los modelos Rubrica → SubRubrica → CriterioRubrica:
// {
//   id, nombre, tipo_iniciativa: "emprendimiento" | "innovacion",
//   subrubricas: [{
//     id, numero_hito, nombre, descripcion, ponderacion,
//     criterios: [{ id, nombre, descripcion, ponderacion, escala_min, escala_max }]
//   }]
// }
// Solo existen dos rúbricas (una por tipo de iniciativa): no se crean ni se eliminan, solo se editan.
// En el PUT, los hitos y criterios nuevos se envían con id: null.

export function getRubricas() {
    return apiClient.get("/evaluacion/rubricas/")
}

export function updateRubrica(tipo, rubrica) {
    return apiClient.put(`/evaluacion/rubricas/${tipo}/`, rubrica)
}
