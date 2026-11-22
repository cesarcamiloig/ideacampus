import { apiClient } from "../../../services/apiClient";
import { comoLista, llamar } from "../../gestion_acompaniamiento/services/errores";

// Contrato de la HU-15: catálogo público de iniciativas autorizadas e informes exportables.
// El catálogo público no requiere sesión; la gestión y los informes son del coordinador.

function consulta(filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && String(valor).trim() !== "") params.set(clave, valor);
  });
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

// Fichas públicas: { id_iniciativa, nombre, tipo, tipo_display, origen_academico, origen_academico_display,
// detalle_origen, sector_tecnologico, convocatoria, equipo, nivel_madurez, nivel_madurez_display,
// resumen_publico, resultados, fecha_publicacion }
export async function getCatalogoPublico() {
  const data = await llamar(() => apiClient.get("/catalogo/publico/", { auth: false }));
  return comoLista(data);
}

// Iniciativas aprobadas con su estado en el catálogo:
// { id_iniciativa, radicado, nombre, descripcion, tipo_display, origen_academico_display, convocatoria,
//   postulante, equipo, nivel_madurez_display, en_catalogo,
//   publicacion: { publicada, resumen_publico, resultados, autorizado_por_nombre, fecha_publicacion } | null }
export async function getCatalogoGestion() {
  const data = await llamar(() => apiClient.get("/catalogo/gestion/"));
  return comoLista(data);
}

// { publicada, resumen_publico, resultados }. Publicar exige iniciativa aprobada y resumen.
export async function guardarPublicacion(idIniciativa, datos) {
  return llamar(() => apiClient.put(`/catalogo/gestion/${idIniciativa}/`, datos));
}

// Filtros: estado, tipo, origen, convocatoria, desde, hasta (AAAA-MM-DD), catalogo.
// Respuesta: { total, con_proyecto, publicadas_catalogo, por_estado, por_tipo, por_origen,
//   por_madurez: [{ etiqueta, total }], convocatorias: [{ id, nombre }] }
export async function getResumenInforme(filtros) {
  return llamar(() => apiClient.get(`/informes/iniciativas/resumen/${consulta(filtros)}`));
}

// Devuelve un Blob con el informe en formato "xlsx" o "csv"
export async function descargarInforme(filtros, formato) {
  return llamar(() => apiClient.download(`/informes/iniciativas/exportar/${consulta({ ...filtros, formato })}`));
}
