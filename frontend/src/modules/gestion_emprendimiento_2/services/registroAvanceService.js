import { apiClient } from "../../../services/apiClient";

// Contrato de registro y revisión de avance. El estudiante del proyecto registra el avance;
// el tutor asignado lo revisa con recomendaciones y errores.

// Proyectos sobre los que el usuario lleva el control de avance: [{ id, nombre, tipo }]
export async function getProyectosAvance() {
  return apiClient.get("/registros-avance/mis-proyectos/");
}

// { proyecto, nombre, etapas: [{ id, numero_hito, nombre, descripcion, evidencias, registros,
//   estado_validacion: "sin_registro" | "pendiente" | "aprobado" | "observado" }] }
export async function getTrayectoria(idProyecto) {
  return apiClient.get(`/registros-avance/trayectoria/?proyecto=${idProyecto}`);
}

// Solo estudiantes: { proyecto, etapa, evidencias: [ids], descripcion_avance, dificultades, riesgos }.
// Las evidencias deben estar publicadas en esa etapa.
export async function registrarAvance(datos) {
  return apiClient.post("/registros-avance/", datos);
}

// Solo el tutor asignado: { recomendaciones, errores } (al menos uno). Si hay errores el avance
// queda con observaciones y se avisa al equipo; si no, queda validado.
export async function revisarAvance(idRegistro, datos) {
  return apiClient.post(`/registros-avance/${idRegistro}/retroalimentar/`, datos);
}
