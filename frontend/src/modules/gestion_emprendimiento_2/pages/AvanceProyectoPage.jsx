import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, Plus, RefreshCw, Save } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { DocumentoAdjunto } from "../components/EvidenciasCargadasPanel";
import {
  getProyectosAvance,
  getTrayectoria,
  registrarAvance,
  retroalimentarAvance,
} from "../services/registroAvanceService";

const ESTADOS_AVANCE = [
  { id: "en_progreso", label: "En progreso" },
  { id: "completado", label: "Completado" },
  { id: "con_retraso", label: "Con retraso" },
  { id: "bloqueado", label: "Bloqueado" },
];

const ESTADOS_VALIDACION = {
  sin_registro: { label: "Sin registro", clase: "bg-slate-100 text-slate-600" },
  pendiente: { label: "Pendiente de validación", clase: "bg-amber-50 text-amber-700" },
  aprobado: { label: "Validado", clase: "bg-emerald-50 text-emerald-700" },
  observado: { label: "Con observaciones", clase: "bg-red-50 text-red-700" },
};

const FORMULARIO_VACIO = {
  evidencias: [],
  estado_avance: "en_progreso",
  porcentaje_avance: "",
  descripcion_avance: "",
  dificultades: "",
  riesgos: "",
  recomendaciones: "",
};

// text-base en móvil: Safari de iPhone hace zoom automático en inputs con fuente menor a 16px
const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 aria-[invalid=true]:border-red-500";
const LABEL_CLASS = "text-xs font-semibold text-slate-700";
const ERROR_CLASS = "text-xs font-medium text-red-600";
const BOTON_PRIMARIO_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60";
const BOTON_SECUNDARIO_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-red-600 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";
const BOTON_CANCELAR_CLASS =
  "rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60";

function formatFecha(valor) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function aTexto(valor) {
  return Array.isArray(valor) ? valor.join(" ") : String(valor);
}

// Convierte el error de la API en { campo: "mensaje", general: "..." } según los campos del formulario
function erroresDelServidor(err, campos, mensajePorDefecto) {
  if (err.status !== 400 || !err.data || typeof err.data !== "object") {
    return { general: err.message || mensajePorDefecto };
  }
  const resultado = {};
  const generales = [];
  Object.entries(err.data).forEach(([campo, valor]) => {
    if (campos.includes(campo)) resultado[campo] = aTexto(valor);
    else generales.push(aTexto(valor));
  });
  if (generales.length > 0) resultado.general = generales.join(" ");
  return resultado;
}

function MensajeError({ children }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

function EstadoValidacion({ estado }) {
  const { label, clase } = ESTADOS_VALIDACION[estado] || ESTADOS_VALIDACION.pendiente;
  return <span className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${clase}`}>{label}</span>;
}

function TextoRegistro({ titulo, texto }) {
  if (!texto) return null;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className="mt-0.5 whitespace-pre-line break-words text-xs leading-relaxed text-slate-700">{texto}</p>
    </div>
  );
}

function FormularioRegistro({ proyectoId, etapa, onGuardado, onCancelar, onErrorSesion }) {
  const [datos, setDatos] = useState(FORMULARIO_VACIO);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);

  function actualizar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setErrors((prev) => ({ ...prev, [campo]: undefined, general: undefined }));
  }

  function alternarEvidencia(id) {
    actualizar(
      "evidencias",
      datos.evidencias.includes(id) ? datos.evidencias.filter((x) => x !== id) : [...datos.evidencias, id]
    );
  }

  function validar() {
    const nuevos = {};
    if (datos.evidencias.length === 0) nuevos.evidencias = "Selecciona al menos una evidencia publicada.";
    if (!datos.descripcion_avance.trim()) nuevos.descripcion_avance = "Describe el avance logrado en esta etapa.";
    const porcentaje = Number(datos.porcentaje_avance);
    if (datos.porcentaje_avance !== "" && (!Number.isInteger(porcentaje) || porcentaje < 0 || porcentaje > 100)) {
      nuevos.porcentaje_avance = "Indica un número entero entre 0 y 100.";
    }
    return nuevos;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nuevos = validar();
    setErrors(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    try {
      await registrarAvance({
        ...datos,
        proyecto: proyectoId,
        etapa: etapa.id,
        porcentaje_avance: datos.porcentaje_avance === "" ? null : Number(datos.porcentaje_avance),
        descripcion_avance: datos.descripcion_avance.trim(),
        dificultades: datos.dificultades.trim(),
        riesgos: datos.riesgos.trim(),
        recomendaciones: datos.recomendaciones.trim(),
      });
      await onGuardado();
    } catch (err) {
      if (onErrorSesion(err)) return;
      setErrors(erroresDelServidor(
        err,
        ["evidencias", "estado_avance", "porcentaje_avance", "descripcion_avance", "dificultades", "riesgos", "recomendaciones"],
        "No se pudo guardar el registro de avance."
      ));
      setGuardando(false);
    }
  }

  const campoTexto = (campo, titulo, ayuda) => (
    <div className="space-y-1">
      <label htmlFor={`${campo}-${etapa.id}`} className={LABEL_CLASS}>{titulo}</label>
      <textarea
        id={`${campo}-${etapa.id}`}
        rows={2}
        placeholder={ayuda}
        value={datos[campo]}
        onChange={(e) => actualizar(campo, e.target.value)}
        aria-invalid={Boolean(errors[campo])}
        className={`${INPUT_CLASS} resize-none`}
      />
      {errors[campo] && <p className={ERROR_CLASS} role="alert">{errors[campo]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-red-200 bg-red-50/30 p-4">
      <fieldset className="space-y-2">
        <legend className={LABEL_CLASS}>Evidencia publicada que respalda el avance <span className="text-red-600">*</span></legend>
        {etapa.evidencias.map((ev) => (
          <label key={ev.id} className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={datos.evidencias.includes(ev.id)}
              onChange={() => alternarEvidencia(ev.id)}
              className="mt-0.5 accent-red-600"
            />
            <span className="break-words">{ev.titulo} · {ev.usuario_nombre} · {formatFecha(ev.creado)}</span>
          </label>
        ))}
        {errors.evidencias && <p className={ERROR_CLASS} role="alert">{errors.evidencias}</p>}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={`estado_avance-${etapa.id}`} className={LABEL_CLASS}>Estado del avance</label>
          <select
            id={`estado_avance-${etapa.id}`}
            value={datos.estado_avance}
            onChange={(e) => actualizar("estado_avance", e.target.value)}
            className={INPUT_CLASS}
          >
            {ESTADOS_AVANCE.map((estado) => (
              <option key={estado.id} value={estado.id}>{estado.label}</option>
            ))}
          </select>
          {errors.estado_avance && <p className={ERROR_CLASS} role="alert">{errors.estado_avance}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor={`porcentaje_avance-${etapa.id}`} className={LABEL_CLASS}>Porcentaje de avance (opcional)</label>
          <input
            id={`porcentaje_avance-${etapa.id}`}
            type="number"
            min="0"
            max="100"
            value={datos.porcentaje_avance}
            onChange={(e) => actualizar("porcentaje_avance", e.target.value)}
            aria-invalid={Boolean(errors.porcentaje_avance)}
            className={INPUT_CLASS}
          />
          {errors.porcentaje_avance && <p className={ERROR_CLASS} role="alert">{errors.porcentaje_avance}</p>}
        </div>
      </div>

      {campoTexto("descripcion_avance", "Descripción del avance *", "¿Qué se logró en esta etapa?")}
      {campoTexto("dificultades", "Dificultades", "Obstáculos encontrados durante el desarrollo.")}
      {campoTexto("riesgos", "Riesgos", "Riesgos que podrían afectar el proyecto.")}
      {campoTexto("recomendaciones", "Recomendaciones", "Acciones de mejora propuestas.")}

      {errors.general && <MensajeError>{errors.general}</MensajeError>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancelar} disabled={guardando} className={BOTON_CANCELAR_CLASS}>Cancelar</button>
        <button type="submit" disabled={guardando} className={BOTON_PRIMARIO_CLASS}>
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {guardando ? "Guardando..." : "Guardar registro"}
        </button>
      </div>
    </form>
  );
}

function FormularioValidacion({ registroId, onGuardado, onCancelar, onErrorSesion }) {
  const [comentario, setComentario] = useState("");
  const [errors, setErrors] = useState({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(aprobado) {
    if (!comentario.trim()) {
      setErrors({ comentario: "Escribe la retroalimentación para el equipo." });
      return;
    }
    setErrors({});
    setEnviando(true);
    try {
      await retroalimentarAvance(registroId, { comentario: comentario.trim(), aprobado });
      await onGuardado();
    } catch (err) {
      if (onErrorSesion(err)) return;
      setErrors(erroresDelServidor(err, ["comentario"], "No se pudo guardar la retroalimentación."));
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="space-y-1">
        <label htmlFor={`comentario-${registroId}`} className={LABEL_CLASS}>Retroalimentación del tutor *</label>
        <textarea
          id={`comentario-${registroId}`}
          rows={2}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          aria-invalid={Boolean(errors.comentario)}
          className={`${INPUT_CLASS} resize-none`}
        />
        {errors.comentario && <p className={ERROR_CLASS} role="alert">{errors.comentario}</p>}
      </div>
      {errors.general && <MensajeError>{errors.general}</MensajeError>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancelar} disabled={enviando} className={BOTON_CANCELAR_CLASS}>Cancelar</button>
        <button type="button" onClick={() => enviar(false)} disabled={enviando} className={BOTON_SECUNDARIO_CLASS}>
          Dejar observaciones
        </button>
        <button type="button" onClick={() => enviar(true)} disabled={enviando} className={BOTON_PRIMARIO_CLASS}>
          <CheckCircle2 className="h-4 w-4" />
          Validar avance
        </button>
      </div>
    </div>
  );
}

function RegistroAvance({ registro, esTutor, onActualizado, onErrorSesion }) {
  const [validando, setValidando] = useState(false);

  return (
    <li className="space-y-3 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {registro.estado_avance_display}
            {registro.porcentaje_avance !== null && ` · ${registro.porcentaje_avance}%`}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {registro.registrado_por_nombre} · {formatFecha(registro.fecha_registro)}
          </p>
        </div>
        <EstadoValidacion estado={registro.estado_validacion} />
      </div>

      <TextoRegistro titulo="Avance" texto={registro.descripcion_avance} />
      <TextoRegistro titulo="Dificultades" texto={registro.dificultades} />
      <TextoRegistro titulo="Riesgos" texto={registro.riesgos} />
      <TextoRegistro titulo="Recomendaciones" texto={registro.recomendaciones} />

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Evidencia que lo respalda</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-700">
          {registro.evidencias.map((ev) => <li key={ev.id} className="break-words">{ev.titulo}</li>)}
        </ul>
      </div>

      {registro.retroalimentaciones.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Retroalimentación del tutor</p>
          <ul className="mt-1 space-y-2">
            {registro.retroalimentaciones.map((retro) => (
              <li key={retro.id} className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-600">
                  {retro.aprobado ? "Validado" : "Con observaciones"} · {retro.tutor_nombre} · {formatFecha(retro.fecha)}
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-xs text-slate-700">{retro.comentario}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {esTutor && (validando ? (
        <FormularioValidacion
          registroId={registro.id}
          onCancelar={() => setValidando(false)}
          onGuardado={async () => {
            await onActualizado();
            setValidando(false);
          }}
          onErrorSesion={onErrorSesion}
        />
      ) : (
        <button type="button" onClick={() => setValidando(true)} className={BOTON_SECUNDARIO_CLASS}>
          <CheckCircle2 className="h-4 w-4" />
          Retroalimentar y validar
        </button>
      ))}
    </li>
  );
}

function EtapaTrayectoria({ etapa, proyectoId, esTutor, abierta, onAlternar, onActualizado, onErrorSesion }) {
  const [registrando, setRegistrando] = useState(false);
  const hayEvidencia = etapa.evidencias.length > 0;

  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        className="flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600 ring-1 ring-red-200">
            {etapa.numero_hito}
          </span>
          <div className="min-w-0">
            <p className="break-words text-sm font-bold text-slate-900">{etapa.nombre}</p>
            <p className="text-[11px] text-slate-500">
              {etapa.evidencias.length} evidencia(s) · {etapa.registros.length} registro(s) de avance
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-10 sm:pl-0">
          <EstadoValidacion estado={etapa.estado_validacion} />
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${abierta ? "rotate-180" : ""}`} />
        </div>
      </button>

      {abierta && (
        <div className="space-y-5 border-t border-slate-100 p-4 sm:p-5">
          {etapa.descripcion && <p className="text-xs leading-relaxed text-slate-600">{etapa.descripcion}</p>}

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-600">Evidencia publicada</h4>
            {hayEvidencia ? (
              <ul className="space-y-3">
                {etapa.evidencias.map((ev) => (
                  <li key={ev.id} className="space-y-2">
                    <p className="break-words text-xs font-semibold text-slate-800">
                      {ev.titulo} <span className="font-normal text-slate-500">· {ev.usuario_nombre} · {formatFecha(ev.creado)}</span>
                    </p>
                    <ul className="space-y-2">
                      {ev.documentos.map((doc) => <DocumentoAdjunto key={doc.id} doc={doc} />)}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">
                {esTutor
                  ? "El equipo aún no ha publicado evidencia en esta etapa."
                  : "Aún no hay evidencia en esta etapa. Publícala en Evidencias de Avance para poder registrar el avance."}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-600">Registros de avance</h4>
              {hayEvidencia && !registrando && (
                <button type="button" onClick={() => setRegistrando(true)} className={BOTON_SECUNDARIO_CLASS}>
                  <Plus className="h-4 w-4" />
                  Registrar avance
                </button>
              )}
            </div>
            {registrando && (
              <FormularioRegistro
                proyectoId={proyectoId}
                etapa={etapa}
                onCancelar={() => setRegistrando(false)}
                onGuardado={async () => {
                  await onActualizado();
                  setRegistrando(false);
                }}
                onErrorSesion={onErrorSesion}
              />
            )}
            {etapa.registros.length === 0 ? (
              !registrando && <p className="text-xs text-slate-500">Aún no se ha registrado avance en esta etapa.</p>
            ) : (
              <ul className="space-y-3">
                {etapa.registros.map((registro) => (
                  <RegistroAvance
                    key={registro.id}
                    registro={registro}
                    esTutor={esTutor}
                    onActualizado={onActualizado}
                    onErrorSesion={onErrorSesion}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// Trayectoria del proyecto por etapas: el estudiante y el tutor registran el avance; el tutor lo valida
export default function AvanceProyectoPage({ rol }) {
  const { logout } = useAuth();
  const esTutor = rol === "tutor";

  const [proyectos, setProyectos] = useState([]);
  const [proyectoId, setProyectoId] = useState(null);
  const [cargandoProyectos, setCargandoProyectos] = useState(true);
  const [trayectoria, setTrayectoria] = useState(null);
  const [cargandoTrayectoria, setCargandoTrayectoria] = useState(false);
  const [etapaAbierta, setEtapaAbierta] = useState(null);
  const [error, setError] = useState("");

  // logout cambia en cada render del AuthProvider: se guarda en una ref para no recargar los datos
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  // 401: token ausente o vencido → se cierra la sesión y la app vuelve al login
  const manejarErrorSesion = useCallback((err) => {
    if (err?.status === 401) {
      logoutRef.current?.();
      return true;
    }
    return false;
  }, []);

  const cargarProyectos = useCallback(async () => {
    setCargandoProyectos(true);
    setError("");
    try {
      const lista = await getProyectosAvance();
      setProyectos(lista);
      setProyectoId((actual) => actual ?? lista[0]?.id ?? null);
    } catch (err) {
      if (!manejarErrorSesion(err)) setError(err.message || "No se pudieron cargar los proyectos.");
    } finally {
      setCargandoProyectos(false);
    }
  }, [manejarErrorSesion]);

  // Solo la última consulta actualiza la vista si el usuario cambia de proyecto mientras carga
  const ultimaConsulta = useRef(0);
  const cargarTrayectoria = useCallback(async (id, { abrirEtapa = false } = {}) => {
    const consulta = ++ultimaConsulta.current;
    try {
      const datos = await getTrayectoria(id);
      if (consulta !== ultimaConsulta.current) return;
      setTrayectoria(datos);
      setError("");
      if (abrirEtapa) {
        // Se abre la primera etapa que falta por validar
        setEtapaAbierta(datos.etapas.find((etapa) => etapa.estado_validacion !== "aprobado")?.id ?? null);
      }
    } catch (err) {
      if (consulta === ultimaConsulta.current && !manejarErrorSesion(err)) {
        setError(err.message || "No se pudo cargar la trayectoria del proyecto.");
      }
    } finally {
      if (consulta === ultimaConsulta.current) setCargandoTrayectoria(false);
    }
  }, [manejarErrorSesion]);

  useEffect(() => {
    cargarProyectos();
  }, [cargarProyectos]);

  useEffect(() => {
    if (!proyectoId) return;
    setTrayectoria(null);
    setCargandoTrayectoria(true);
    cargarTrayectoria(proyectoId, { abrirEtapa: true });
  }, [proyectoId, cargarTrayectoria]);

  function reintentar() {
    if (!proyectoId) {
      cargarProyectos();
      return;
    }
    setCargandoTrayectoria(true);
    cargarTrayectoria(proyectoId, { abrirEtapa: true });
  }

  const cargando = cargandoProyectos || cargandoTrayectoria;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Avance del proyecto</span>
          <h2 className="mt-0.5 text-xl font-bold text-slate-900">Trayectoria por etapas</h2>
          <p className="mt-1 text-sm text-slate-600">
            {esTutor
              ? "Registra y valida el avance de los proyectos que acompañas, con la evidencia publicada por el equipo."
              : "Registra el avance de cada etapa con la evidencia publicada, sus dificultades, riesgos y recomendaciones."}
          </p>
        </div>
        {proyectos.length > 1 && (
          <div className="space-y-1 sm:w-64">
            <label htmlFor="proyecto-avance" className={LABEL_CLASS}>Proyecto</label>
            <select
              id="proyecto-avance"
              value={proyectoId ?? ""}
              onChange={(e) => setProyectoId(Number(e.target.value))}
              className={INPUT_CLASS}
            >
              {proyectos.map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={reintentar}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      ) : null}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-xs text-slate-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-red-600" />
          Cargando la trayectoria...
        </div>
      ) : !error && proyectos.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white py-12 text-center text-xs text-slate-500 shadow-sm">
          {esTutor ? "Aún no tienes proyectos asignados." : "Aún no participas en un proyecto aprobado."}
        </p>
      ) : trayectoria?.etapas.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white py-12 text-center text-xs text-slate-500 shadow-sm">
          La rúbrica de este tipo de iniciativa aún no tiene etapas definidas.
        </p>
      ) : trayectoria ? (
        <ol className="space-y-3">
          {trayectoria.etapas.map((etapa) => (
            <EtapaTrayectoria
              key={etapa.id}
              etapa={etapa}
              proyectoId={proyectoId}
              esTutor={esTutor}
              abierta={etapaAbierta === etapa.id}
              onAlternar={() => setEtapaAbierta((actual) => (actual === etapa.id ? null : etapa.id))}
              onActualizado={() => cargarTrayectoria(proyectoId)}
              onErrorSesion={manejarErrorSesion}
            />
          ))}
        </ol>
      ) : null}
    </div>
  );
}
