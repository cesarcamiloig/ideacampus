import { useCallback, useEffect, useState } from "react";
import { FolderKanban, History, RefreshCw } from "lucide-react";
import {
  BOTON_OSCURO,
  BOTON_SECUNDARIO,
  Cargando,
  Distintivo,
  EncabezadoPagina,
  ErrorGeneral,
  EstadoVacio,
  TARJETA,
} from "../../../components/ui";
import { useManejarErrorSesion } from "../../gestion_acompaniamiento/components/panelUtilidades";
import { getProyectosAsignadosTutor } from "../services/lineaTiempoService";
import LineaTiempoPanel from "../components/LineaTiempoPanel";

const TIPO_INICIATIVA = { emprendimiento: "Emprendimiento", innovacion: "Innovación" };

// Proyectos que acompaña el tutor, con acceso a la línea de tiempo evolutiva de cada uno
export default function ProyectosTutorPage() {
  const manejarErrorSesion = useManejarErrorSesion();
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [proyectoAbierto, setProyectoAbierto] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setProyectos(await getProyectosAsignadosTutor());
    } catch (err) {
      if (manejarErrorSesion(err)) return;
      setError(
        err.status === 404
          ? "El servidor aún no ofrece el listado de proyectos asignados."
          : err.message || "No se pudieron cargar tus proyectos asignados."
      );
    } finally {
      setCargando(false);
    }
  }, [manejarErrorSesion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (proyectoAbierto) {
    return (
      <LineaTiempoPanel
        key={proyectoAbierto.id}
        modo="pagina"
        idProyecto={proyectoAbierto.id}
        nombre={proyectoAbierto.nombre}
        seccion={`Línea de tiempo · ${TIPO_INICIATIVA[proyectoAbierto.tipo] || proyectoAbierto.tipo || "Iniciativa"}`}
        textoVolver="Volver a mis iniciativas"
        onClose={() => setProyectoAbierto(null)}
      />
    );
  }

  return (
    <div className="w-full space-y-6">
      <EncabezadoPagina
        seccion="Tutoría académica"
        titulo="Mis Iniciativas Asignadas"
        descripcion="Consulta cronológicamente las etapas de cada proyecto que acompañas."
        acciones={
          <button type="button" onClick={cargar} disabled={cargando} className={BOTON_SECUNDARIO}>
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin text-ufps" : ""}`} aria-hidden="true" />
            Actualizar
          </button>
        }
      />

      {cargando ? (
        <Cargando texto="Cargando tus proyectos asignados..." />
      ) : error ? (
        <ErrorGeneral mensaje={error} />
      ) : proyectos.length === 0 ? (
        <EstadoVacio icono={FolderKanban} titulo="Aún no tienes proyectos asignados">
          Cuando la coordinación te asigne como tutor de un proyecto, aparecerá aquí.
        </EstadoVacio>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {proyectos.map((proyecto) => (
            <li key={proyecto.id} className={`${TARJETA} flex flex-col justify-between gap-5 p-5 transition-shadow hover:shadow-md`}>
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-superficie text-slate-600">
                  <FolderKanban className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-2">
                  <p className="break-words text-base font-semibold leading-snug text-slate-900">{proyecto.nombre}</p>
                  <Distintivo tono="contorno">{TIPO_INICIATIVA[proyecto.tipo] || proyecto.tipo || "Iniciativa"}</Distintivo>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProyectoAbierto(proyecto)}
                className={`${BOTON_OSCURO} self-start`}
              >
                <History className="h-4 w-4" aria-hidden="true" />
                Ver línea de tiempo
              </button>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
