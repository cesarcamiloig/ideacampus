import { Activity, CheckCircle2, FolderKanban, GraduationCap, Star, UserCheck } from "lucide-react";
import { FOCO } from "../../../components/ui";
import { formatoDecimal, formatoPorcentaje } from "../utils/filtrosAnalitica";

// Misma forma que <Estadistica> del sistema visual; con onClick la cifra es un botón que filtra
function Cifra({ icono: Icono, etiqueta, valor, detalle, onClick, activa }) {
  // Dentro de un botón solo cabe contenido de frase: ahí se usan <span> en lugar de <dt>/<dd>
  const Termino = onClick ? "span" : "dt";
  const Valor = onClick ? "span" : "dd";
  const contenido = (
    <>
      <Termino className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <Icono className={`h-3.5 w-3.5 ${activa ? "text-ufps" : "text-slate-400"}`} aria-hidden="true" />
        {etiqueta}
      </Termino>
      <Valor className="mt-1 block text-lg font-bold tabular-nums text-slate-900">{valor}</Valor>
      {detalle && <Valor className="mt-0.5 block text-xs text-slate-500">{detalle}</Valor>}
    </>
  );
  if (!onClick) return <dl className="rounded-xl bg-slate-50 p-3.5">{contenido}</dl>;
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={activa}
        title={activa ? "Quitar filtro" : "Ver solo los aprobados por hitos"}
        className={`block h-full w-full rounded-xl p-3.5 text-left transition-colors ${FOCO} ${
          activa ? "bg-white ring-2 ring-ufps" : "bg-slate-50 hover:bg-slate-100"
        }`}
      >
        {contenido}
      </button>
    </div>
  );
}

export default function TarjetasResumen({ metricas, filtroAprobados, onFiltrarAprobados }) {
  const r = metricas?.resumen || {};
  const evaluacion = metricas?.evaluacion || {};
  const aprobadosActivo = filtroAprobados === "true";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Cifra
        icono={FolderKanban}
        etiqueta="Total proyectos"
        valor={r.total_proyectos ?? "—"}
        detalle={r.total_proyectos != null ? `${r.proyectos_inactivos ?? 0} inactivo(s)` : null}
      />
      <Cifra
        icono={Activity}
        etiqueta="Activos"
        valor={r.proyectos_activos ?? "—"}
        detalle={`Tasa de actividad ${formatoPorcentaje(r.tasa_actividad)}`}
      />
      <Cifra
        icono={CheckCircle2}
        etiqueta="Aprobados por hitos"
        valor={r.proyectos_aprobados_hitos ?? "—"}
        detalle={`Tasa ${formatoPorcentaje(r.tasa_aprobacion_hitos)}`}
        activa={aprobadosActivo}
        onClick={() => onFiltrarAprobados(aprobadosActivo ? "" : "true")}
      />
      <Cifra
        icono={UserCheck}
        etiqueta="Cobertura de tutoría"
        valor={formatoPorcentaje(r.cobertura_tutoria)}
        detalle={r.proyectos_sin_tutor != null ? `${r.proyectos_sin_tutor} sin tutor` : null}
      />
      <Cifra
        icono={GraduationCap}
        etiqueta="Estudiantes"
        valor={r.estudiantes_vinculados ?? "—"}
        detalle={`${r.tutores_vinculados ?? 0} tutor(es) · ${r.mentores_vinculados ?? 0} mentor(es)`}
      />
      <Cifra
        icono={Star}
        etiqueta="Nota promedio"
        valor={evaluacion.nota_promedio == null ? "—" : `${formatoDecimal(evaluacion.nota_promedio)} / 5`}
        detalle={`${evaluacion.proyectos_evaluados ?? 0} proyecto(s) evaluado(s)`}
      />
    </div>
  );
}
