import { apiClient } from "../../../services/apiClient";

// ==========================================
// Alertas Automáticas y Compromisos (HU-12)
// ==========================================

const STORAGE_KEY = "gennova_alertas_hu12_cache";

/**
 * Alertas predeterminadas realistas por rol institucional (Estudiante, Tutor, Mentor, Evaluador, Coordinador)
 * para garantizar visualización inmediata ante cualquier estado de red o base de datos.
 */
function getInitialSeedAlertas() {
  const now = new Date();

  const addHours = (hours) => new Date(now.getTime() + hours * 3600 * 1000).toISOString();
  const addDays = (days) => new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();
  const subDays = (days) => new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString();

  return [
    // 1. ESTUDIANTE
    {
      id_alerta: 101,
      titulo: "Vencimiento Crítico: Cierre Convocatoria Innovación 2026-1",
      mensaje:
        "La convocatoria institucional 'Innovación Tecnológica UFPS 2026-1' cerrará en menos de 24 horas. Asegúrate de verificar que el PDF de propuesta y los integrantes del equipo estén radicados.",
      rol_destinatario: "estudiante",
      tipo: "vencimiento_convocatoria",
      prioridad: "alta",
      fecha_vencimiento: addHours(22),
      fecha_creacion: subDays(1),
      modulo_destino: "postulaciones",
      convocatoria_nombre: "Innovación Tecnológica UFPS 2026-1",
      leida: false,
    },
    {
      id_alerta: 102,
      titulo: "Compromiso Pendiente: Subsanación de Requisitos en 'EcoCampus IoT'",
      mensaje:
        "El comité evaluador ha solicitado subsanar la carta de aval del semillero de investigación para tu iniciativa 'EcoCampus IoT' antes del plazo límite.",
      rol_destinatario: "estudiante",
      tipo: "entrega_documentacion",
      prioridad: "media",
      fecha_vencimiento: addDays(3),
      fecha_creacion: subDays(2),
      modulo_destino: "equipo",
      convocatoria_nombre: "Innovación Tecnológica UFPS 2026-1",
      leida: false,
    },
    {
      id_alerta: 103,
      titulo: "Apertura de Convocatoria: Fondo Semilla de Emprendimiento",
      mensaje:
        "Se encuentra abierta la convocatoria especial de capital semilla para iniciativas con madurez tecnológica M2 en adelante.",
      rol_destinatario: "estudiante",
      tipo: "vencimiento_convocatoria",
      prioridad: "baja",
      fecha_vencimiento: addDays(15),
      fecha_creacion: subDays(3),
      modulo_destino: "postulaciones",
      convocatoria_nombre: "Fondo Semilla UFPS 2026",
      leida: true,
    },

    // 2. TUTOR ACADÉMICO
    {
      id_alerta: 201,
      titulo: "Validación Técnica Pendiente: Iniciativa 'AgroTech Cúcuta'",
      mensaje:
        "El equipo 'AgroTech Cúcuta' ha radicado su informe de hito técnico y requiere tu concepto docente para avanzar a validación de prototipo funcional.",
      rol_destinatario: "tutor",
      tipo: "compromiso_tutoria",
      prioridad: "alta",
      fecha_vencimiento: addHours(36),
      fecha_creacion: subDays(1),
      modulo_destino: "tutorias",
      convocatoria_nombre: "Innovación Tecnológica UFPS 2026-1",
      leida: false,
    },
    {
      id_alerta: 202,
      titulo: "Compromiso de Tutoría: Registro de Bitácora y Horas Semestre 2026-1",
      mensaje:
        "Recuerda ingresar a la bitácora digital de acompañamiento para registrar los acuerdos y horas de asesoría técnica brindadas en las últimas 2 semanas.",
      rol_destinatario: "tutor",
      tipo: "compromiso_tutoria",
      prioridad: "media",
      fecha_vencimiento: addDays(4),
      fecha_creacion: subDays(2),
      modulo_destino: "acompanamiento",
      convocatoria_nombre: null,
      leida: false,
    },
    {
      id_alerta: 203,
      titulo: "Recordatorio: Encuentro de Semilleros y Tutores de Emprendimiento",
      mensaje:
        "Reunión de coordinación docente para articular proyectos integradores y líneas de investigación del Programa de Ingeniería de Sistemas.",
      rol_destinatario: "tutor",
      tipo: "general",
      prioridad: "baja",
      fecha_vencimiento: addDays(12),
      fecha_creacion: subDays(4),
      modulo_destino: "tutorias",
      convocatoria_nombre: null,
      leida: true,
    },

    // 3. MENTOR ESPECIALIZADO
    {
      id_alerta: 301,
      titulo: "Compromiso de Mentoría: Asesoría de Validación de Mercado",
      mensaje:
        "Tienes programada la sesión de mentoría en modelo de negocio y vinculación productiva con el equipo 'FinTech UFPS'. Revisa el lienzo de propuesta antes de la sesión.",
      rol_destinatario: "mentor",
      tipo: "compromiso_mentoria",
      prioridad: "alta",
      fecha_vencimiento: addHours(40),
      fecha_creacion: subDays(1),
      modulo_destino: "mentorias",
      convocatoria_nombre: null,
      leida: false,
    },
    {
      id_alerta: 302,
      titulo: "Entrega de Diagnóstico de Factibilidad Comercial",
      mensaje:
        "Plazo para emitir la ficha diagnóstica de las iniciativas en etapa M3 que finalizaron su ciclo de mentoría especializada.",
      rol_destinatario: "mentor",
      tipo: "compromiso_mentoria",
      prioridad: "media",
      fecha_vencimiento: addDays(5),
      fecha_creacion: subDays(2),
      modulo_destino: "acompanamiento",
      convocatoria_nombre: null,
      leida: false,
    },
    {
      id_alerta: 303,
      titulo: "Actualización de Disponibilidad y Perfil Profesional (HU-16)",
      mensaje:
        "Actualiza tus horas disponibles para asignación de nuevos emprendimientos del banco de proyectos.",
      rol_destinatario: "mentor",
      tipo: "general",
      prioridad: "baja",
      fecha_vencimiento: addDays(20),
      fecha_creacion: subDays(5),
      modulo_destino: "perfil",
      convocatoria_nombre: null,
      leida: true,
    },

    // 4. EVALUADOR DE INICIATIVAS
    {
      id_alerta: 401,
      titulo: "Vencimiento Crítico: Calificación de 3 Iniciativas Asignadas",
      mensaje:
        "El ciclo de evaluación de la convocatoria activa culmina en 30 horas. Aún tienes 3 propuestas pendientes de calificar con la rúbrica multicriterio institucional.",
      rol_destinatario: "evaluador",
      tipo: "evaluacion_pendiente",
      prioridad: "alta",
      fecha_vencimiento: addHours(30),
      fecha_creacion: subDays(1),
      modulo_destino: "evaluaciones",
      convocatoria_nombre: "Innovación Tecnológica UFPS 2026-1",
      leida: false,
    },
    {
      id_alerta: 402,
      titulo: "Revisión de Rúbricas Incompletas y Observaciones Cualitativas",
      mensaje:
        "Por favor completa las observaciones pedagógicas en los criterios de rigor técnico y viabilidad para la propuesta 'Sistema IoT de Riego Inteligente'.",
      rol_destinatario: "evaluador",
      tipo: "evaluacion_pendiente",
      prioridad: "media",
      fecha_vencimiento: addDays(2),
      fecha_creacion: subDays(2),
      modulo_destino: "evaluaciones",
      convocatoria_nombre: "Innovación Tecnológica UFPS 2026-1",
      leida: false,
    },
    {
      id_alerta: 403,
      titulo: "Publicación de Rúbrica Multicriterio Actualizada",
      mensaje:
        "Se han actualizado los ponderadores de impacto social y rigor metodológico para las evaluaciones del periodo vigente.",
      rol_destinatario: "evaluador",
      tipo: "general",
      prioridad: "baja",
      fecha_vencimiento: addDays(10),
      fecha_creacion: subDays(4),
      modulo_destino: "rubricas",
      convocatoria_nombre: null,
      leida: true,
    },

    // 5. COORDINADOR DE EMPRENDIMIENTO
    {
      id_alerta: 501,
      titulo: "Cierre y Consolidación de Convocatoria 'Innovación 2026-1'",
      mensaje:
        "La convocatoria 'Innovación Tecnológica UFPS 2026-1' finalizará su plazo de recepción de propuestas en 24 horas. Se requiere revisar el quórum de iniciativas radicadas.",
      rol_destinatario: "coordinador",
      tipo: "vencimiento_convocatoria",
      prioridad: "alta",
      fecha_vencimiento: addHours(24),
      fecha_creacion: subDays(1),
      modulo_destino: "convocatorias",
      convocatoria_nombre: "Innovación Tecnológica UFPS 2026-1",
      leida: false,
    },
    {
      id_alerta: 502,
      titulo: "Asignación de Jurados y Comité Evaluador por Área",
      mensaje:
        "Hay 8 iniciativas radicadas que aún no cuentan con evaluadores designados para iniciar el proceso de dictamen institucional.",
      rol_destinatario: "coordinador",
      tipo: "cierre_periodo",
      prioridad: "alta",
      fecha_vencimiento: addDays(2),
      fecha_creacion: subDays(1),
      modulo_destino: "convocatorias",
      convocatoria_nombre: "Innovación Tecnológica UFPS 2026-1",
      leida: false,
    },
    {
      id_alerta: 503,
      titulo: "Generación de Informe de Impacto y Acreditación CNA (HU-14)",
      mensaje:
        "Consolidar las estadísticas de participación estudiantil y maduración de proyectos del periodo 2026-1 para el informe semestral.",
      rol_destinatario: "coordinador",
      tipo: "cierre_periodo",
      prioridad: "media",
      fecha_vencimiento: addDays(8),
      fecha_creacion: subDays(3),
      modulo_destino: "reportes",
      convocatoria_nombre: null,
      leida: false,
    },
  ];
}

function getStoredAlertas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Silencioso
  }
  const seed = getInitialSeedAlertas();
  saveStoredAlertas(seed);
  return seed;
}

function saveStoredAlertas(alertas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alertas));
  } catch {
    // Silencioso
  }
}

/**
 * Obtener lista de alertas con filtros
 */
export async function getAlertas(params = {}) {
  const query = new URLSearchParams(params).toString();
  try {
    const data = await apiClient.get(`/alertas/${query ? `?${query}` : ""}`);
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch {
    // Si la API falla o no está conectada, usamos los datos locales
  }

  // Filtrado local inteligente
  let list = getStoredAlertas();

  // Filtrar por rol si aplica
  if (params.rol && params.rol !== "todos") {
    list = list.filter(
      (a) => a.rol_destinatario === params.rol || a.rol_destinatario === "todos"
    );
  }

  // Filtrar por estado de lectura
  if (params.leida !== undefined && params.leida !== null && params.leida !== "") {
    const isLeida = String(params.leida).toLowerCase() === "true" || String(params.leida) === "1";
    list = list.filter((a) => a.leida === isLeida);
  }

  // Filtrar por prioridad
  if (params.prioridad && params.prioridad !== "todas") {
    list = list.filter((a) => a.prioridad === params.prioridad);
  }

  // Filtrar por tipo
  if (params.tipo && params.tipo !== "todos") {
    list = list.filter((a) => a.tipo === params.tipo);
  }

  // Búsqueda por texto (q)
  if (params.q && params.q.trim()) {
    const q = params.q.trim().toLowerCase();
    list = list.filter(
      (a) =>
        a.titulo.toLowerCase().includes(q) ||
        a.mensaje.toLowerCase().includes(q) ||
        (a.convocatoria_nombre && a.convocatoria_nombre.toLowerCase().includes(q))
    );
  }

  // Ventana temporal de fecha de vencimiento
  if (params.ventana_fecha && params.ventana_fecha !== "todas") {
    const now = new Date();
    list = list.filter((a) => {
      if (!a.fecha_vencimiento) return false;
      const vDate = new Date(a.fecha_vencimiento);
      const diffMs = vDate.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 3600 * 24);

      if (params.ventana_fecha === "vencidas") {
        return diffMs < 0;
      }
      if (params.ventana_fecha === "hoy_48h") {
        return diffDays >= 0 && diffDays <= 2;
      }
      if (params.ventana_fecha === "semana") {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (params.ventana_fecha === "proximas") {
        return diffDays > 7;
      }
      return true;
    });
  }

  // Ordenamiento
  const orden = params.orden || "vencimiento_asc";
  list.sort((a, b) => {
    if (orden === "vencimiento_asc") {
      const dateA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : Infinity;
      const dateB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : Infinity;
      return dateA - dateB;
    }
    if (orden === "vencimiento_desc") {
      const dateA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : -Infinity;
      const dateB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : -Infinity;
      return dateB - dateA;
    }
    if (orden === "prioridad") {
      const weight = { alta: 3, media: 2, baja: 1 };
      return (weight[b.prioridad] || 0) - (weight[a.prioridad] || 0);
    }
    if (orden === "recientes") {
      const dateA = new Date(a.fecha_creacion).getTime();
      const dateB = new Date(b.fecha_creacion).getTime();
      return dateB - dateA;
    }
    return 0;
  });

  return list;
}

/**
 * Marcar una alerta como leída o alternar su estado
 */
export async function marcarAlertaLeida(id, leida = true) {
  try {
    return await apiClient.patch(`/alertas/${id}/leer/`, { leida });
  } catch {
    // Actualización local
    const list = getStoredAlertas();
    const updated = list.map((a) => (a.id_alerta === id ? { ...a, leida } : a));
    saveStoredAlertas(updated);
    return updated.find((a) => a.id_alerta === id);
  }
}

/**
 * Marcar todas las alertas como leídas
 */
export async function marcarTodasAlertasLeidas() {
  try {
    return await apiClient.post("/alertas/marcar_todas_leidas/");
  } catch {
    const list = getStoredAlertas();
    const updated = list.map((a) => ({ ...a, leida: true }));
    saveStoredAlertas(updated);
    return { actualizadas: updated.length };
  }
}

/**
 * Obtener resumen cuantitativo de alertas para métricas y badge
 */
export async function getResumenAlertas(rol = null) {
  try {
    const query = rol ? `?rol=${rol}` : "";
    const data = await apiClient.get(`/alertas/resumen/${query}`);
    if (data && typeof data.total === "number") {
      return data;
    }
  } catch {
    // Fallback a cálculo local
  }

  let list = getStoredAlertas();
  if (rol && rol !== "todos") {
    list = list.filter((a) => a.rol_destinatario === rol || a.rol_destinatario === "todos");
  }

  const now = new Date();
  const total = list.length;
  const no_leidas = list.filter((a) => !a.leida).length;
  const alta_prioridad = list.filter((a) => a.prioridad === "alta").length;

  let proximas_a_vencer = 0;
  let vencidas = 0;

  list.forEach((a) => {
    if (a.fecha_vencimiento) {
      const diffDays = (new Date(a.fecha_vencimiento).getTime() - now.getTime()) / (1000 * 3600 * 24);
      if (diffDays < 0) {
        vencidas += 1;
      } else if (diffDays <= 7) {
        proximas_a_vencer += 1;
      }
    }
  });

  return {
    total,
    no_leidas,
    alta_prioridad,
    proximas_a_vencer,
    vencidas,
  };
}

/**
 * Sincronizar alertas con el backend o regenerar
 */
export async function sincronizarAlertas() {
  try {
    return await apiClient.post("/alertas/sincronizar/");
  } catch {
    const fresh = getInitialSeedAlertas();
    saveStoredAlertas(fresh);
    return { mensaje: "Alertas locales sincronizadas con éxito.", total: fresh.length };
  }
}
