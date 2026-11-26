import { AlertTriangle, CalendarX2, CheckCircle2, ClipboardX, Gauge, PauseCircle, UserX, XCircle } from "lucide-react";
import { BOTON_SECUNDARIO_SM } from "../../../components/ui";

// Situaciones que la Dirección debería revisar, calculadas sobre los proyectos filtrados.
// Las que tienen `filtro` se pueden abrir: aplican ese filtro al tablero y a la tabla.
function construirAlertas(m) {
  const r = m?.resumen || {};
  const total = r.total_proyectos || 0;
  const seguimiento = m?.seguimiento || {};
  const evaluacion = m?.evaluacion || {};
  const enM0 = m?.madurez?.distribucion?.find((n) => n.nivel === "M0")?.total || 0;

  return [
    {
      id: "sin-tutor",
      icono: UserX,
      cantidad: r.proyectos_sin_tutor || 0,
      titulo: "Sin tutor asignado",
      detalle: "Proyectos sin acompañamiento académico.",
      filtro: { clave: "con_tutor", valor: "false" },
    },
    {
      id: "vencidas",
      icono: CalendarX2,
      cantidad: seguimiento.actividades_vencidas || 0,
      unidad: "actividad(es)",
      titulo: "Actividades vencidas",
      detalle: "Pendientes con la fecha de fin ya cumplida.",
    },
    {
      id: "sin-avance",
      icono: ClipboardX,
      cantidad: Math.max(0, total - (seguimiento.proyectos_con_avance || 0)),
      titulo: "Sin registro de avance",
      detalle: "El equipo no ha reportado avance por etapas.",
    },
    {
      id: "sin-evaluar",
      icono: XCircle,
      cantidad: Math.max(0, total - (evaluacion.proyectos_evaluados || 0)),
      titulo: "Sin evaluaciones",
      detalle: "Ningún hito del proyecto ha sido evaluado.",
    },
    {
      id: "m0",
      icono: Gauge,
      cantidad: enM0,
      titulo: "Estancados en M0",
      detalle: "Siguen en ideación, sin avance de madurez.",
      filtro: { clave: "nivel_madurez", valor: "M0" },
    },
    {
      id: "no-aprobados",
      icono: AlertTriangle,
      cantidad: Math.max(0, total - (r.proyectos_aprobados_hitos || 0)),
      titulo: "No aprobados por hitos",
      detalle: "Hitos pendientes de calificar o con nota menor a 3,0.",
      filtro: { clave: "aprobado_hitos", valor: "false" },
    },
    {
      id: "inactivos",
      icono: PauseCircle,
      cantidad: r.proyectos_inactivos || 0,
      titulo: "Inactivos",
      detalle: "Pausados, finalizados o cancelados.",
      filtro: { clave: "vigencia", valor: "inactivos" },
    },
  ];
}

export default function AtencionRequerida({ metricas, filtros, onFiltrar }) {
  const alertas = construirAlertas(metricas);
  const pendientes = alertas.filter((a) => a.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad);
  const alDia = alertas.filter((a) => a.cantidad === 0);

  if (pendientes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Todo al día</p>
        <p className="max-w-xs text-xs text-slate-500">Ningún proyecto de esta selección tiene pendientes de tutoría, avance, evaluación o madurez.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-slate-100">
        {pendientes.map((a) => {
          const Icono = a.icono;
          const aplicado = a.filtro && filtros[a.filtro.clave] === a.filtro.valor;
          return (
            <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-ufps">
                <Icono className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  <span className="tabular-nums text-ufps">{a.cantidad}</span> {a.titulo.toLowerCase()}
                  {a.unidad && <span className="sr-only"> ({a.unidad})</span>}
                </p>
                <p className="text-xs text-slate-500">{a.detalle}</p>
              </div>
              {a.filtro && (
                <button
                  type="button"
                  onClick={() => onFiltrar(a.filtro.clave, aplicado ? "" : a.filtro.valor)}
                  aria-pressed={aplicado}
                  className={`${BOTON_SECUNDARIO_SM} ${aplicado ? "ring-ufps" : ""}`}
                >
                  {aplicado ? "Quitar" : "Ver"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {alDia.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Al día</p>
          <ul className="flex flex-wrap gap-1.5">
            {alDia.map((a) => (
              <li
                key={a.id}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                {a.titulo}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
