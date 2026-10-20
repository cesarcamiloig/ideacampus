import { apiClient } from "../../../services/apiClient";

// Contrato de evidencias de avance (HU-07). Solo el rol estudiante puede crear.
// POST se envía siempre como FormData: proyecto, etapa (id del hito), titulo, descripcion,
// tipo ("documento" | "enlace" | "prototipo" | "presentacion"), y las keys repetidas
// "archivos" (uno por archivo) y "enlaces" (uno por URL). El usuario sale del token.
// No se fija Content-Type: el navegador lo genera con el boundary del multipart.
//
// Respuesta (POST 201 y cada elemento del GET):
// { id, proyecto, iniciativa, etapa, etapa_nombre, usuario, usuario_nombre, titulo,
//   descripcion, tipo, creado, documentos: [{ id, archivo, nombre_original, extension,
//   tamano_bytes, enlace, fecha_carga }] }
// Cada documento es un archivo ("archivo") o un enlace ("enlace"), nunca ambos.

export async function registerEvidencia(formData) {
  return apiClient.post("/evidencias/", formData);
}

// El contenido de los archivos vive en la base de datos y se descarga por la API con el token
// (por eso no se usa el enlace directo del campo "archivo"). Devuelve un Blob.
export async function descargarDocumentoEvidencia(idDocumento) {
  return apiClient.download(`/evidencias/documentos/${idDocumento}/descargar/`);
}

// Solo el líder del equipo del proyecto; responde 204 sin contenido
export async function eliminarEvidencia(idEvidencia) {
  return apiClient.delete(`/evidencias/${idEvidencia}/`);
}

// Evidencias de los proyectos en los que participa el estudiante (las suyas y las de su equipo).
// GET /evidencias/ en cambio solo devuelve las que subió el propio estudiante.
export async function getEvidencias() {
  const data = await apiClient.get("/evidencias/mi-proyecto/");
  return Array.isArray(data) ? data : data?.results || [];
}
