import { useCallback, useEffect, useState } from "react";
import { AlertCircle, FolderKanban, History, Loader2, RefreshCw } from "lucide-react";
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

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Tutoría académica</span>
            <h2 className="text-xl font-bold text-slate-900">Mis Iniciativas Asignadas</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Consulta cronológicamente las etapas de cada proyecto que acompañas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:self-center"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin text-red-600" : ""}`} />
          Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-red-600" />
          <span className="text-xs text-slate-500">Cargando tus proyectos asignados...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          {error}
        </div>
      ) : proyectos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <FolderKanban className="mb-3 h-10 w-10 text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">Aún no tienes proyectos asignados</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Cuando la coordinación te asigne como tutor de un proyecto, aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {proyectos.map((proyecto) => (
            <li
              key={proyecto.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-slate-900">{proyecto.nombre}</p>
                <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {TIPO_INICIATIVA[proyecto.tipo] || proyecto.tipo || "Iniciativa"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProyectoAbierto(proyecto)}
                aria-haspopup="dialog"
                className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-red-600 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <History className="h-4 w-4" />
                Ver línea de tiempo
              </button>
            </li>
          ))}
        </ul>
      )}

      {proyectoAbierto && (
        <LineaTiempoPanel
          key={proyectoAbierto.id}
          idProyecto={proyectoAbierto.id}
          nombre={proyectoAbierto.nombre}
          onClose={() => setProyectoAbierto(null)}
        />
      )}
    </div>
  );
}
