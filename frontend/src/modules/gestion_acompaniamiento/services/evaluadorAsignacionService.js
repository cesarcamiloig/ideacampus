import { apiClient } from "../../../services/apiClient";
import { comoLista, llamar } from "./errores";

// Asignación del evaluador al proyecto de una iniciativa aprobada (campo id_evaluador de proyecto).
// Un proyecto tiene un solo evaluador: asignar otro lo reemplaza y enviar id_evaluador = null lo quita.
// Un mismo evaluador puede estar asignado a varios proyectos.

// Evaluador actual del proyecto
export async function getEvaluadorDeProyecto(idProyecto) {
  const data = await llamar(() => apiClient.get(`/proyectos/${idProyecto}/evaluador/`));
  return data?.id_evaluador
    ? { id_usuario: data.id_evaluador, nombre: data.evaluador_nombre, correo: data.evaluador_correo }
    : null;
}

// Usuarios con el rol evaluador activo: { id_usuario, nombre, correo }
export async function getEvaluadoresDisponibles() {
  const data = await llamar(() => apiClient.get("/proyectos/evaluadores/"));
  return comoLista(data);
}

// idEvaluador = null quita al evaluador del proyecto
export async function asignarEvaluador(idProyecto, idEvaluador) {
  const data = await llamar(() =>
    apiClient.patch(`/proyectos/${idProyecto}/evaluador/`, {
      id_evaluador: idEvaluador === null ? null : Number(idEvaluador),
    })
  );
  return {
    nombreProyecto: data?.nombre_proyecto || "",
    idEvaluador: data?.id_evaluador ?? null,
  };
}
