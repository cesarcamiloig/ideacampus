import { apiClient } from "../../../services/apiClient";

// Contrato de registro y validación de avance. Crean el estudiante del proyecto y su tutor asignado;
// solo el tutor asignado valida.

// Proyectos sobre los que el usuario lleva el control de avance: [{ id, nombre, tipo }]
export async function getProyectosAvance() {
  return apiClient.get("/registros-avance/mis-proyectos/");
}

// { proyecto, nombre, etapas: [{ id, numero_hito, nombre, descripcion, evidencias, registros,
//   estado_validacion: "sin_registro" | "pendiente" | "aprobado" | "observado" }] }
export async function getTrayectoria(idProyecto) {
  return apiClient.get(`/registros-avance/trayectoria/?proyecto=${idProyecto}`);
}

// { proyecto, etapa, evidencias: [ids], estado_avance, porcentaje_avance, descripcion_avance,
//   dificultades, riesgos, recomendaciones }. Las evidencias deben estar publicadas en esa etapa.
export async function registrarAvance(datos) {
  return apiClient.post("/registros-avance/", datos);
}

// { comentario, aprobado }: aprobado=true valida el avance; false lo deja con observaciones
export async function retroalimentarAvance(idRegistro, datos) {
  return apiClient.post(`/registros-avance/${idRegistro}/retroalimentar/`, datos);
}
