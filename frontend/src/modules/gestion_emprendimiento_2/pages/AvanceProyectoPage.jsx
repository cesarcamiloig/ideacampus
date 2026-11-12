import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardCheck, Loader2, Plus, Save, Send } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { DocumentoAdjunto } from "../components/EvidenciasCargadasPanel";
import {
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  Cargando,
  DISTINTIVO_BASE,
  EncabezadoPagina,
  ErrorCarga,
  ErrorGeneral,
  ETIQUETA,
  FOCO,
  ROTULO,
  Selector,
  TARJETA,
  TONOS_DISTINTIVO,
  Tarjeta,
} from "../../../components/ui";
import {
  getProyectosAvance,
  getTrayectoria,
  registrarAvance,
  revisarAvance,
} from "../services/registroAvanceService";

// Paleta UFPS: validado = rojo, pendiente = negro, observado = contorno rojo, sin registro = gris
const ESTADOS_VALIDACION = {
  sin_registro: { label: "Sin registro", clase: TONOS_DISTINTIVO.gris },
  pendiente: { label: "Pendiente de validación", clase: TONOS_DISTINTIVO.oscuro },
  aprobado: { label: "Validado", clase: TONOS_DISTINTIVO.rojo },
  observado: { label: "Con observaciones", clase: TONOS_DISTINTIVO.alerta },
};

const FORMULARIO_VACIO = {
  evidencias: [],
  descripcion_avance: "",
  dificultades: "",
  riesgos: "",
};

// Clases del sistema visual compartido (components/ui)
const INPUT_CLASS = CAMPO;
const LABEL_CLASS = ETIQUETA;
const ERROR_CLASS = "text-xs font-medium text-ufps";
const BOTON_PRIMARIO_CLASS = BOTON_PRIMARIO;
const BOTON_SECUNDARIO_CLASS = BOTON_SECUNDARIO;
const BOTON_CANCELAR_CLASS = BOTON_SECUNDARIO;

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
  return <ErrorGeneral mensaje={children} />;
}

function EstadoValidacion({ estado }) {
  const { label, clase } = ESTADOS_VALIDACION[estado] || ESTADOS_VALIDACION.pendiente;
  return <span className={`${DISTINTIVO_BASE} w-fit ${clase}`}>{label}</span>;
}

function TextoRegistro({ titulo, texto, clase = "text-slate-500" }) {
  if (!texto) return null;
  return (
    <div>
      <p className={`text-[11px] font-bold uppercase tracking-wider ${clase}`}>{titulo}</p>
      <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{texto}</p>
    </div>
  );
}

// Actividad del plan de trabajo a la que corresponde la evidencia (si se subió para una actividad)
function ActividadEvidencia({ evidencia }) {
  return evidencia.actividad_nombre ? (
    <span className="font-medium text-slate-700">Actividad: {evidencia.actividad_nombre}</span>
  ) : (
    <span className="italic text-slate-400">Sin actividad asociada</span>
  );
}

function CampoTexto({ id, titulo, ayuda, valor, error, onChange, rows = 2 }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={LABEL_CLASS}>{titulo}</label>
      <textarea
        id={id}
        rows={rows}
        placeholder={ayuda}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`${INPUT_CLASS} resize-none`}
      />
      {error && <p className={ERROR_CLASS} role="alert">{error}</p>}
    </div>
  );
}

// Registro del avance de una etapa: solo lo hace el estudiante
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
        proyecto: proyectoId,
        etapa: etapa.id,
        evidencias: datos.evidencias,
        descripcion_avance: datos.descripcion_avance.trim(),
        dificultades: datos.dificultades.trim(),
        riesgos: datos.riesgos.trim(),
      });
      await onGuardado();
    } catch (err) {
      if (onErrorSesion(err)) return;
      setErrors(erroresDelServidor(
        err,
        ["evidencias", "descripcion_avance", "dificultades", "riesgos"],
        "No se pudo guardar el registro de avance."
      ));
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <fieldset className="space-y-2">
        <legend className={LABEL_CLASS}>Evidencia publicada que respalda el avance <span className="text-ufps">*</span></legend>
        {etapa.evidencias.map((ev) => (
          <label key={ev.id} className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={datos.evidencias.includes(ev.id)}
              onChange={() => alternarEvidencia(ev.id)}
              className="mt-0.5 h-4 w-4 accent-ufps"
            />
            <span className="min-w-0 break-words">
              <span className="font-semibold text-slate-800">{ev.titulo}</span>
              <span className="block text-xs text-slate-500">
                <ActividadEvidencia evidencia={ev} /> · {ev.usuario_nombre} · {formatFecha(ev.creado)}
              </span>
            </span>
          </label>
        ))}
        {errors.evidencias && <p className={ERROR_CLASS} role="alert">{errors.evidencias}</p>}
      </fieldset>

      <CampoTexto
        id={`descripcion_avance-${etapa.id}`}
        titulo="Descripción del avance *"
        ayuda="¿Qué se logró en esta etapa?"
        valor={datos.descripcion_avance}
        error={errors.descripcion_avance}
        onChange={(valor) => actualizar("descripcion_avance", valor)}
      />
      <CampoTexto
        id={`dificultades-${etapa.id}`}
        titulo="Dificultades"
        ayuda="Obstáculos encontrados durante el desarrollo."
        valor={datos.dificultades}
        error={errors.dificultades}
        onChange={(valor) => actualizar("dificultades", valor)}
      />
      <CampoTexto
        id={`riesgos-${etapa.id}`}
        titulo="Riesgos"
        ayuda="Riesgos que podrían afectar el proyecto."
        valor={datos.riesgos}
        error={errors.riesgos}
        onChange={(valor) => actualizar("riesgos", valor)}
      />

      {errors.general && <MensajeError>{errors.general}</MensajeError>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancelar} disabled={guardando} className={BOTON_CANCELAR_CLASS}>Cancelar</button>
        <button type="submit" disabled={guardando} className={BOTON_PRIMARIO_CLASS}>
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {guardando ? "Guardando..." : "Guardar registro"}
        </button>
      </div>
    </form>
  );
}

// Revisión del avance: solo la hace el tutor asignado
function FormularioRevision({ registroId, onGuardado, onCancelar, onErrorSesion }) {
  const [datos, setDatos] = useState({ recomendaciones: "", errores: "" });
  const [errors, setErrors] = useState({});
  const [enviando, setEnviando] = useState(false);

  function actualizar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setErrors({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const recomendaciones = datos.recomendaciones.trim();
    const errores = datos.errores.trim();
    if (!recomendaciones && !errores) {
      setErrors({ general: "Escribe al menos una recomendación o un error encontrado." });
      return;
    }
    setEnviando(true);
    try {
      await revisarAvance(registroId, { recomendaciones, errores });
      await onGuardado();
    } catch (err) {
      if (onErrorSesion(err)) return;
      setErrors(erroresDelServidor(err, ["recomendaciones", "errores"], "No se pudo guardar la revisión."));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <CampoTexto
        id={`recomendaciones-${registroId}`}
        titulo="Recomendaciones"
        ayuda="Sugerencias para mejorar el avance del equipo."
        valor={datos.recomendaciones}
        error={errors.recomendaciones}
        onChange={(valor) => actualizar("recomendaciones", valor)}
        rows={3}
      />
      <CampoTexto
        id={`errores-${registroId}`}
        titulo="Errores"
        ayuda="Lo que está mal y el equipo debe corregir."
        valor={datos.errores}
        error={errors.errores}
        onChange={(valor) => actualizar("errores", valor)}
        rows={3}
      />
      <p className="text-xs leading-relaxed text-slate-500">
        Si señalas errores, el avance queda <strong className="font-semibold text-slate-700">con observaciones</strong> y
        se avisa al equipo para que los corrija. Sin errores, queda <strong className="font-semibold text-slate-700">validado</strong>.
      </p>
      {errors.general && <MensajeError>{errors.general}</MensajeError>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancelar} disabled={enviando} className={BOTON_CANCELAR_CLASS}>Cancelar</button>
        <button type="submit" disabled={enviando} className={BOTON_PRIMARIO_CLASS}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {enviando ? "Enviando..." : "Enviar revisión"}
        </button>
      </div>
    </form>
  );
}

function RegistroAvance({ registro, esTutor, onActualizado, onErrorSesion }) {
  const [revisando, setRevisando] = useState(false);

  return (
    <li className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Avance registrado</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {registro.registrado_por_nombre} · {formatFecha(registro.fecha_registro)}
          </p>
        </div>
        <EstadoValidacion estado={registro.estado_validacion} />
      </div>

      <TextoRegistro titulo="Avance" texto={registro.descripcion_avance} />
      <TextoRegistro titulo="Dificultades" texto={registro.dificultades} />
      <TextoRegistro titulo="Riesgos" texto={registro.riesgos} />

      <div>
        <p className={ROTULO}>Evidencia que lo respalda</p>
        <ul className="mt-1 space-y-1 text-sm text-slate-700">
          {registro.evidencias.map((ev) => (
            <li key={ev.id} className="break-words">
              <span className="font-medium text-slate-800">{ev.titulo}</span>
              <span className="text-xs text-slate-500"> · <ActividadEvidencia evidencia={ev} /></span>
            </li>
          ))}
        </ul>
      </div>

      {registro.retroalimentaciones.length > 0 && (
        <div>
          <p className={ROTULO}>Revisión del tutor</p>
          <ul className="mt-1 space-y-2">
            {registro.retroalimentaciones.map((retro) => (
              <li key={retro.id} className="space-y-2 rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-slate-600">
                  {retro.aprobado ? "Validado" : "Con observaciones"} · {retro.tutor_nombre} · {formatFecha(retro.fecha)}
                </p>
                <TextoRegistro titulo="Recomendaciones" texto={retro.recomendaciones} />
                <TextoRegistro titulo="Errores" texto={retro.errores} clase="text-ufps" />
                {/* Revisiones anteriores al cambio: un único comentario */}
                <TextoRegistro titulo="Comentario" texto={retro.comentario} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {esTutor && (revisando ? (
        <FormularioRevision
          registroId={registro.id}
          onCancelar={() => setRevisando(false)}
          onGuardado={async () => {
            await onActualizado();
            setRevisando(false);
          }}
          onErrorSesion={onErrorSesion}
        />
      ) : (
        <button type="button" onClick={() => setRevisando(true)} className={BOTON_SECUNDARIO_CLASS}>
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          Revisar avance
        </button>
      ))}
    </li>
  );
}

function EtapaTrayectoria({ etapa, proyectoId, esTutor, abierta, onAlternar, onActualizado, onErrorSesion }) {
  const [registrando, setRegistrando] = useState(false);
  const hayEvidencia = etapa.evidencias.length > 0;

  return (
    <li className={`${TARJETA} overflow-hidden`}>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        className={`flex w-full flex-col gap-2 bg-superficie-alta px-5 py-4 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${FOCO}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ufps text-xs font-semibold text-white">
            {etapa.numero_hito}
          </span>
          <div className="min-w-0">
            <p className="break-words text-base font-semibold text-slate-900">{etapa.nombre}</p>
            <p className="text-xs text-slate-500">
              {etapa.evidencias.length} evidencia(s) · {etapa.registros.length} registro(s) de avance
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-10 sm:pl-0">
          <EstadoValidacion estado={etapa.estado_validacion} />
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform motion-reduce:transition-none ${abierta ? "rotate-180" : ""}`} aria-hidden="true" />
        </div>
      </button>

      {abierta && (
        <div className="space-y-6 border-t border-slate-200 p-5 sm:p-6">
          {etapa.descripcion && <p className="text-sm leading-relaxed text-slate-600">{etapa.descripcion}</p>}

          <div className="space-y-2">
            <h4 className={ROTULO}>Evidencia publicada</h4>
            {hayEvidencia ? (
              <ul className="space-y-3">
                {etapa.evidencias.map((ev) => (
                  <li key={ev.id} className="space-y-2">
                    <div>
                      <p className="break-words text-sm font-semibold text-slate-800">
                        {ev.titulo} <span className="font-normal text-slate-500">· {ev.usuario_nombre} · {formatFecha(ev.creado)}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500"><ActividadEvidencia evidencia={ev} /></p>
                    </div>
                    <ul className="space-y-2">
                      {ev.documentos.map((doc) => <DocumentoAdjunto key={doc.id} doc={doc} />)}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                {esTutor
                  ? "El equipo aún no ha publicado evidencia en esta etapa."
                  : "Aún no hay evidencia en esta etapa. Publícala en Evidencias de Avance para poder registrar el avance."}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className={ROTULO}>Registros de avance</h4>
              {/* El avance lo registra el estudiante; el tutor lo revisa */}
              {!esTutor && hayEvidencia && !registrando && (
                <button type="button" onClick={() => setRegistrando(true)} className={BOTON_SECUNDARIO_CLASS}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
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
              !registrando && (
                <p className="text-sm text-slate-500">
                  {esTutor
                    ? "El equipo aún no ha registrado avance en esta etapa."
                    : "Aún no se ha registrado avance en esta etapa."}
                </p>
              )
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

// Trayectoria del proyecto por etapas: el estudiante registra el avance; el tutor lo revisa
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
      <EncabezadoPagina
        seccion="Avance del proyecto"
        titulo="Trayectoria por etapas"
        descripcion={
          esTutor
            ? "Revisa el avance que registra el equipo en cada etapa: deja tus recomendaciones y señala los errores a corregir."
            : "Registra el avance de cada etapa con la evidencia publicada, sus dificultades y riesgos. Tu tutor lo revisará."
        }
        acciones={
          proyectos.length > 1 && (
            <Selector
              className="w-full sm:w-64"
              etiqueta="Proyecto"
              valor={proyectoId ?? ""}
              onChange={(valor) => setProyectoId(Number(valor))}
              opciones={proyectos.map((proyecto) => ({ valor: proyecto.id, texto: proyecto.nombre }))}
            />
          )
        }
      />

      {error ? <ErrorCarga mensaje={error} onReintentar={reintentar} /> : null}

      {cargando ? (
        <Cargando texto="Cargando la trayectoria..." />
      ) : !error && proyectos.length === 0 ? (
        <Tarjeta>
          <p className="text-center text-sm text-slate-500">
            {esTutor ? "Aún no tienes proyectos asignados." : "Aún no participas en un proyecto aprobado."}
          </p>
        </Tarjeta>
      ) : trayectoria?.etapas.length === 0 ? (
        <Tarjeta>
          <p className="text-center text-sm text-slate-500">La rúbrica de este tipo de iniciativa aún no tiene etapas definidas.</p>
        </Tarjeta>
      ) : trayectoria ? (
        <ol className="space-y-4">
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
