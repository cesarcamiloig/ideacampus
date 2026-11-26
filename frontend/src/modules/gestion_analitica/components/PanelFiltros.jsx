import { useEffect, useId, useState } from "react";
import { ChevronDown, FilterX, SlidersHorizontal, X } from "lucide-react";
import {
  BOTON_FANTASMA,
  BOTON_SECUNDARIO,
  Buscador,
  CAMPO,
  CabeceraTarjeta,
  Contador,
  ETIQUETA,
  FOCO,
  MensajeError,
  Selector,
  Tarjeta,
} from "../../../components/ui";
import { chipsFiltros, contarAvanzados } from "../utils/filtrosAnalitica";

const ESPERA_BUSQUEDA_MS = 400;

// Control segmentado "Todos / opción / opción" con la misma forma que las pestañas de la app
function Segmentado({ etiqueta, valor, opciones, onChange }) {
  const todas = [{ valor: "", texto: "Todos" }, ...opciones];
  return (
    <div className="space-y-1.5">
      <p className={ETIQUETA}>{etiqueta}</p>
      <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {todas.map((op) => {
          const activa = op.valor === valor;
          return (
            <button
              key={op.valor || "todos"}
              type="button"
              aria-pressed={activa}
              onClick={() => onChange(op.valor)}
              className={`min-h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${FOCO} ${
                activa ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {op.texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CampoFecha({ etiqueta, valor, onChange, invalido }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta}
      </label>
      <input id={id} type="date" value={valor} onChange={(e) => onChange(e.target.value)} aria-invalid={invalido} className={CAMPO} />
    </div>
  );
}

export default function PanelFiltros({ filtros, opciones, onCambiar, onLimpiar, errorFechas, totalProyectos }) {
  const [busqueda, setBusqueda] = useState(filtros.q);
  const [masAbierto, setMasAbierto] = useState(false);

  // Si la búsqueda se limpia desde fuera (chip o "Limpiar filtros"), el campo también
  const [qPrevio, setQPrevio] = useState(filtros.q);
  if (qPrevio !== filtros.q) {
    setQPrevio(filtros.q);
    setBusqueda(filtros.q);
  }

  // Búsqueda con espera: no se consulta en cada tecla
  useEffect(() => {
    if (busqueda === filtros.q) return undefined;
    const temporizador = window.setTimeout(() => onCambiar("q", busqueda.trim()), ESPERA_BUSQUEDA_MS);
    return () => window.clearTimeout(temporizador);
  }, [busqueda, filtros.q, onCambiar]);

  const chips = chipsFiltros(filtros, opciones);
  const avanzados = contarAvanzados(filtros);

  const selector = (clave, etiqueta, placeholder) => (
    <Selector
      etiqueta={etiqueta}
      valor={filtros[clave]}
      onChange={(v) => onCambiar(clave, v)}
      opciones={opciones[clave] || []}
      placeholder={placeholder}
    />
  );

  return (
    <Tarjeta
      cabecera={
        <CabeceraTarjeta
          seccion="Filtros"
          titulo="Segmentar indicadores"
          descripcion={
            totalProyectos == null
              ? "Los filtros se aplican a la vez a los indicadores y a la tabla."
              : `${totalProyectos} proyecto(s) cumplen los filtros.`
          }
          acciones={
            chips.length > 0 && (
              <button type="button" onClick={onLimpiar} className={BOTON_FANTASMA}>
                <FilterX className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </button>
            )
          }
        />
      }
    >
      <div className="space-y-5">
        <Buscador
          valor={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por nombre del proyecto o de la iniciativa…"
          etiqueta="Buscar proyecto"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {selector("periodo", "Periodo", "Todos los periodos")}
          {selector("estudiante", "Estudiante", "Todos los estudiantes")}
          {selector("tutor", "Tutor", "Todos los tutores")}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Segmentado
            etiqueta="Vigencia"
            valor={filtros.vigencia}
            opciones={opciones.vigencia}
            onChange={(v) => onCambiar("vigencia", v)}
          />
          <Segmentado
            etiqueta="Aprobación por hitos"
            valor={filtros.aprobado_hitos}
            opciones={opciones.aprobado_hitos}
            onChange={(v) => onCambiar("aprobado_hitos", v)}
          />
          <Segmentado etiqueta="Tipo" valor={filtros.tipo} opciones={opciones.tipo} onChange={(v) => onCambiar("tipo", v)} />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMasAbierto((v) => !v)}
            aria-expanded={masAbierto}
            aria-controls="filtros-avanzados"
            className={BOTON_SECUNDARIO}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Más filtros
            {avanzados > 0 && <Contador>{avanzados}</Contador>}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-150 ${masAbierto ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {masAbierto && (
            <div id="filtros-avanzados" className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 animate-aparecer motion-reduce:animate-desvanecer">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {selector("anio", "Año", "Todos los años")}
                {selector("origen_academico", "Origen académico", "Todos los orígenes")}
                {selector("sector_tecnologico", "Sector tecnológico", "Todos los sectores")}
                {selector("etapa_actual", "Etapa", "Todas las etapas")}
                {selector("semestre", "Semestre de los integrantes", "Todos los semestres")}
                {selector("nivel_madurez", "Nivel de madurez", "Todos los niveles")}
                {selector("con_tutor", "Tutoría", "Con y sin tutor")}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <CampoFecha
                  etiqueta="Proyecto creado desde"
                  valor={filtros.fecha_desde}
                  onChange={(v) => onCambiar("fecha_desde", v)}
                  invalido={Boolean(errorFechas)}
                />
                <CampoFecha
                  etiqueta="Proyecto creado hasta"
                  valor={filtros.fecha_hasta}
                  onChange={(v) => onCambiar("fecha_hasta", v)}
                  invalido={Boolean(errorFechas)}
                />
              </div>
              <MensajeError>{errorFechas}</MensajeError>
            </div>
          )}
        </div>

        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-2 border-t border-slate-100 pt-4" aria-label="Filtros activos">
            {chips.map((chip) => (
              <li key={chip.clave}>
                <button
                  type="button"
                  onClick={() => onCambiar(chip.clave, "")}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition-colors hover:text-ufps hover:ring-ufps ${FOCO}`}
                  aria-label={`Quitar filtro ${chip.texto}`}
                >
                  {chip.texto}
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Tarjeta>
  );
}
