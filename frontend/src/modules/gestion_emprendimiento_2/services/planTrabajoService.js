import { apiClient } from "../../../services/apiClient";

// Contrato del plan de trabajo (HU-20). Un proyecto tiene un plan por hito de su rúbrica
// y cada plan agrupa sus actividades. Solo el líder del equipo crea, edita o elimina;
// los integrantes, el tutor y los demás roles institucionales solo consultan.
//
// Plan de trabajo:
// { id_plan_trabajo, proyecto, proyecto_nombre, hito, hito_nombre, numero_hito, titulo,
//   descripcion, estado: "pendiente" | "en_curso" | "finalizado", fecha_inicio, fecha_fin,
//   total_actividades, actividades_completadas, fecha_creacion, fecha_actualizacion }
// Proyecto e hito no se pueden cambiar después de crear el plan.
//
// Actividad:
// { id, plan_trabajo, proyecto, hito, hito_nombre, responsable, responsable_nombre,
//   creado_por, creado_por_nombre, nombre, descripcion, entregable, fecha_inicio, fecha_fin,
//   estado: "pendiente" | "completada", fecha_completada, creado }
// El responsable debe ser integrante del equipo (id_usuario). El estado no se envía:
// pasa a "completada" cuando el responsable sube la evidencia de la actividad.
// Las fechas van en formato "YYYY-MM-DD".

function lista(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

function query(filtros) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "") params.append(clave, valor);
  });
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

// Filtros: { proyecto, hito, estado }
export async function getPlanesTrabajo(filtros = {}) {
  return lista(await apiClient.get(`/plan-trabajo/${query(filtros)}`));
}

export async function crearPlanTrabajo(datos) {
  return apiClient.post("/plan-trabajo/", datos);
}

export async function actualizarPlanTrabajo(idPlan, datos) {
  return apiClient.patch(`/plan-trabajo/${idPlan}/`, datos);
}

// Elimina también todas sus actividades; responde 204 sin contenido
export async function eliminarPlanTrabajo(idPlan) {
  return apiClient.delete(`/plan-trabajo/${idPlan}/`);
}

// Filtros: { plan_trabajo, proyecto, hito, estado }
export async function getActividades(filtros = {}) {
  return lista(await apiClient.get(`/actividad/${query(filtros)}`));
}

export async function crearActividad(datos) {
  return apiClient.post("/actividad/", datos);
}

export async function actualizarActividad(idActividad, datos) {
  return apiClient.patch(`/actividad/${idActividad}/`, datos);
}

export async function eliminarActividad(idActividad) {
  return apiClient.delete(`/actividad/${idActividad}/`);
}
