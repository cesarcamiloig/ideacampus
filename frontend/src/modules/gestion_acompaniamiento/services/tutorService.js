import { apiClient } from "../../../services/apiClient";

// TODO: confirmar el endpoint exacto con el equipo de GENNOVA-53
export async function registerTutorProfile(perfil) {
  return apiClient.post("/tutores/", perfil);
}