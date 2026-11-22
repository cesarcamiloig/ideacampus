// Ruta pública del catálogo: se puede compartir y se abre sin iniciar sesión
export const RUTA_CATALOGO = "/catalogo";

export const TIPOS = [
  { valor: "emprendimiento", texto: "Emprendimiento" },
  { valor: "innovacion", texto: "Innovación" },
];

export const ORIGENES = [
  { valor: "asignatura", texto: "Asignatura" },
  { valor: "proyecto_aula", texto: "Proyecto de Aula" },
  { valor: "integrador", texto: "Proyecto Integrador" },
  { valor: "semillero", texto: "Semillero de Investigación" },
  { valor: "practica", texto: "Práctica Profesional" },
  { valor: "trabajo_grado", texto: "Trabajo de Grado" },
];

// "aprobada" agrupa en el backend las iniciativas aprobadas y aceptadas
export const ESTADOS = [
  { valor: "pendiente", texto: "Pendiente" },
  { valor: "en_revision", texto: "En revisión" },
  { valor: "aprobada", texto: "Aprobada" },
  { valor: "rechazada", texto: "Rechazada" },
];

export const OPCIONES_CATALOGO = [
  { valor: "publicadas", texto: "Publicadas en el catálogo" },
  { valor: "no_publicadas", texto: "No publicadas" },
];

export function formatoFecha(valor) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function nombreInforme(extension) {
  const hoy = new Date();
  const dos = (n) => String(n).padStart(2, "0");
  return `informe_iniciativas_${hoy.getFullYear()}${dos(hoy.getMonth() + 1)}${dos(hoy.getDate())}.${extension}`;
}

// Guarda un Blob en el equipo con el nombre indicado
export function guardarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
