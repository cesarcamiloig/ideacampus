import { apiClient } from "../../../services/apiClient";

// Contrato del backend de la HU-14 (app gestion_analitica). Todos los endpoints son GET,
// están bajo /api/analitica/ y solo responden al rol direccion_del_programa (403 para el resto).
// - GET /analitica/filtros/    opciones de los selectores (se pide una vez)
// - GET /analitica/metricas/   indicadores con los filtros aplicados
// - GET /analitica/proyectos/  tabla paginada (page, page_size, ordering) con los mismos filtros

// Arma el query string omitiendo vacíos; los arrays van separados por coma (OR dentro del filtro)
export function construirQuery(filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === "") return;
    if (Array.isArray(valor)) {
      if (valor.length) params.set(clave, valor.join(","));
    } else {
      params.set(clave, String(valor));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getOpcionesFiltros() {
  return apiClient.get("/analitica/filtros/");
}

export function getMetricas(filtros) {
  return apiClient.get(`/analitica/metricas/${construirQuery(filtros)}`);
}

export function getProyectos(filtros, { page = 1, pageSize = 20, ordering = "-creado" } = {}) {
  return apiClient.get(`/analitica/proyectos/${construirQuery({ ...filtros, page, page_size: pageSize, ordering })}`);
}

// Variantes que reciben el query ya armado: la página lo usa como clave de sus efectos
export function getMetricasPorQuery(query) {
  return apiClient.get(`/analitica/metricas/${query}`);
}

export function getProyectosPorQuery(query, { page = 1, pageSize = 20, ordering = "-creado" } = {}) {
  const paginacion = construirQuery({ page, page_size: pageSize, ordering }).slice(1);
  return apiClient.get(`/analitica/proyectos/${query ? `${query}&` : "?"}${paginacion}`);
}

// Mensaje legible de un error de estos endpoints. En el 400 cada clave es un parámetro y su
// valor un texto ({ fecha_hasta: "No puede ser anterior a fecha_desde." }), así que
// error.message sale genérico y hay que leer error.data.
export function mensajeErrorAnalitica(error) {
  if (error?.status === 403) return "No tienes acceso a este módulo. Solo la Dirección del Programa puede consultarlo.";
  if (error?.status === 404) return "El servicio de indicadores no está disponible en el servidor. Verifica que el backend tenga el módulo de analítica (HU-14).";
  if (error?.status >= 500) return "El servidor tuvo un problema al calcular los indicadores. Intenta de nuevo en unos minutos.";
  if (!error?.status) return "No pudimos conectarnos con el servidor. Revisa tu conexión o que el backend esté encendido.";
  const data = error?.data;
  if (error?.status === 400 && data && typeof data === "object") {
    const mensajes = Object.values(data).flat().filter((m) => typeof m === "string");
    if (mensajes.length) return mensajes.join(" ");
  }
  return error?.message || "No pudimos comunicarnos con el servidor.";
}
