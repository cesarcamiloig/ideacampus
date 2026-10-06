import { apiClient } from "../../../services/apiClient";

export async function fetchEstudiantes(filtro = "") {
  const query = filtro.trim() ? `?nombre=${encodeURIComponent(filtro.trim())}` : "";
  const estudiantes = await apiClient.get(`/estudiantes-disponibles/${query}`);
  return estudiantes.map(({ id_usuario, nombre, correo }) => ({
    id: id_usuario,
    nombre,
    correo,
  }));
}

export async function registerEquipo(equipo) {
  return apiClient.post("/equipos/crear/", equipo);
}

export async function obtenerMiEquipo() {
  return apiClient.get("/equipos/mi-equipo/");
}

export async function actualizarEquipo(idEquipo, datos) {
  return apiClient.patch(`/equipos/${idEquipo}/`, datos);
}

export async function eliminarMiembro(idEquipo, idUsuario) {
  return apiClient.delete(`/equipos/${idEquipo}/miembros/${idUsuario}/`);
}

export async function agregarMiembro(idEquipo, idUsuario) {
  return apiClient.post(`/equipos/${idEquipo}/miembros/`, { id_usuario: idUsuario });
}

export async function eliminarEquipo(idEquipo) {
  if (idEquipo) {
    return apiClient.delete(`/equipos/${idEquipo}/`);
  }
  return apiClient.delete("/equipos/mi-equipo/");
}

export async function obtenerMisIniciativasAprobadas() {
  try {
    const data = await apiClient.get("/iniciativas/mis-aprobadas/");
    return Array.isArray(data) ? data : data?.results || [];
  } catch (err) {
    try {
      const data = await apiClient.get("/iniciativas/");
      const lista = Array.isArray(data) ? data : data?.results || [];
      const estadosAprobados = ["aprobada", "aprobado", "aceptada", "aceptado", "validada", "validado"];
      return lista.filter(
        (i) => estadosAprobados.includes((i.estado || "").toLowerCase().trim()) && !i.tiene_equipo
      );
    } catch {
      return [];
    }
  }
}