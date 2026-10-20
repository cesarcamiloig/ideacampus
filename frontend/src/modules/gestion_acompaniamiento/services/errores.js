// Normalización de errores de la API para los servicios de acompañamiento (mentores y tutores).
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

// Ejecuta la petición y, si falla, relanza un Error con el mensaje legible, status y data
export async function llamar(peticion) {
  try {
    return await peticion();
  } catch (err) {
    const normalizado = new Error(mensajeDeError(err));
    normalizado.status = err?.status;
    normalizado.data = err?.data;
    throw normalizado;
  }
}

export function comoLista(data) {
  return Array.isArray(data) ? data : data?.results || [];
}
