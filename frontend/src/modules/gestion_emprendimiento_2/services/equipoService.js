import { apiClient } from "../../../services/apiClient";

export async function fetchEstudiantes() {
  const estudiantes = await apiClient.get("/estudiantes-disponibles/");
  return estudiantes.map(({ id_usuario, nombre, correo }) => ({
    id: id_usuario,
    nombre,
    correo,
  }));
}

export async function registerEquipo(equipo) {
  return apiClient.post("/equipos/crear/", equipo);
}