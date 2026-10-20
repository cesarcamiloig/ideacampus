import { apiClient } from "../../../services/apiClient";

// HU-10 (GENNOVA-80): asignación de mentores a proyectos.
// Asignar y quitar solo los permite el rol coordinador (los demás reciben 403);
// consultar los mentores disponibles también lo pueden hacer admin y Dirección.

export const NIVELES_ACADEMICOS = {
  pregrado: "Pregrado",
  especializacion: "Especialización",
  maestria: "Maestría",
  doctorado: "Doctorado",
};

// El backend responde de tres formas distintas:
// - negocio:    { error: "..." }  (a veces { error: ["..."] } cuando viene de un ValidationError)
// - permisos:   { detail: "..." }
// - validación: { id_mentor: ["..."] } / { id_proyecto: ["..."] }
// Se toma el primer mensaje legible para no mostrar el genérico del apiClient.
function primerMensaje(valor) {
  if (!valor) return "";
  if (typeof valor === "string") return valor;
  if (Array.isArray(valor)) return primerMensaje(valor[0]);
  if (typeof valor === "object") return primerMensaje(Object.values(valor)[0]);
  return String(valor);
}

function mensajeDeError(err) {
  const data = err?.data;
  if (data && typeof data === "object") {
    const mensaje = primerMensaje(data.error) || primerMensaje(data.detail) || primerMensaje(data);
    if (mensaje) return mensaje;
  }
  return err?.message || "No pudimos comunicarnos con el servidor.";
}

async function llamar(peticion) {
  try {
    return await peticion();
  } catch (err) {
    const normalizado = new Error(mensajeDeError(err));
    normalizado.status = err?.status;
    normalizado.data = err?.data;
    throw normalizado;
  }
}

function comoLista(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

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
