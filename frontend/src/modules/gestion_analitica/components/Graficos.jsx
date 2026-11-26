import { FOCO } from "../../../components/ui";

// Gráfica de madurez del dashboard con la paleta UFPS: rojo para lo que se mide, grises para el
// riel y lo no seleccionado. Todo valor va rotulado en texto, nunca solo con color.

const formatoPct = (valor) => `${String(Math.round(valor * 10) / 10).replace(".", ",")}%`;

function pctDe(parte, total) {
  return total > 0 ? (parte / total) * 100 : 0;
}

// ---------------------------------------------------------------------------
// Escalera de madurez M0-M9 agrupada en fases
// niveles: [{ nivel: "M0", etiqueta: "M0: Ideación Inicial", total, porcentaje }]
// ---------------------------------------------------------------------------
const FASES_MADUREZ = [
  { id: "concepto", etiqueta: "Concepto", niveles: ["M0", "M1", "M2"] },
  { id: "prototipo", etiqueta: "Prototipo", niveles: ["M3", "M4", "M5"] },
  { id: "validacion", etiqueta: "Validación", niveles: ["M6", "M7"] },
  { id: "mercado", etiqueta: "Mercado", niveles: ["M8", "M9"] },
];

export function EscaleraMadurez({ niveles, seleccionado, onSeleccionar }) {
  const porNivel = Object.fromEntries(niveles.map((n) => [n.nivel, n]));
  const maximo = Math.max(1, ...niveles.map((n) => n.total));
  const total = niveles.reduce((a, n) => a + n.total, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
        {niveles.map((n) => {
          const activo = !seleccionado || seleccionado === n.nivel;
          const alto = n.total > 0 ? Math.max(6, (n.total / maximo) * 100) : 0;
          return (
            <button
              key={n.nivel}
              type="button"
              onClick={() => onSeleccionar?.(seleccionado === n.nivel ? "" : n.nivel)}
              aria-pressed={seleccionado === n.nivel}
              aria-label={`${n.etiqueta}: ${n.total} proyecto(s)`}
              className={`group relative flex flex-col items-center gap-1.5 rounded-lg pt-1 ${FOCO}`}
            >
              {/* Detalle al pasar el cursor o enfocar */}
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-[12rem] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-left text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <span className="block font-semibold">{n.etiqueta}</span>
                <span className="block tabular-nums text-slate-200">
                  {n.total} proyecto(s) · {formatoPct(n.porcentaje ?? pctDe(n.total, total))}
                </span>
              </span>

              <span className="text-xs font-semibold tabular-nums text-slate-900">{n.total || ""}</span>
              <span className="flex h-28 w-full items-end rounded-md bg-slate-50 sm:h-32">
                <span
                  className={`block w-full rounded-md transition-[height,background-color] duration-300 ease-out-suave group-hover:opacity-85 motion-reduce:transition-none ${
                    activo ? "bg-ufps" : "bg-slate-300"
                  }`}
                  style={{ height: `${alto}%` }}
                />
              </span>
              <span className={`text-xs font-semibold ${n.total ? "text-slate-900" : "text-slate-400"}`}>{n.nivel}</span>
            </button>
          );
        })}
      </div>

      {/* Fases: cuántos proyectos hay en cada tramo de la escala */}
      <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
        {FASES_MADUREZ.map((fase) => {
          const enFase = fase.niveles.reduce((a, nivel) => a + (porNivel[nivel]?.total || 0), 0);
          return (
            <div
              key={fase.id}
              className="rounded-lg border-t-2 border-slate-900 bg-slate-50 px-2 py-1.5"
              style={{ gridColumn: `span ${fase.niveles.length} / span ${fase.niveles.length}` }}
            >
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{fase.etiqueta}</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {enFase} <span className="text-xs font-normal text-slate-500">{formatoPct(pctDe(enFase, total))}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
