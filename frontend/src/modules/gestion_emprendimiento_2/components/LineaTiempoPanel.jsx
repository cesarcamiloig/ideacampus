import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CircleDot,
  ClipboardCheck,
  Flag,
  FolderClosed,
  FolderKanban,
  GraduationCap,
  History,
  Lightbulb,
  RefreshCw,
  ShieldOff,
  User,
} from "lucide-react";
import { BOTON_SECUNDARIO } from "../../gestion_evaluacion/components/estilos";
import { Esqueleto, EstadoCompleto, PanelLateral } from "../../gestion_acompaniamiento/components/panelComun";
import { useManejarErrorSesion } from "../../gestion_acompaniamiento/components/panelUtilidades";
import { getLineaTiempo } from "../services/lineaTiempoService";

// "iniciativa" es el nombre que usa el contrato para el evento de postulación
const TIPOS_EVENTO = {
  postulacion: { etiqueta: "Postulación", Icono: Lightbulb },
  creacion_proyecto: { etiqueta: "Proyecto", Icono: FolderKanban },
  asignacion_tutor: { etiqueta: "Tutoría", Icono: GraduationCap },
  hito_plan_trabajo: { etiqueta: "Hito del plan", Icono: Flag },
  evaluacion: { etiqueta: "Evaluación", Icono: ClipboardCheck },
};
const ALIAS_TIPO = { iniciativa: "postulacion" };

const TONOS = {
  exito: { punto: "bg-emerald-600 text-white", estado: "bg-emerald-50 text-emerald-800" },
  proceso: { punto: "bg-amber-500 text-white", estado: "bg-amber-50 text-amber-800" },
  alerta: { punto: "bg-ufps text-white", estado: "bg-ufps-suave text-ufps" },
  neutro: { punto: "bg-slate-500 text-white", estado: "bg-slate-100 text-slate-700" },
};
const ESTADOS_EXITO = ["completado", "aprobada", "aprobado", "aceptada", "aceptado", "validada", "activo", "finalizado", "tutor_asignado"];
const ESTADOS_PROCESO = ["en_progreso", "en_evaluacion", "en_revision", "pendiente", "pausado", "radicada"];
const ESTADOS_ALERTA = ["rechazada", "rechazado", "cancelado"];

function tipoDe(evento) {
  const tipo = evento.tipo_evento || "";
  return ALIAS_TIPO[tipo] || tipo;
}

function infoTipo(tipo) {
  return TIPOS_EVENTO[tipo] || { etiqueta: textoLegible(tipo) || "Evento", Icono: CircleDot };
}

// "tutor_asignado" → "Tutor asignado"; "calificado (Nota: 4.5)" se conserva con mayúscula inicial
function textoLegible(valor) {
  const texto = (valor || "").replace(/_/g, " ").trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function tonoEstado(estado) {
  const e = (estado || "").toLowerCase();
  if (ESTADOS_EXITO.includes(e) || e.startsWith("calificado")) return TONOS.exito;
  if (ESTADOS_PROCESO.includes(e)) return TONOS.proceso;
  if (ESTADOS_ALERTA.includes(e)) return TONOS.alerta;
  return TONOS.neutro;
}

function aFecha(valor) {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function formatFechaHora(fecha) {
  return fecha.toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFecha(fecha) {
  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function mesDe(fecha) {
  if (!fecha) return "Sin fecha registrada";
  return textoLegible(fecha.toLocaleDateString("es-CO", { month: "long", year: "numeric" }));
}

// Agrupa por mes conservando el orden en que el backend entrega los eventos
function agruparPorMes(eventos) {
  const grupos = [];
  eventos.forEach((evento) => {
    const mes = mesDe(aFecha(evento.fecha));
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.mes === mes) ultimo.eventos.push(evento);
    else grupos.push({ mes, eventos: [evento] });
  });
  return grupos;
}

function Resumen({ eventos }) {
  const fechas = eventos.map((e) => aFecha(e.fecha)).filter(Boolean).sort((a, b) => a - b);
  const hitos = eventos.filter((e) => tipoDe(e) === "hito_plan_trabajo");
  const completados = hitos.filter((e) => (e.estado || "").toLowerCase() === "completado").length;
  const datos = [
    { etiqueta: "Etapas registradas", valor: eventos.length },
    { etiqueta: "Hitos completados", valor: hitos.length ? `${completados} de ${hitos.length}` : "Sin plan de trabajo" },
    { etiqueta: "Periodo", valor: fechas.length ? `${formatFecha(fechas[0])} – ${formatFecha(fechas[fechas.length - 1])}` : "Sin fechas" },
  ];
  return (
    <dl className="grid grid-cols-1 gap-3 rounded-2xl bg-superficie-alta p-4 ring-1 ring-slate-200/70 sm:grid-cols-3">
      {datos.map((d) => (
        <div key={d.etiqueta} className="min-w-0">
          <dt className="text-xs text-slate-600">{d.etiqueta}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">{d.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function EventoLineaTiempo({ evento }) {
  const { etiqueta, Icono } = infoTipo(tipoDe(evento));
  const tono = tonoEstado(evento.estado);
  const fecha = aFecha(evento.fecha);

  return (
    <li className="ml-7">
      <span
        className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white ${tono.punto}`}
        aria-hidden="true"
      >
        <Icono className="h-3.5 w-3.5" />
      </span>
      <div className="space-y-1.5 rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
          <span className="font-semibold uppercase tracking-wide text-slate-700">{etiqueta}</span>
          <span aria-hidden="true">·</span>
          {fecha ? <time dateTime={evento.fecha}>{formatFechaHora(fecha)}</time> : <span>Sin fecha</span>}
        </div>
        <p className="break-words text-sm font-semibold text-slate-900">{evento.nombre || "Etapa sin nombre"}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tono.estado}`}>
            {textoLegible(evento.estado) || "Sin estado"}
          </span>
          {evento.responsable && (
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-slate-600">
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Responsable:</span>
              <span className="truncate">{evento.responsable}</span>
            </span>
          )}
        </div>
        {evento.observaciones && (
          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{evento.observaciones}</p>
        )}
      </div>
    </li>
  );
}

// Línea de tiempo evolutiva de una iniciativa o proyecto, en un panel lateral.
// Recibe idIniciativa (Banco de Iniciativas) o idProyecto (proyectos asignados al tutor).
export default function LineaTiempoPanel({ idIniciativa, idProyecto, nombre, onClose }) {
  const manejarErrorSesion = useManejarErrorSesion();
  const [orden, setOrden] = useState("asc");
  const [filtro, setFiltro] = useState("todos");
  const [estado, setEstado] = useState({ fase: "cargando" }); // cargando | listo | sinPermiso | noEncontrado | error
  const [eventos, setEventos] = useState([]);

  // Solo la última consulta actualiza el panel si se cambia el orden mientras carga
  const ultimaConsulta = useRef(0);
  const cargar = useCallback(async () => {
    const consulta = ++ultimaConsulta.current;
    setEstado({ fase: "cargando" });
    try {
      const lista = await getLineaTiempo({ idIniciativa, idProyecto, orden });
      if (consulta !== ultimaConsulta.current) return;
      setEventos(lista);
      setEstado({ fase: "listo" });
    } catch (err) {
      if (consulta !== ultimaConsulta.current || manejarErrorSesion(err)) return;
      if (err.status === 403) setEstado({ fase: "sinPermiso", mensaje: err.message });
      else if (err.status === 404) setEstado({ fase: "noEncontrado", mensaje: err.message });
      else setEstado({ fase: "error", mensaje: err.message });
    }
  }, [idIniciativa, idProyecto, orden, manejarErrorSesion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const tiposPresentes = useMemo(() => {
    const conteo = {};
    eventos.forEach((e) => {
      const tipo = tipoDe(e);
      conteo[tipo] = (conteo[tipo] || 0) + 1;
    });
    return Object.entries(conteo);
  }, [eventos]);

  // Si el filtro elegido ya no existe tras recargar, se vuelve a mostrar todo
  const filtroActivo = filtro !== "todos" && tiposPresentes.some(([tipo]) => tipo === filtro) ? filtro : "todos";
  const visibles = filtroActivo === "todos" ? eventos : eventos.filter((e) => tipoDe(e) === filtroActivo);
  const grupos = agruparPorMes(visibles);

  const claseFiltro = (activo) =>
    `min-h-9 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15 ${
      activo ? "bg-ufps text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
    }`;

  return (
    <PanelLateral
      titulo="Línea de tiempo"
      subtitulo={nombre || "Iniciativa"}
      etiquetaCerrar="Cerrar línea de tiempo"
      onClose={onClose}
      anuncio={estado.fase === "listo" ? `${eventos.length} etapas registradas` : ""}
    >
      {estado.fase === "cargando" ? (
        <Esqueleto texto="Cargando la línea de tiempo..." />
      ) : estado.fase === "sinPermiso" ? (
        <EstadoCompleto icono={ShieldOff} titulo="Sin acceso a la línea de tiempo">
          {estado.mensaje || "Solo Tutor, Coordinación y Dirección del Programa pueden consultarla."}
        </EstadoCompleto>
      ) : estado.fase === "noEncontrado" ? (
        <EstadoCompleto icono={FolderClosed} titulo="Iniciativa no encontrada">
          {estado.mensaje || "No se encontró el proyecto o iniciativa especificada."}
        </EstadoCompleto>
      ) : estado.fase === "error" ? (
        <EstadoCompleto
          icono={RefreshCw}
          titulo="No se pudo cargar la línea de tiempo"
          accion={
            <button type="button" onClick={cargar} className={BOTON_SECUNDARIO}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </button>
          }
        >
          {estado.mensaje}
        </EstadoCompleto>
      ) : eventos.length === 0 ? (
        <EstadoCompleto icono={History} titulo="Aún no hay etapas registradas">
          Cuando la iniciativa avance (postulación, proyecto, plan de trabajo y evaluaciones), sus etapas aparecerán aquí.
        </EstadoCompleto>
      ) : (
        <div className="space-y-5">
          <Resumen eventos={eventos} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de etapa">
              <button
                type="button"
                aria-pressed={filtroActivo === "todos"}
                onClick={() => setFiltro("todos")}
                className={claseFiltro(filtroActivo === "todos")}
              >
                Todas ({eventos.length})
              </button>
              {tiposPresentes.map(([tipo, cantidad]) => (
                <button
                  key={tipo}
                  type="button"
                  aria-pressed={filtroActivo === tipo}
                  onClick={() => setFiltro(tipo)}
                  className={claseFiltro(filtroActivo === tipo)}
                >
                  {infoTipo(tipo).etiqueta} ({cantidad})
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOrden((actual) => (actual === "asc" ? "desc" : "asc"))}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-700 hover:bg-slate-900/[0.04] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
            >
              {orden === "asc" ? (
                <ArrowDownWideNarrow className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowUpWideNarrow className="h-4 w-4" aria-hidden="true" />
              )}
              {orden === "asc" ? "Más antiguas primero" : "Más recientes primero"}
            </button>
          </div>

          <div className="space-y-6">
            {grupos.map((grupo) => (
              <section key={grupo.mes} aria-label={grupo.mes} className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ufps">{grupo.mes}</h3>
                <ol className="relative ml-3.5 space-y-4 border-l-2 border-slate-200">
                  {grupo.eventos.map((evento, i) => (
                    <EventoLineaTiempo key={`${tipoDe(evento)}-${evento.id_etapa ?? "x"}-${i}`} evento={evento} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
      )}
    </PanelLateral>
  );
}
