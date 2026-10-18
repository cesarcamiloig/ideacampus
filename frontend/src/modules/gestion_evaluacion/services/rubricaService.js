import { apiClient } from "../../../services/apiClient"

// TODO: confirmar endpoints y formato con el backend (GENNOVA-69).
// Formato propuesto para cada rúbrica:
// {
//   id_rubrica, tipo: "emprendimiento" | "innovacion", nombre,
//   criterios: [{ id_criterio, nombre, descripcion, peso, orden }]
// }
// Solo existen dos rúbricas (una por tipo de iniciativa): no se crean ni se eliminan, solo se editan.

export function getRubricas() {
    return apiClient.get("/evaluacion/rubricas/")
}

export function updateRubrica(tipo, rubrica) {
    return apiClient.put(`/evaluacion/rubricas/${tipo}/`, rubrica)
}
