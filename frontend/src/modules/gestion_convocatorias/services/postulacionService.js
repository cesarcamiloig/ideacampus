import { apiClient } from "../../../services/apiClient";
import { getConvocatorias, getConvocatoriaById } from "./convocatoriaService";

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
export async function getMisPostulaciones(usuario) {
  const iniciativas = await apiClient.get("/iniciativas/");
  const convocatoriasIds = [...new Set(iniciativas.map((item) => item.convocatoria))];
  const convocatorias = await Promise.all(
    convocatoriasIds.map((id) => getConvocatoriaById(id)),
  );
  const convocatoriasPorId = new Map(
    convocatorias.map((convocatoria) => [convocatoria.id_convocatoria, convocatoria]),
  );

  return iniciativas.map((iniciativa) =>
    normalizarIniciativa(
      iniciativa,
      convocatoriasPorId.get(iniciativa.convocatoria),
      usuario,
    ),
  );
}

function normalizarIniciativa(iniciativa, convocatoria, usuario) {
  const id = iniciativa.id_iniciativa;
  const fecha = iniciativa.fecha_postulacion || new Date().toISOString();
  const anio = new Date(fecha).getFullYear();
  const adjuntos = (iniciativa.documentos || []).map((documento) => ({
    id: documento.id_documento,
    nombre: documento.nombre_original,
    tamanio: documento.tamano_bytes
      ? `${(documento.tamano_bytes / (1024 * 1024)).toFixed(2)} MB`
      : "",
    tipo: "application/pdf",
    url: documento.url_archivo,
  }));
  const convocatoriaId =
    typeof iniciativa.convocatoria === "object"
      ? iniciativa.convocatoria.id_convocatoria
      : iniciativa.convocatoria;
  const convocatoriaInfo =
    typeof iniciativa.convocatoria === "object"
      ? iniciativa.convocatoria
      : convocatoria;
  const usuarioInfo =
    typeof iniciativa.usuario === "object" ? iniciativa.usuario : usuario;

  return {
    id: id || `post-${Date.now()}`,
    id_iniciativa: iniciativa.id_iniciativa,
    radicado: `UFPS-POST-${anio}-${String(id || 0).padStart(4, "0")}`,
    fecha_radicacion: fecha,
    estado: iniciativa.estado || "pendiente",
    convocatoria: {
      id_convocatoria: convocatoriaId,
      nombre: convocatoriaInfo?.nombre || `Convocatoria #${convocatoriaId}`,
      categoria: convocatoriaInfo?.categoria || "",
      periodo_nombre: convocatoriaInfo?.periodo_nombre || "",
    },
    iniciativa: {
      titulo: iniciativa.nombre,
      categoria: iniciativa.sector_tecnologico || "",
      resumen_ejecutivo: iniciativa.descripcion || "",
      problema_solucion: "",
      trl_inicial: iniciativa.etapa_actual || "",
      impacto_esperado: "",
      tipo: iniciativa.tipo,
      sector_tecnologico: iniciativa.sector_tecnologico || "",
      etapa_actual: iniciativa.etapa_actual || "",
    },
    origen_academico: {
      tipo: iniciativa.origen_academico,
      detalle_origen: iniciativa.detalle_origen || "",
      asignatura_nombre:
        iniciativa.origen_academico === "asignatura"
          ? iniciativa.detalle_origen || ""
          : "",
      semillero_nombre:
        iniciativa.origen_academico === "semillero"
          ? iniciativa.detalle_origen || ""
          : "",
    },
    equipo: {
      lider: {
        id_usuario: usuarioInfo?.id_usuario,
        nombre: usuarioInfo?.nombre || "",
        correo: usuarioInfo?.correo || "",
      },
      integrantes: [],
    },
    documentacion: {
      archivos: adjuntos,
    },
  };
}

/**
 * Registra una nueva postulación de iniciativa a una convocatoria abierta (HU-03).
 */
export async function registrarPostulacion(postulacionData, usuario, convocatoria) {
  const payload = new FormData();
  Object.entries(postulacionData).forEach(([campo, valor]) => {
    if (valor !== null && valor !== undefined) payload.append(campo, valor);
  });

  const iniciativa = await apiClient.post("/iniciativas/", payload);
  const resultado = normalizarIniciativa(iniciativa, convocatoria, usuario);

  const usuarioId = usuario?.id_usuario || "default";
  const key = `${STORAGE_PREFIX}${usuarioId}`;
  try {
    const anteriores = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify([resultado, ...anteriores]));
  } catch (error) {
    console.error("No se pudo guardar el comprobante de la iniciativa localmente:", error);
  }

  return resultado;
}

export async function descargarDocumentoIniciativa(idIniciativa) {
  return apiClient.download(`/iniciativas/${idIniciativa}/documento/`);
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
