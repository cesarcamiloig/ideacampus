import { apiClient } from "../../../services/apiClient";
import { comoLista, llamar } from "./errores";

// HU-10 (GENNOVA-80): asignación de mentores a proyectos.
// Asignar y quitar solo los permite el rol coordinador (los demás reciben 403);
// consultar los mentores disponibles también lo pueden hacer admin y Dirección.

// Mentores activos. Con idProyecto, excluye a los que ya están asignados a ese proyecto.
export async function getMentoresDisponibles(idProyecto) {
  const query = idProyecto ? `?id_proyecto=${encodeURIComponent(idProyecto)}` : "";
  const data = await llamar(() => apiClient.get(`/proyectos/mentores/disponibles/${query}`));
  return comoLista(data);
}

// TODO(HU-10): reemplazar por un GET real de los mentores asignados al proyecto cuando el
// backend lo exponga. Mientras tanto se deducen: son los mentores activos que NO aparecen
// entre los disponibles para el proyecto. No incluye mentores asignados que hoy estén inactivos.
export async function getMentoresDelProyecto(idProyecto) {
  const [activos, disponibles] = await Promise.all([
    getMentoresDisponibles(),
    getMentoresDisponibles(idProyecto),
  ]);
  const idsDisponibles = new Set(disponibles.map((m) => m.id_mentor));
  return {
    asignados: activos.filter((m) => !idsDisponibles.has(m.id_mentor)),
    disponibles,
    totalActivos: activos.length,
  };
}

export async function getMentoresAsignados(idProyecto) {
  const { asignados } = await getMentoresDelProyecto(idProyecto);
  return asignados;
}

// El backend distingue la asignación nueva (201) de la reactivación (200), pero el apiClient
// solo entrega el JSON; la reactivación se reconoce por su mensaje. Hoy solo se reactivan los
// registros inactivos que quedaron de cuando quitar un mentor era un soft delete.
export async function asignarMentor(idProyecto, idMentor) {
  const data = await llamar(() =>
    apiClient.post(`/proyectos/${idProyecto}/mentores/`, { id_mentor: Number(idMentor) })
  );
  return {
    message: data?.message || "",
    asignacion: data?.asignacion || null,
    reactivada: /reactivad/i.test(data?.message || ""),
  };
}

// Elimina la asignación de proyecto_mentor; volver a asignar al mentor crea una nueva
export async function desasignarMentor(idProyecto, idMentor) {
  const data = await llamar(() => apiClient.delete(`/proyectos/${idProyecto}/mentores/${idMentor}/`));
  return { message: data?.message || "", asignacion: data?.asignacion || null };
}

// El listado de iniciativas no trae id_proyecto; esta consulta sí (solo iniciativas aprobadas).
// Devuelve null cuando la iniciativa todavía no tiene proyecto (el backend responde 400).
export async function getProyectoDeIniciativa(idIniciativa) {
  try {
    const data = await llamar(() => apiClient.get(`/iniciativas/${idIniciativa}/tutor/`));
    return data?.id_proyecto ?? null;
  } catch (err) {
    if (err.status === 400) return null;
    throw err;
  }
}
