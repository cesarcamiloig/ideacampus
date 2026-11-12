// Estados de una convocatoria con su distintivo (paleta UFPS: rojo / negro / gris)
export const ESTADOS_CONVOCATORIA = {
  abierta: { label: "Abierta", detalle: "Abierta para postulaciones", tono: "rojo" },
  publicada: { label: "Publicada", detalle: "Publicada (apertura próxima)", tono: "oscuro" },
  borrador: { label: "Borrador", detalle: "Borrador interno", tono: "gris" },
  cerrada: { label: "Cerrada", detalle: "Cerrada", tono: "contorno" },
  cancelada: { label: "Cancelada", detalle: "Cancelada", tono: "alerta" },
};

export function estadoConvocatoria(estado) {
  return ESTADOS_CONVOCATORIA[estado] || ESTADOS_CONVOCATORIA.borrador;
}
