// Filtros del dashboard de Dirección (HU-14).
// Por decisión del equipo no se filtra por cohorte ni por estado puntual del proyecto:
// la vigencia (activos / inactivos) cubre el seguimiento de si el proyecto sigue en marcha.

export const FILTROS_INICIALES = {
  q: "",
  periodo: "",
  estudiante: "",
  tutor: "",
  vigencia: "", // "" | "activos" | "inactivos"
  aprobado_hitos: "", // "" (todos) | "true" | "false"
  tipo: "",
  anio: "",
  origen_academico: "",
  sector_tecnologico: "",
  etapa_actual: "",
  semestre: "",
  nivel_madurez: "",
  con_tutor: "",
  fecha_desde: "",
  fecha_hasta: "",
};

// Filtros que van dentro de "Más filtros"
export const FILTROS_AVANZADOS = [
  "anio", "origen_academico", "sector_tecnologico", "etapa_actual",
  "semestre", "nivel_madurez", "con_tutor", "fecha_desde", "fecha_hasta",
];

export const ETIQUETAS_FILTRO = {
  q: "Búsqueda",
  periodo: "Periodo",
  estudiante: "Estudiante",
  tutor: "Tutor",
  vigencia: "Vigencia",
  aprobado_hitos: "Aprobación por hitos",
  tipo: "Tipo",
  anio: "Año",
  origen_academico: "Origen académico",
  sector_tecnologico: "Sector tecnológico",
  etapa_actual: "Etapa",
  semestre: "Semestre",
  nivel_madurez: "Madurez",
  con_tutor: "Tutoría",
  fecha_desde: "Creado desde",
  fecha_hasta: "Creado hasta",
};

const VIGENCIAS_POR_DEFECTO = [
  { valor: "activos", etiqueta: "Activos" },
  { valor: "inactivos", etiqueta: "Inactivos" },
];

const TIPOS_POR_DEFECTO = [
  { valor: "emprendimiento", etiqueta: "Emprendimiento" },
  { valor: "innovacion", etiqueta: "Innovación" },
];

const lista = (valor) => (Array.isArray(valor) ? valor : []);

// Convierte la respuesta de /analitica/filtros/ en opciones { valor, texto } para cada control
export function construirOpciones(datos = {}) {
  const periodos = lista(datos.periodos);
  return {
    periodo: periodos.map((p) => ({ valor: String(p.id), texto: p.es_vigente ? `${p.nombre} (vigente)` : p.nombre })),
    estudiante: lista(datos.estudiantes).map((e) => ({
      valor: String(e.id),
      texto: e.codigo ? `${e.nombre} · ${e.codigo}` : e.nombre,
    })),
    tutor: lista(datos.tutores).map((t) => ({ valor: String(t.id), texto: t.nombre })),
    vigencia: (lista(datos.vigencias).length ? datos.vigencias : VIGENCIAS_POR_DEFECTO).map((v) => ({ valor: v.valor, texto: v.etiqueta })),
    aprobado_hitos: [
      { valor: "true", texto: "Aprobados" },
      { valor: "false", texto: "No aprobados" },
    ],
    tipo: (lista(datos.tipos).length ? datos.tipos : TIPOS_POR_DEFECTO).map((t) => ({ valor: t.valor, texto: t.etiqueta })),
    anio: [...new Set(periodos.map((p) => p.anio).filter(Boolean))]
      .sort((a, b) => b - a)
      .map((a) => ({ valor: String(a), texto: String(a) })),
    origen_academico: lista(datos.origenes_academicos).map((o) => ({ valor: o.valor, texto: o.etiqueta })),
    sector_tecnologico: lista(datos.sectores_tecnologicos).map((s) => ({ valor: s, texto: s })),
    etapa_actual: lista(datos.etapas).map((e) => ({ valor: e, texto: e })),
    semestre: lista(datos.semestres).map((s) => ({ valor: String(s), texto: `Semestre ${s}` })),
    nivel_madurez: lista(datos.niveles_madurez).map((n) => ({ valor: n.valor, texto: n.etiqueta })),
    con_tutor: [
      { valor: "true", texto: "Con tutor" },
      { valor: "false", texto: "Sin tutor" },
    ],
  };
}

// Chips de los filtros activos: [{ clave, texto }]
export function chipsFiltros(filtros, opciones) {
  return Object.entries(filtros)
    .filter(([, valor]) => valor !== "")
    .map(([clave, valor]) => {
      const opcion = opciones[clave]?.find((o) => o.valor === valor);
      return { clave, texto: `${ETIQUETAS_FILTRO[clave]}: ${opcion?.texto ?? valor}` };
    });
}

export function contarAvanzados(filtros) {
  return FILTROS_AVANZADOS.filter((clave) => filtros[clave] !== "").length;
}

// El único 400 posible con opciones del backend es un rango invertido: se valida antes de enviar
export function errorRangoFechas(filtros) {
  if (filtros.fecha_desde && filtros.fecha_hasta && filtros.fecha_hasta < filtros.fecha_desde) {
    return "La fecha final no puede ser anterior a la inicial.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Formatos (los null del backend se muestran como "—", nunca como 0)
// ---------------------------------------------------------------------------

export function formatoPorcentaje(valor) {
  return valor == null ? "—" : `${String(Math.round(valor * 10) / 10).replace(".", ",")}%`;
}

export function formatoDecimal(valor, decimales = 2) {
  return valor == null ? "—" : Number(valor).toFixed(decimales).replace(".", ",");
}

export function formatoFecha(iso) {
  if (!iso) return "—";
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? "—"
    : fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}
