import { FOCO } from "../../../components/ui";

// Gráficas del dashboard con la paleta UFPS: rojo para la magnitud, gris oscuro solo como
// segunda serie y gris claro para el riel y lo no seleccionado. Barras finas con el extremo
// redondeado y cada valor rotulado en texto (nunca solo con color).

// Usa el porcentaje que manda el backend (0-100) y, si no viene, lo calcula sobre el total
function porcentaje(d, total) {
  const valor = d.porcentaje ?? (total > 0 ? (d.valor / total) * 100 : 0);
  return String(Math.round(valor * 10) / 10).replace(".", ",");
}

// Lista de barras horizontales. datos: [{ clave, etiqueta, valor, porcentaje?, detalle? }]
// Con onSeleccionar cada fila es un botón que filtra el tablero; la fila elegida queda en rojo
// y las demás en gris.
export function BarrasHorizontales({ datos, etiqueta, onSeleccionar, seleccionado, mostrarPorcentaje = true }) {
  const total = datos.reduce((a, d) => a + d.valor, 0);
  const maximo = Math.max(1, ...datos.map((d) => d.valor));

  return (
    <ul className="space-y-1" aria-label={etiqueta}>
      {datos.map((d) => {
        const activo = !seleccionado || seleccionado === d.clave;
        const ancho = d.valor > 0 ? Math.max(2, (d.valor / maximo) * 100) : 0;
        const contenido = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-slate-700">{d.etiqueta}</span>
              <span className="shrink-0 tabular-nums text-slate-900">
                <span className="font-semibold">{d.valor}</span>
                {mostrarPorcentaje && <span className="ml-1.5 text-xs text-slate-500">{porcentaje(d, total)}%</span>}
              </span>
            </span>
            <span className="mt-1.5 block h-2 w-full rounded-full bg-slate-100" aria-hidden="true">
              <span
                className={`block h-2 rounded-full transition-[width,background-color] duration-300 ease-out-suave motion-reduce:transition-none ${
                  activo ? "bg-ufps" : "bg-slate-300"
                }`}
                style={{ width: `${ancho}%` }}
              />
            </span>
            {d.detalle && <span className="mt-1 block text-xs text-slate-500">{d.detalle}</span>}
          </>
        );

        return (
          <li key={d.clave}>
            {onSeleccionar ? (
              <button
                type="button"
                onClick={() => onSeleccionar(seleccionado === d.clave ? "" : d.clave)}
                aria-pressed={seleccionado === d.clave}
                title={seleccionado === d.clave ? "Quitar filtro" : `Filtrar por ${d.etiqueta}`}
                className={`block w-full rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-50 ${FOCO}`}
              >
                {contenido}
              </button>
            ) : (
              <div className="px-2.5 py-2">{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Columnas verticales con una o dos series.
// datos: [{ clave, etiqueta, detalle?, valores: { [serie]: número } }] — detalle es el texto largo del tooltip
// series: [{ id, label, clase }] — la clase es el color de relleno de la serie
export function Columnas({ datos, series, etiqueta, alto = "h-44" }) {
  const maximo = Math.max(1, ...datos.flatMap((d) => series.map((s) => d.valores[s.id] || 0)));

  return (
    <figure className="space-y-3">
      {series.length > 1 && (
        <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          {series.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${s.clase}`} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}

      <div className="overflow-x-auto">
        <div className="flex min-w-max items-end gap-2 sm:min-w-0" role="list" aria-label={etiqueta}>
          {datos.map((d) => {
            const resumen = series.map((s) => `${s.label}: ${d.valores[s.id] || 0}`).join(", ");
            return (
              <div
                key={d.clave}
                role="listitem"
                tabIndex={0}
                aria-label={`${d.detalle || d.etiqueta}. ${resumen}`}
                className={`group relative flex min-w-[2.75rem] flex-1 flex-col items-center gap-2 rounded-lg ${FOCO}`}
              >
                {/* Detalle al pasar el cursor o enfocar la columna */}
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <p className="font-semibold">{d.detalle || d.etiqueta}</p>
                  {series.map((s) => (
                    <p key={s.id} className="tabular-nums text-slate-200">
                      {s.label}: {d.valores[s.id] || 0}
                    </p>
                  ))}
                </div>

                <div className={`flex w-full items-end justify-center gap-[2px] border-b border-slate-200 ${alto}`}>
                  {series.map((s) => {
                    const valor = d.valores[s.id] || 0;
                    return (
                      <div key={s.id} className="flex h-full max-w-6 flex-1 flex-col items-center justify-end">
                        <span className="mb-1 text-[11px] font-semibold tabular-nums text-slate-700">{valor || ""}</span>
                        <span
                          className={`block w-full rounded-t transition-[height] duration-300 ease-out-suave group-hover:opacity-85 motion-reduce:transition-none ${s.clase}`}
                          style={{ height: valor > 0 ? `${Math.max(3, (valor / maximo) * 85)}%` : 0 }}
                          aria-hidden="true"
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="max-w-[6rem] truncate text-center text-xs font-medium text-slate-600">{d.etiqueta}</span>
              </div>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
