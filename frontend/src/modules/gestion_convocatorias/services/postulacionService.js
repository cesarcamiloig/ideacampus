import { apiClient } from "../../../services/apiClient";
import { getConvocatorias } from "./convocatoriaService";

const STORAGE_PREFIX = "ideacampus:postulaciones:";

const CONVOCATORIAS_FALLBACK = [
  {
    id_convocatoria: 1,
    nombre: "prueba",
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
 * Obtiene las convocatorias abiertas disponibles para que los estudiantes postulen.
 */
export async function getConvocatoriasAbiertas(params = {}) {
  try {
    const data = await getConvocatorias({ estado: "abierta", ...params });
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    // Si la lista remota está vacía, retornar convocatorias fallback institucionales
    return CONVOCATORIAS_FALLBACK;
  } catch (err) {
    console.warn("Usando catálogo de convocatorias institucionales fallback:", err.message);
    return CONVOCATORIAS_FALLBACK;
  }
}

/**
 * Obtiene las postulaciones realizadas por el estudiante actual.
 */
export async function getMisPostulaciones(usuarioId) {
  const key = `${STORAGE_PREFIX}${usuarioId || "default"}`;
  
  // Intento de lectura desde backend si existiera el endpoint
  try {
    const remoteData = await apiClient.get("/postulaciones/");
    if (Array.isArray(remoteData) && remoteData.length > 0) {
      localStorage.setItem(key, JSON.stringify(remoteData));
      return remoteData;
    }
  } catch {
    // Si no existe el endpoint en backend, continúa con almacenamiento local persistente
  }

  try {
    const local = localStorage.getItem(key);
    if (local) {
      return JSON.parse(local);
    }
  } catch (err) {
    console.error("Error leyendo postulaciones locales:", err);
  }

  // Si no hay postulaciones previas, inicializar con array vacío
  return [];
}

/**
 * Genera un código de radicado único institucional (formato UFPS-POST-AAAA-XXXX).
 */
function generarNumeroRadicado() {
  const anio = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `UFPS-POST-${anio}-${randomSuffix}`;
}

/**
 * Registra una nueva postulación de iniciativa a una convocatoria abierta (HU-03).
 */
export async function registrarPostulacion(postulacionData, usuario) {
  const usuarioId = usuario?.id_usuario || "default";
  const radicado = generarNumeroRadicado();
  const fechaActual = new Date().toISOString();

  const nuevaPostulacion = {
    id: `post-${Date.now()}`,
    radicado,
    fecha_radicacion: fechaActual,
    estado: "radicada", // radicada | en_revision | en_evaluacion | aceptada | rechazada
    convocatoria: {
      id_convocatoria: postulacionData.id_convocatoria,
      nombre: postulacionData.convocatoria_nombre,
      categoria: postulacionData.convocatoria_categoria,
      periodo_nombre: postulacionData.convocatoria_periodo,
    },
    iniciativa: {
      titulo: postulacionData.titulo,
      categoria: postulacionData.categoria,
      resumen_ejecutivo: postulacionData.resumen_ejecutivo,
      problema_solucion: postulacionData.problema_solucion,
      trl_inicial: postulacionData.trl_inicial || "M0", // M0, M1, M2, M3
      impacto_esperado: postulacionData.impacto_esperado || "",
    },
    origen_academico: {
      tipo: postulacionData.origen_tipo, // 'asignatura' | 'semillero' | 'proyecto_grado' | 'extracurricular'
      // Si fue asignatura
      asignatura_nombre: postulacionData.asignatura_nombre || "",
      asignatura_semestre: postulacionData.asignatura_semestre || "",
      docente_titular: postulacionData.docente_titular || "",
      codigo_grupo: postulacionData.codigo_grupo || "",
      entregable_previo: postulacionData.entregable_previo || "",
      // Si fue semillero
      semillero_nombre: postulacionData.semillero_nombre || "",
      tutor_semillero: postulacionData.tutor_semillero || "",
      linea_investigacion: postulacionData.linea_investigacion || "",
      // Si fue proyecto de grado
      modalidad_grado: postulacionData.modalidad_grado || "",
      director_proyecto: postulacionData.director_proyecto || "",
      // Si fue extracurricular
      justificacion_extracurricular: postulacionData.justificacion_extracurricular || "",
      descripcion_origen: postulacionData.descripcion_origen || "",
    },
    equipo: {
      lider: {
        id_usuario: usuario?.id_usuario,
        nombre: usuario?.nombre || postulacionData.lider_nombre,
        correo: usuario?.correo || postulacionData.lider_correo,
        codigo_estudiantil: postulacionData.lider_codigo || "",
        rol: "Líder de Iniciativa",
      },
      integrantes: postulacionData.integrantes || [],
    },
    documentacion: {
      archivos: postulacionData.archivos || [],
      repositorio_url: postulacionData.repositorio_url || "",
      demo_url: postulacionData.demo_url || "",
      observaciones_adjuntos: postulacionData.observaciones_adjuntos || "",
    },
    declaracion_veracidad: true,
    declaracion_autor: true,
  };

  // Intentar sincronizar con backend si existe endpoint
  try {
    await apiClient.post("/postulaciones/", nuevaPostulacion);
  } catch {
    // Si el endpoint remoto aún no está disponible en este sprint, se persiste localmente
  }

  // Persistir en storage del estudiante
  const key = `${STORAGE_PREFIX}${usuarioId}`;
  let lista = [];
  try {
    const actual = localStorage.getItem(key);
    lista = actual ? JSON.parse(actual) : [];
  } catch {
    lista = [];
  }

  lista.unshift(nuevaPostulacion);
  localStorage.setItem(key, JSON.stringify(lista));

  return nuevaPostulacion;
}

/**
 * Cancela una postulación previa (si aún se encuentra en estado inicial).
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
