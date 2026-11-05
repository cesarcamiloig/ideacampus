import { apiClient } from "../../../services/apiClient";
import { comoLista, llamar } from "../../gestion_acompaniamiento/services/errores";

// Contrato de la línea de tiempo evolutiva (HU-08). Solo la consultan Tutor, Coordinador y Dirección.
// GET /iniciativas/{id}/linea-tiempo/ o /proyectos/{id}/linea-tiempo/, con ?orden=asc|desc.
// Respuesta: arreglo ya ordenado por fecha, cada evento con
// { id_etapa, nombre, fecha (ISO-8601 o null), estado, responsable, observaciones, tipo_evento, orden }.
// tipo_evento: postulacion | creacion_proyecto | asignacion_tutor | hito_plan_trabajo | evaluacion.
export async function getLineaTiempo({ idIniciativa, idProyecto, orden = "asc" }) {
  const ruta = idIniciativa ? `/iniciativas/${idIniciativa}` : `/proyectos/${idProyecto}`;
  const data = await llamar(() => apiClient.get(`${ruta}/linea-tiempo/?orden=${orden}`));
  return comoLista(data);
}

// Proyectos asignados al tutor con sesión activa: [{ id, nombre, tipo }]
export async function getProyectosAsignadosTutor() {
  const data = await llamar(() => apiClient.get("/registros-avance/mis-proyectos/"));
  return comoLista(data);
}
