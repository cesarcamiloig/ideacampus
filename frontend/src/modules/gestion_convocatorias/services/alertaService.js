import { apiClient } from "../../../services/apiClient";

// ==========================================
// Alertas Automáticas y Compromisos
// ==========================================

const STORAGE_KEY = "gennova_alertas_hu12_cache";

// Limpiar caché vieja de seeds si existiera
try {
  localStorage.removeItem(STORAGE_KEY);
} catch {
  // Silencioso
}

/**
 * Obtener lista de alertas desde el backend filtradas por rol y parámetros
 */
export async function getAlertas(params = {}) {
  const query = new URLSearchParams(params).toString();
  try {
    const data = await apiClient.get(`/alertas/${query ? `?${query}` : ""}`);
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  } catch (err) {
    console.error("Error al obtener alertas del backend:", err.message);
    return [];
  }
}

/**
 * Marcar una alerta como leída o no leída
 */
export async function marcarAlertaLeida(id, leida = true) {
  try {
    return await apiClient.patch(`/alertas/${id}/leer/`, { leida });
  } catch (err) {
    console.error(`Error al marcar alerta ${id} como leída:`, err.message);
    throw err;
  }
}

/**
 * Marcar todas las alertas como leídas
 */
export async function marcarTodasAlertasLeidas() {
  try {
    return await apiClient.post("/alertas/marcar_todas_leidas/");
  } catch (err) {
    console.error("Error al marcar todas las alertas como leídas:", err.message);
    throw err;
  }
}

/**
 * Obtener resumen cuantitativo de alertas para métricas y badge
 */
export async function getResumenAlertas(rol = null) {
  try {
    const query = rol && rol !== "todos" ? `?rol=${rol}` : "";
    const data = await apiClient.get(`/alertas/resumen/${query}`);
    if (data && typeof data.total === "number") {
      return data;
    }
  } catch (err) {
    console.warn("No se pudo obtener el resumen de alertas:", err.message);
  }
  return {
    total: 0,
    no_leidas: 0,
    alta_prioridad: 0,
    proximas_a_vencer: 0,
    vencidas: 0,
  };
}

/**
 * Sincronizar alertas automáticas con el backend
 */
export async function sincronizarAlertas(rol = null) {
  try {
    const query = rol && rol !== "todos" ? `?rol=${rol}` : "";
    return await apiClient.post(`/alertas/sincronizar/${query}`);
  } catch (err) {
    console.error("Error al sincronizar alertas:", err.message);
    throw err;
  }
}
