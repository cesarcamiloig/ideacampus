// Cálculo de indicadores del dashboard de Dirección (HU-14).
// Todo se calcula en el navegador a partir de los datos que ya expone la API:
// cada registro es una iniciativa enriquecida con su periodo, tutor, madurez y nota.

import { numeroNivel } from "../../gestion_evaluacion/utils/madurezUtils";

// Estados de una iniciativa con el mismo distintivo que el Banco de Iniciativas
export const ESTADOS_INICIATIVA = {
  pendiente: { label: "Pendiente", tono: "gris" },
  en_revision: { label: "En revisión", tono: "oscuro" },
  aprobada: { label: "Aprobada", tono: "rojo" },
  rechazada: { label: "Rechazada", tono: "alerta" },
};

export const ORDEN_ESTADOS = ["pendiente", "en_revision", "aprobada", "rechazada"];

export const ORIGENES_ACADEMICOS = {
  asignatura: "Asignatura",
  proyecto_aula: "Proyecto de aula",
  integrador: "Proyecto integrador",
  semillero: "Semillero de investigación",
  practica: "Práctica profesional",
  trabajo_grado: "Trabajo de grado",
};

export const TIPOS_INICIATIVA = {
  emprendimiento: "Emprendimiento",
  innovacion: "Innovación",
};

export const NIVELES_MADUREZ = ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"];

// Valor del filtro de tutor para los proyectos que aún no tienen uno
export const SIN_TUTOR = "__sin_tutor__";

export const FILTROS_VACIOS = { periodo: "", cohorte: "", estudiante: "", tutor: "", estado: "" };

export function normalizarEstado(estado) {
  const e = String(estado || "").trim().toLowerCase();
  if (["aprobada", "aprobado", "aceptada", "aceptado"].includes(e)) return "aprobada";
  if (["rechazada", "rechazado"].includes(e)) return "rechazada";
  if (e === "en_revision") return "en_revision";
  return "pendiente";
}

// Semestre académico a partir de la fecha, para convocatorias sin periodo registrado
function periodoPorFecha(fecha) {
  if (!fecha) return "Sin periodo";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "Sin periodo";
  return `${d.getFullYear()}-${d.getMonth() < 6 ? 1 : 2}`;
}

function promedio(valores) {
  const validos = valores.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (validos.length === 0) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

// Nota promedio (0 a 5) de cada proyecto a partir de todas sus evaluaciones de hitos
export function notasPorProyecto(evaluaciones = []) {
  const grupos = new Map();
  for (const ev of evaluaciones) {
    const nota = Number.parseFloat(ev?.nota_final);
    if (ev?.proyecto == null || Number.isNaN(nota)) continue;
    if (!grupos.has(ev.proyecto)) grupos.set(ev.proyecto, []);
    grupos.get(ev.proyecto).push(nota);
  }
  const resultado = new Map();
  for (const [proyecto, notas] of grupos) resultado.set(proyecto, promedio(notas));
  return resultado;
}

// Une las fuentes en un registro plano por iniciativa
export function construirRegistros({ iniciativas = [], convocatorias = [], tutores = new Map(), madurez = new Map(), notas = new Map() }) {
  const periodoDeConvocatoria = new Map(convocatorias.map((c) => [c.id_convocatoria, c.periodo_nombre || null]));

  return iniciativas.map((item) => {
    const idProyecto = item.proyecto?.id_proyecto ?? null;
    const nivel = idProyecto != null ? madurez.get(idProyecto) ?? null : null;
    const anio = item.fecha_postulacion ? new Date(item.fecha_postulacion).getFullYear() : "";
    return {
      id: item.id_iniciativa,
      nombre: item.nombre || "Iniciativa sin nombre",
      radicado: item.radicado || `UFPS-POST-${anio}-${String(item.id_iniciativa).padStart(4, "0")}`,
      estudiante: item.usuario_nombre || "Estudiante sin nombre",
      idEstudiante: item.usuario ?? item.usuario_correo ?? item.usuario_nombre,
      correo: item.usuario_correo || "",
      tipo: item.tipo || "",
      origen: item.origen_academico || "",
      estado: normalizarEstado(item.estado),
      idConvocatoria: item.convocatoria,
      cohorte: item.convocatoria_nombre || "Convocatoria sin nombre",
      periodo: periodoDeConvocatoria.get(item.convocatoria) || periodoPorFecha(item.fecha_postulacion),
      fecha: item.fecha_postulacion || null,
      idProyecto,
      tieneEquipo: Boolean(item.tiene_equipo),
      tutor: tutores.get(item.id_iniciativa) || null,
      madurez: nivel,
      madurezNum: nivel ? numeroNivel(nivel) : null,
      nota: idProyecto != null ? notas.get(idProyecto) ?? null : null,
    };
  });
}

function opcionesUnicas(registros, clave, etiqueta = (v) => v) {
  const valores = [...new Set(registros.map((r) => r[clave]).filter(Boolean))];
  return valores.sort((a, b) => String(a).localeCompare(String(b), "es")).map((v) => ({ valor: v, texto: etiqueta(v) }));
}

// Opciones de cada filtro a partir de todos los registros (no se reducen al filtrar)
export function opcionesFiltros(registros) {
  const estudiantes = new Map();
  for (const r of registros) estudiantes.set(String(r.idEstudiante), r.estudiante);

  const tutores = opcionesUnicas(registros, "tutor");
  if (registros.some((r) => r.idProyecto != null && !r.tutor)) {
    tutores.push({ valor: SIN_TUTOR, texto: "Sin tutor asignado" });
  }

  return {
    periodos: opcionesUnicas(registros, "periodo"),
    cohortes: opcionesUnicas(registros, "cohorte"),
    estudiantes: [...estudiantes.entries()]
      .map(([valor, texto]) => ({ valor, texto }))
      .sort((a, b) => a.texto.localeCompare(b.texto, "es")),
    tutores,
    estados: ORDEN_ESTADOS.map((e) => ({ valor: e, texto: ESTADOS_INICIATIVA[e].label })),
  };
}

export function aplicarFiltros(registros, filtros) {
  return registros.filter((r) => {
    if (filtros.periodo && r.periodo !== filtros.periodo) return false;
    if (filtros.cohorte && r.cohorte !== filtros.cohorte) return false;
    if (filtros.estudiante && String(r.idEstudiante) !== filtros.estudiante) return false;
    if (filtros.estado && r.estado !== filtros.estado) return false;
    if (filtros.tutor === SIN_TUTOR) {
      if (r.idProyecto == null || r.tutor) return false;
    } else if (filtros.tutor && r.tutor !== filtros.tutor) {
      return false;
    }
    return true;
  });
}

export function hayFiltros(filtros) {
  return Object.values(filtros).some(Boolean);
}

// Cifras principales del tablero
export function calcularIndicadores(registros) {
  const total = registros.length;
  const aprobadas = registros.filter((r) => r.estado === "aprobada").length;
  const rechazadas = registros.filter((r) => r.estado === "rechazada").length;
  const dictaminadas = aprobadas + rechazadas;
  const proyectos = registros.filter((r) => r.idProyecto != null);
  const conTutor = proyectos.filter((r) => r.tutor).length;
  const conMadurez = proyectos.filter((r) => r.madurezNum != null);
  const sobreM0 = conMadurez.filter((r) => r.madurezNum > 0).length;
  const evaluados = proyectos.filter((r) => r.nota != null);

  return {
    total,
    estudiantes: new Set(registros.map((r) => String(r.idEstudiante))).size,
    aprobadas,
    dictaminadas,
    tasaAprobacion: dictaminadas ? aprobadas / dictaminadas : null,
    proyectos: proyectos.length,
    conTutor,
    coberturaTutoria: proyectos.length ? conTutor / proyectos.length : null,
    madurezPromedio: promedio(conMadurez.map((r) => r.madurezNum)),
    proyectosConMadurez: conMadurez.length,
    sobreM0,
    notaPromedio: promedio(evaluados.map((r) => r.nota)),
    proyectosEvaluados: evaluados.length,
  };
}

function contarPor(registros, clave) {
  const conteo = new Map();
  for (const r of registros) {
    const valor = r[clave];
    if (!valor) continue;
    conteo.set(valor, (conteo.get(valor) || 0) + 1);
  }
  return conteo;
}

export function distribucionEstados(registros) {
  const conteo = contarPor(registros, "estado");
  return ORDEN_ESTADOS.map((e) => ({ clave: e, etiqueta: ESTADOS_INICIATIVA[e].label, valor: conteo.get(e) || 0 }));
}

export function distribucionOrigen(registros) {
  const conteo = contarPor(registros, "origen");
  return [...conteo.entries()]
    .map(([clave, valor]) => ({ clave, etiqueta: ORIGENES_ACADEMICOS[clave] || clave.replace(/_/g, " "), valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function distribucionTipo(registros) {
  const conteo = contarPor(registros, "tipo");
  return Object.keys(TIPOS_INICIATIVA).map((t) => ({ clave: t, etiqueta: TIPOS_INICIATIVA[t], valor: conteo.get(t) || 0 }));
}

// Proyectos por nivel de madurez M0-M9 (solo proyectos con nivel conocido)
export function distribucionMadurez(registros) {
  const conteo = contarPor(registros.filter((r) => r.idProyecto != null), "madurez");
  return NIVELES_MADUREZ.map((n) => ({ clave: n, etiqueta: n, valores: { proyectos: conteo.get(n) || 0 } }));
}

// Radicadas frente a aprobadas en cada periodo, en orden cronológico
export function evolucionPorPeriodo(registros) {
  const grupos = new Map();
  for (const r of registros) {
    if (!grupos.has(r.periodo)) grupos.set(r.periodo, { radicadas: 0, aprobadas: 0 });
    const g = grupos.get(r.periodo);
    g.radicadas += 1;
    if (r.estado === "aprobada") g.aprobadas += 1;
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => String(a).localeCompare(String(b), "es", { numeric: true }))
    .map(([periodo, valores]) => ({ clave: periodo, etiqueta: periodo, valores }));
}

// Proyectos acompañados por cada tutor con su madurez promedio
export function cargaPorTutor(registros) {
  const grupos = new Map();
  for (const r of registros) {
    if (r.idProyecto == null || !r.tutor) continue;
    if (!grupos.has(r.tutor)) grupos.set(r.tutor, []);
    grupos.get(r.tutor).push(r);
  }
  return [...grupos.entries()]
    .map(([tutor, lista]) => {
      const madurez = promedio(lista.map((r) => r.madurezNum));
      return {
        clave: tutor,
        etiqueta: tutor,
        valor: lista.length,
        detalle: madurez == null ? "Sin madurez registrada" : `Madurez promedio ${formatoMadurez(madurez)}`,
      };
    })
    .sort((a, b) => b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, "es"));
}

// ---------------------------------------------------------------------------
// Formatos
// ---------------------------------------------------------------------------

export function formatoPorcentaje(valor) {
  return valor == null ? "—" : `${Math.round(valor * 100)}%`;
}

export function formatoMadurez(valor) {
  return valor == null ? "—" : `M${valor.toFixed(1).replace(".", ",")}`;
}

export function formatoNota(valor) {
  return valor == null ? "—" : valor.toFixed(2).replace(".", ",");
}

// ---------------------------------------------------------------------------
// Exportación CSV (separador ";" y BOM para que Excel en español la abra bien)
// ---------------------------------------------------------------------------

function celdaCsv(valor) {
  const texto = valor == null ? "" : String(valor);
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function registrosACsv(registros) {
  const encabezado = [
    "Radicado", "Iniciativa", "Tipo", "Origen académico", "Estudiante", "Correo",
    "Periodo", "Cohorte (convocatoria)", "Estado", "Tutor", "Madurez", "Nota promedio",
  ];
  const filas = registros.map((r) => [
    r.radicado,
    r.nombre,
    TIPOS_INICIATIVA[r.tipo] || r.tipo,
    ORIGENES_ACADEMICOS[r.origen] || r.origen,
    r.estudiante,
    r.correo,
    r.periodo,
    r.cohorte,
    ESTADOS_INICIATIVA[r.estado].label,
    r.idProyecto == null ? "Sin proyecto" : r.tutor || "Sin tutor",
    r.madurez || "",
    r.nota == null ? "" : r.nota.toFixed(2).replace(".", ","),
  ]);
  return "﻿" + [encabezado, ...filas].map((fila) => fila.map(celdaCsv).join(";")).join("\r\n");
}
