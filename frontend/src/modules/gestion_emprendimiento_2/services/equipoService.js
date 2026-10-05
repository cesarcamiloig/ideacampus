import { apiClient } from "../../../services/apiClient";

// TODO: confirmar el endpoint exacto con el compañero de backend (gestion_emprendimiento_2)
export async function fetchEstudiantes() {
  return apiClient.get("/estudiantes/");
}

// TODO: confirmar el endpoint y la forma exacta del payload
export async function registerEquipo(equipo) {
  return apiClient.post("/equipos/", equipo);
}