import { apiClient } from "../../../services/apiClient";
import { getConvocatorias } from "./convocatoriaService";

const STORAGE_PREFIX = "ideacampus:postulaciones:";

const CONVOCATORIAS_FALLBACK = [
  {
    id_convocatoria: 1,
    nombre: "Convocatoria Institucional de Proyectos UFPS 2026",
    descripcion:
      "Convocatoria abierta para postulación y registro de iniciativas con declaración de origen académico del Programa de Ingeniería de Sistemas UFPS.",
    categoria: "Software & Innovación",
    requisitos_documentacion:
      "1. Ficha técnica de la solución (PDF)\n2. Carta de aval o soporte de origen académico\n3. Enlace a repositorio o prototipo funcional",
    criterios_evaluacion:
      "Innovación técnica (40%), Trazabilidad de origen académico (30%), Madurez tecnológica inicial TRL (30%)",
    fecha_apertura: "2026-03-01T08:00:00Z",
    fecha_cierre: "2026-05-30T23:59:59Z",
    estado: "abierta",
    periodo_nombre: "Periodo Académico 2026-1",
  },
];

/**
 * Normaliza un objeto devuelto por el backend /iniciativas/ al formato
 * consumido por la interfaz de usuario de expedientes y postulaciones.
 */
function normalizarIniciativaParaUI(item) {
  const anio = item.fecha_postulacion ? new Date(item.fecha_postulacion).getFullYear() : 2026;
  const radicado = item.radicado || `UFPS-POST-${anio}-${String(item.id_iniciativa || 1).padStart(4, "0")}`;

  return {
    id: `ini-${item.id_iniciativa}`,
    id_iniciativa: item.id_iniciativa,
    radicado,
    fecha_radicacion: item.fecha_postulacion || new Date().toISOString(),
    estado: item.estado || "pendiente", // 'pendiente' | 'en_revision' | 'aprobada' | 'aceptada' | 'rechazada'
    tiene_equipo: Boolean(item.tiene_equipo),
    equipo_id: item.equipo_id || null,
    equipo_nombre: item.equipo_nombre || null,
    convocatoria: {
      id_convocatoria: item.convocatoria,
      nombre: item.convocatoria_nombre || "Convocatoria Institucional UFPS",
      categoria: item.convocatoria_categoria || "Innovación Tecnológica",
      periodo_nombre: "Periodo Académico 2026",
    },
    iniciativa: {
      titulo: item.nombre,
      categoria: item.sector_tecnologico || (item.tipo === "innovacion" ? "Innovación Tecnológica" : "Emprendimiento"),
      resumen_ejecutivo: item.descripcion || "Sin resumen registrado",
      problema_solucion: item.descripcion || "Definido en expediente institucional",
      trl_inicial: item.etapa_actual || "M1",
      impacto_esperado: item.sector_tecnologico || "Programa de Ingeniería de Sistemas UFPS",
    },
    origen_academico: {
      tipo: item.origen_academico || "asignatura",
      asignatura_nombre: item.detalle_origen || "",
      descripcion_origen: item.detalle_origen || "Declaración formativa institucional UFPS",
    },
    equipo: {
      lider: {
        id_usuario: item.usuario,
        nombre: item.usuario_nombre || "Estudiante Postulante",
        correo: item.usuario_correo || "",
        rol: "Líder de Iniciativa",
      },
      integrantes: [],
    },
    documentacion: {
      archivos: (item.documentos || []).map((doc) => ({
        id: doc.id_documento,
        nombre: doc.nombre_original || "documento_adjunto.pdf",
        tamanio: doc.tamano_bytes ? `${(doc.tamano_bytes / (1024 * 1024)).toFixed(2)} MB` : "PDF",
        url: doc.url_archivo,
      })),
    },
    declaracion_veracidad: true,
    declaracion_autor: true,
  };
}

/**
 * Obtiene las convocatorias abiertas disponibles para que los estudiantes postulen.
 */
export async function getConvocatoriasAbiertas(params = {}) {
  try {
    const data = await getConvocatorias({ estado: "abierta", ...params });
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return CONVOCATORIAS_FALLBACK;
  } catch (err) {
    console.warn("Usando catálogo de convocatorias institucionales fallback:", err.message);
    return CONVOCATORIAS_FALLBACK;
  }
}

/**
 * Obtiene las postulaciones realizadas por el estudiante actual desde el backend.
 */
export async function getMisPostulaciones(usuarioId) {
  const key = `${STORAGE_PREFIX}${usuarioId || "default"}`;

  try {
    const remoteData = await apiClient.get("/iniciativas/");
    const lista = Array.isArray(remoteData) ? remoteData : remoteData?.results || [];
    if (lista.length > 0) {
      const normalizadas = lista.map(normalizarIniciativaParaUI);
      localStorage.setItem(key, JSON.stringify(normalizadas));
      return normalizadas;
    }
  } catch (err) {
    console.warn("No se pudo conectar a /iniciativas/, verificando caché local:", err?.message);
  }

  // Fallback a almacenamiento local si estuviera sin conexión
  try {
    const local = localStorage.getItem(key);
    if (local) {
      return JSON.parse(local);
    }
  } catch (err) {
    console.error("Error leyendo postulaciones locales:", err);
  }

  return [];
}

/**
 * Obtiene todas las iniciativas registradas (para uso de coordinadores y administradores).
 */
export async function getTodasLasIniciativas() {
  try {
    const remoteData = await apiClient.get("/iniciativas/");
    const lista = Array.isArray(remoteData) ? remoteData : remoteData?.results || [];
    return lista.map(normalizarIniciativaParaUI);
  } catch (err) {
    console.error("Error al obtener todas las iniciativas:", err);
    throw err;
  }
}

/**
 * Cambia el estado de una iniciativa (aprobada, rechazada, etc.) por parte del coordinador o admin.
 */
export async function cambiarEstadoIniciativa(idIniciativa, nuevoEstado) {
  const id = String(idIniciativa).replace(/^ini-/, "");
  const response = await apiClient.patch(`/iniciativas/${id}/cambiar-estado/`, {
    estado: nuevoEstado,
  });
  return normalizarIniciativaParaUI(response);
}

/**
 * Registra una nueva postulación de iniciativa a una convocatoria abierta (HU-03).
 * Soporta carga real de archivo PDF mediante multipart/form-data.
 */
export async function registrarPostulacion(postulacionData, usuario) {
  const usuarioId = usuario?.id_usuario || "default";

  // Preparar payload para backend /iniciativas/
  const formData = new FormData();
  formData.append("convocatoria", postulacionData.id_convocatoria);
  formData.append("nombre", (postulacionData.titulo || "Iniciativa de Innovación").slice(0, 150));
  
  const descripcionCompleta = [
    postulacionData.resumen_ejecutivo,
    postulacionData.problema_solucion ? `Problema/Solución: ${postulacionData.problema_solucion}` : null
  ].filter(Boolean).join(" | ").slice(0, 1000);
  
  formData.append("descripcion", descripcionCompleta || "Iniciativa registrada");
  
  const tipoNorm = (postulacionData.categoria || "").toLowerCase().includes("innovación")
    ? "innovacion"
    : "emprendimiento";
  formData.append("tipo", tipoNorm);

  const origenValido = [
    "asignatura",
    "proyecto_aula",
    "integrador",
    "semillero",
    "practica",
    "trabajo_grado",
  ].includes(postulacionData.origen_tipo)
    ? postulacionData.origen_tipo
    : "asignatura";
  formData.append("origen_academico", origenValido);

  const detalleOrigen = [
    postulacionData.asignatura_nombre,
    postulacionData.semillero_nombre,
    postulacionData.docente_titular ? `Docente: ${postulacionData.docente_titular}` : null,
    postulacionData.descripcion_origen,
  ].filter(Boolean).join(" - ").slice(0, 150);
  formData.append("detalle_origen", detalleOrigen || "Origen UFPS declarado");

  formData.append("sector_tecnologico", (postulacionData.categoria || "Software").slice(0, 100));
  formData.append("etapa_actual", (postulacionData.trl_inicial || "M1").slice(0, 50));

  // Archivo PDF adjunto
  if (postulacionData.archivo_file instanceof File) {
    formData.append("documento_adjunto", postulacionData.archivo_file);
  } else if (Array.isArray(postulacionData.archivos)) {
    const rawFileObj = postulacionData.archivos.find((a) => a.file instanceof File);
    if (rawFileObj) {
      formData.append("documento_adjunto", rawFileObj.file);
    }
  }

  let createdIni = null;
  try {
    createdIni = await apiClient.post("/iniciativas/", formData);
  } catch (err) {
    console.error("Error al registrar iniciativa en backend:", err);
    throw err;
  }

  const uiPostulacion = normalizarIniciativaParaUI(createdIni);

  // Actualizar caché local del estudiante
  const key = `${STORAGE_PREFIX}${usuarioId}`;
  let lista = [];
  try {
    const actual = localStorage.getItem(key);
    lista = actual ? JSON.parse(actual) : [];
  } catch {
    lista = [];
  }
  lista.unshift(uiPostulacion);
  localStorage.setItem(key, JSON.stringify(lista));

  return uiPostulacion;
}

/**
 * Cancela una postulación previa local si está en estado inicial.
 */
export async function cancelarPostulacion(radicado, usuarioId) {
  const key = `${STORAGE_PREFIX}${usuarioId || "default"}`;
  try {
    const actual = localStorage.getItem(key);
    if (!actual) return false;
    let lista = JSON.parse(actual);
    lista = lista.filter((p) => p.radicado !== radicado);
    localStorage.setItem(key, JSON.stringify(lista));
    return true;
  } catch {
    return false;
  }
}

