import { apiClient } from "../../../services/apiClient";

// ==========================================
// Convocatorias Institucionales (HU-02)
// ==========================================

export async function getConvocatorias(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/convocatorias/${query ? `?${query}` : ""}`);
}

export async function getConvocatoriaById(id) {
  return apiClient.get(`/convocatorias/${id}/`);
}

export async function createConvocatoria(data) {
  return apiClient.post("/convocatorias/", data);
}

export async function updateConvocatoria(id, data) {
  return apiClient.put(`/convocatorias/${id}/`, data);
}

export async function patchConvocatoria(id, data) {
  return apiClient.patch(`/convocatorias/${id}/`, data);
}

export async function deleteConvocatoria(id) {
  return apiClient.delete(`/convocatorias/${id}/`);
}

export async function publicarConvocatoria(id) {
  return apiClient.post(`/convocatorias/${id}/publicar/`);
}

export async function cerrarConvocatoria(id) {
  return apiClient.post(`/convocatorias/${id}/cerrar/`);
}

export async function notificarConvocatoria(id, data = {}) {
  return apiClient.post(`/convocatorias/${id}/notificar/`, data);
}

// ==========================================
// Notificaciones de Convocatoria (HU-02)
// ==========================================

export async function getNotificacionesConvocatoria(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/notificaciones-convocatoria/${query ? `?${query}` : ""}`);
}

export async function marcarNotificacionLeida(id) {
  return apiClient.patch(`/notificaciones-convocatoria/${id}/leer/`);
}

export async function marcarTodasNotificacionesLeidas() {
  return apiClient.post("/notificaciones-convocatoria/marcar_todas_leidas/");
}

export async function getResumenNotificaciones() {
  return apiClient.get("/notificaciones-convocatoria/resumen/");
}
