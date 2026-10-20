import { apiClient } from "../../../services/apiClient";
import { comoLista, llamar } from "./errores";

// Asignación del tutor académico al proyecto de una iniciativa aprobada.
// Un proyecto tiene un solo tutor: asignar otro lo reemplaza y enviar id_tutor = null lo quita.
// El backend permite gestionar tutores a coordinador, admin y Dirección; la interfaz solo
// muestra las acciones al coordinador.

// Tutor actual del proyecto. Devuelve null cuando la iniciativa aún no tiene proyecto (400).
export async function getTutorDeIniciativa(idIniciativa) {
  try {
    const data = await llamar(() => apiClient.get(`/iniciativas/${idIniciativa}/tutor/`));
    return {
      idProyecto: data?.id_proyecto ?? null,
      tutor: data?.id_tutor
        ? {
            id_tutor: data.id_tutor,
            nombre: data.tutor_nombre,
            correo: data.tutor_correo,
            area_conocimiento: data.area_conocimiento,
          }
        : null,
    };
  } catch (err) {
    if (err.status === 400) return null;
    throw err;
  }
}

// Tutores académicos activos (con su perfil: área, nivel, experiencia, biografía y enlace)
export async function getTutoresDisponibles() {
  const data = await llamar(() => apiClient.get("/proyectos/tutores/"));
  return comoLista(data);
}

// idTutor = null quita al tutor del proyecto
export async function asignarTutor(idProyecto, idTutor) {
  const data = await llamar(() =>
    apiClient.patch(`/proyectos/${idProyecto}/tutor/`, { id_tutor: idTutor === null ? null : Number(idTutor) })
  );
  return {
    message: data?.message || "",
    nombreProyecto: data?.nombre_proyecto || "",
    idTutor: data?.id_tutor ?? null,
  };
}
