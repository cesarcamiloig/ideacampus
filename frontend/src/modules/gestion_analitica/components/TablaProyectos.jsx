import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  BOTON_SECUNDARIO_SM,
  Distintivo,
  FOCO,
  FilaMensaje,
  TABLA,
  TABLA_CABECERA,
  TABLA_CONTENEDOR,
  TABLA_FILA,
  TABLA_TD,
  TABLA_TH,
} from "../../../components/ui";
import { formatoFecha } from "../utils/filtrosAnalitica";

// Columnas de la tabla. `orden` es el campo que acepta ?ordering= en /analitica/proyectos/
const COLUMNAS = [
  { id: "proyecto", label: "Proyecto", orden: "nombre" },
  { id: "tipo", label: "Tipo", orden: "tipo" },
  { id: "vigencia", label: "Vigencia" },
  { id: "hitos", label: "Aprobación por hitos" },
  { id: "periodo", label: "Periodo", orden: "periodo" },
  { id: "tutor", label: "Tutor" },
  { id: "postulante", label: "Postulante" },
  { id: "integrantes", label: "Integrantes", className: "text-center" },
  { id: "madurez", label: "Madurez", orden: "nivel_madurez", className: "text-center" },
  { id: "creado", label: "Creado", orden: "creado" },
];

function CabeceraOrdenable({ columna, ordering, onOrdenar }) {
  if (!columna.orden) {
    return (
      <th scope="col" className={`${TABLA_TH} ${columna.className || ""}`}>
        {columna.label}
      </th>
    );
  }
  const ascendente = ordering === columna.orden;
  const descendente = ordering === `-${columna.orden}`;
  const Icono = ascendente ? ArrowUp : descendente ? ArrowDown : ArrowUpDown;
  // Primer clic ascendente, segundo descendente
  const siguiente = ascendente ? `-${columna.orden}` : columna.orden;
  return (
    <th
      scope="col"
      aria-sort={ascendente ? "ascending" : descendente ? "descending" : "none"}
      className={`${TABLA_TH} ${columna.className || ""}`}
    >
      <button
        type="button"
        onClick={() => onOrdenar(siguiente)}
        className={`-mx-1 inline-flex items-center gap-1 rounded-md px-1 uppercase tracking-wider hover:text-slate-900 ${FOCO} ${
          ascendente || descendente ? "text-slate-900" : ""
        }`}
      >
        {columna.label}
        <Icono className={`h-3.5 w-3.5 ${ascendente || descendente ? "text-ufps" : "text-slate-400"}`} aria-hidden="true" />
      </button>
    </th>
  );
}

export default function TablaProyectos({ datos, cargando, error, page, pageSize, ordering, onPagina, onOrdenar }) {
  const resultados = datos?.results || [];
  const total = datos?.count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <section className="space-y-3" aria-labelledby="tabla-proyectos">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="tabla-proyectos" className="text-base font-semibold text-slate-900">
            Proyectos
          </h2>
          <p className="text-xs text-slate-500">
            {total ? `Mostrando ${desde}–${hasta} de ${total}` : "Sin resultados"}
          </p>
        </div>
        {cargando && datos && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-ufps" aria-hidden="true" />
            Actualizando…
          </span>
        )}
      </div>

      <div className={`${TABLA_CONTENEDOR} ${cargando && datos ? "opacity-60" : ""} transition-opacity`}>
        <table className={TABLA} aria-label="Proyectos filtrados" aria-busy={cargando}>
          <thead className={TABLA_CABECERA}>
            <tr>
              {COLUMNAS.map((c) => (
                <CabeceraOrdenable key={c.id} columna={c} ordering={ordering} onOrdenar={onOrdenar} />
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando && !datos ? (
              <FilaMensaje columnas={COLUMNAS.length} cargando>
                Cargando proyectos…
              </FilaMensaje>
            ) : error ? (
              <FilaMensaje columnas={COLUMNAS.length}>
                <span className="text-ufps">{error}</span>
              </FilaMensaje>
            ) : resultados.length === 0 ? (
              <FilaMensaje columnas={COLUMNAS.length}>No hay proyectos con estos filtros.</FilaMensaje>
            ) : (
              resultados.map((p) => (
                <tr key={p.id_proyecto} className={TABLA_FILA}>
                  <td className={TABLA_TD}>
                    <p className="font-semibold text-slate-900">{p.nombre_proyecto}</p>
                    <p className="text-xs text-slate-500">
                      {[p.origen_academico_display, p.sector_tecnologico].filter(Boolean).join(" · ") || "Sin caracterización"}
                    </p>
                  </td>
                  <td className={TABLA_TD}>{p.tipo_display || p.tipo || "—"}</td>
                  <td className={TABLA_TD}>
                    <Distintivo tono={p.vigencia === "activo" ? "oscuro" : "gris"}>{p.estado_display || p.estado}</Distintivo>
                  </td>
                  <td className={TABLA_TD}>
                    {p.aprobado_hitos ? (
                      <Distintivo tono="rojo">Aprobado</Distintivo>
                    ) : (
                      <Distintivo tono="contorno">No aprobado</Distintivo>
                    )}
                  </td>
                  <td className={TABLA_TD}>{p.periodo?.nombre || <span className="text-slate-500">Sin periodo</span>}</td>
                  <td className={TABLA_TD}>{p.tutor?.nombre || <span className="text-slate-500">Sin tutor</span>}</td>
                  <td className={TABLA_TD}>
                    <p>{p.postulante?.nombre || "—"}</p>
                    {p.postulante?.correo && <p className="text-xs text-slate-500">{p.postulante.correo}</p>}
                  </td>
                  <td className={`${TABLA_TD} text-center tabular-nums`}>{p.integrantes ?? "—"}</td>
                  <td className={`${TABLA_TD} text-center font-semibold tabular-nums text-slate-900`}>{p.nivel_madurez || "—"}</td>
                  <td className={`${TABLA_TD} whitespace-nowrap`}>{formatoFecha(p.creado)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <nav className="flex items-center justify-between gap-3" aria-label="Paginación de proyectos">
          <p className="text-xs text-slate-500">
            Página {page} de {paginas}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => onPagina(page - 1)} disabled={page <= 1 || cargando} className={BOTON_SECUNDARIO_SM}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </button>
            <button type="button" onClick={() => onPagina(page + 1)} disabled={page >= paginas || cargando} className={BOTON_SECUNDARIO_SM}>
              Siguiente
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
