import { apiClient } from "../../../services/apiClient";

// ==========================================
// Variables de Caracterización
// ==========================================
export async function getVariables() {
  return apiClient.get("/parametros/variables/");
}

export async function createVariable(data) {
  return apiClient.post("/parametros/variables/", data);
}

export async function updateVariable(id, data) {
  return apiClient.put(`/parametros/variables/${id}/`, data);
}

export async function toggleVariableActive(id, isActive) {
  return apiClient.patch(`/parametros/variables/${id}/`, { isActive });
}

// ==========================================
// Periodos / Ciclos Académicos
// ==========================================
export async function getPeriodos() {
  return apiClient.get("/parametros/periodos/");
}

export async function createPeriodo(data) {
  return apiClient.post("/parametros/periodos/", data);
}

export async function updatePeriodo(id, data) {
  return apiClient.put(`/parametros/periodos/${id}/`, data);
}

export async function setPeriodoCurrent(id) {
  return apiClient.post(`/parametros/periodos/${id}/hacer-vigente/`);
}

export async function togglePeriodoActive(id, isActive) {
  return apiClient.patch(`/parametros/periodos/${id}/`, { isActive });
}

// ==========================================
// Roles y Usuarios
// ==========================================
export async function getRolesCatalogo() {
  return apiClient.get("/parametros/roles/");
}

export async function getUsuarios() {
  return apiClient.get("/parametros/usuarios/");
}

export async function updateUsuarioRoles(idUsuario, roles) {
  return apiClient.put(`/parametros/usuarios/${idUsuario}/roles/`, { roles });
}

export async function toggleUsuarioActive(idUsuario, isActive) {
  return apiClient.patch(`/parametros/usuarios/${idUsuario}/`, { isActive });
}

