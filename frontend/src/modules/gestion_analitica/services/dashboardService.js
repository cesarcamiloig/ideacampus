import { apiClient } from "../../../services/apiClient";
import { getConvocatorias } from "../../gestion_convocatorias/services/convocatoriaService";
import { getEvaluaciones, getMadurezProyecto } from "../../gestion_evaluacion/services/evaluacionService";
import { comoLista, llamar } from "../../gestion_acompaniamiento/services/errores";
import { construirRegistros, notasPorProyecto } from "../utils/metricas";

// Datos del dashboard de Dirección (HU-14). No hay un endpoint de métricas en el backend,
// así que se reúnen los que ya existen y los indicadores se calculan en el navegador:
// - GET /iniciativas/                 todas las iniciativas (Dirección es gestora)
// - GET /convocatorias/               periodo académico de cada convocatoria
// - GET /evaluaciones/                notas de los hitos (nota promedio por proyecto)
// - GET /iniciativas/:id/tutor/       tutor del proyecto (solo los que tienen uno)
// - GET /proyectos/:id/madurez/       nivel de madurez actual (M0-M9)

const PETICIONES_SIMULTANEAS = 6;

// Ejecuta las tareas de a pocas para no saturar el servidor con un proyecto por petición
async function enLotes(elementos, tarea) {
  const resultados = new Array(elementos.length);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < elementos.length) {
      const i = siguiente++;
      try {
        resultados[i] = { ok: true, valor: await tarea(elementos[i]) };
      } catch (error) {
        resultados[i] = { ok: false, error };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PETICIONES_SIMULTANEAS, elementos.length) }, trabajador));
  return resultados;
}

// Devuelve { registros, avisos }. Solo falla si no se pueden leer las iniciativas;
// el resto de fuentes se degradan con un aviso para que la Dirección sepa qué falta.
export async function cargarDatosDashboard() {
  const avisos = [];

  const [iniciativasData, convocatorias, evaluaciones] = await Promise.all([
    llamar(() => apiClient.get("/iniciativas/")),
    getConvocatorias()
      .then(comoLista)
      .catch(() => {
        avisos.push("No se pudo leer el periodo de las convocatorias: se estima por la fecha de radicación.");
        return [];
      }),
    getEvaluaciones().catch(() => {
      avisos.push("No se pudieron leer las evaluaciones: la nota promedio no está disponible.");
      return [];
    }),
  ]);

  const iniciativas = comoLista(iniciativasData);
  const conProyecto = iniciativas.filter((i) => i.proyecto?.id_proyecto != null);
  const conTutor = conProyecto.filter((i) => i.proyecto.tiene_tutor);

  const [resultadosTutor, resultadosMadurez] = await Promise.all([
    enLotes(conTutor, (i) => apiClient.get(`/iniciativas/${i.id_iniciativa}/tutor/`)),
    enLotes(conProyecto, (i) => getMadurezProyecto(i.proyecto.id_proyecto)),
  ]);

  const tutores = new Map();
  resultadosTutor.forEach((r, i) => {
    if (r.ok && r.valor?.tutor_nombre) tutores.set(conTutor[i].id_iniciativa, r.valor.tutor_nombre);
  });

  const madurez = new Map();
  resultadosMadurez.forEach((r, i) => {
    if (r.ok && r.valor?.nivel_actual) madurez.set(conProyecto[i].proyecto.id_proyecto, r.valor.nivel_actual);
  });

  const fallosTutor = resultadosTutor.filter((r) => !r.ok).length;
  const fallosMadurez = resultadosMadurez.filter((r) => !r.ok).length;
  if (fallosTutor) avisos.push(`No se pudo leer el tutor de ${fallosTutor} proyecto(s).`);
  if (fallosMadurez) avisos.push(`No se pudo leer la madurez de ${fallosMadurez} proyecto(s).`);

  const registros = construirRegistros({
    iniciativas,
    convocatorias,
    tutores,
    madurez,
    notas: notasPorProyecto(evaluaciones),
  });

  return { registros, avisos, actualizado: new Date() };
}
