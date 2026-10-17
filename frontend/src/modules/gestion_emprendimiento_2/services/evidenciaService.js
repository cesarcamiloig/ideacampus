import { apiClient } from "../../../services/apiClient";

// TODO: confirmar endpoint y formato del payload con el backend (GENNOVA-73/74)
// Se envía como FormData: etapa, titulo, descripcion, evidencias (JSON) y archivos.
export async function registerEvidencia(formData) {
  return apiClient.post("/evidencias/", formData);
}