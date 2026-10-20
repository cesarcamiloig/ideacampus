import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ExternalLink,
  FolderClosed,
  Loader2,
  Lock,
  RefreshCw,
  ShieldOff,
  X,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  BOTON_FANTASMA,
  BOTON_ICONO,
  BOTON_PELIGRO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  ETIQUETA,
} from "../../gestion_evaluacion/components/estilos";
import {
  NIVELES_ACADEMICOS,
  asignarMentor,
  desasignarMentor,
  getMentoresDelProyecto,
  getProyectoDeIniciativa,
} from "../services/mentorService";

// Duraciones alineadas con las clases de transición de abajo
const SALIDA_PANEL_MS = 200;
const SALIDA_FILA_MS = 160;

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function prefiereMenosMovimiento() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function porNombre(a, b) {
  return (a.nombre || "").localeCompare(b.nombre || "", "es");
}

function iniciales(nombre = "") {
  return (
    nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "M"
  );
}

// Proyecto de la iniciativa y, si existe, sus mentores asignados y disponibles
// El listado de iniciativas ya trae id_proyecto; si no viene, se consulta por la iniciativa
async function obtenerDatosPanel(idIniciativa, idProyectoConocido) {
  const idProyecto = idProyectoConocido ?? (await getProyectoDeIniciativa(idIniciativa));
  if (!idProyecto) return { idProyecto: null, datos: null };
  return { idProyecto, datos: await getMentoresDelProyecto(idProyecto) };
}

function Esqueleto() {
  return (
    <div className="space-y-8" aria-busy="true">
      <span className="sr-only">Cargando mentores…</span>
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded-full bg-superficie motion-reduce:animate-none" />
        {[0, 1].map((n) => (
          <div key={n} className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-superficie motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-superficie motion-reduce:animate-none" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-superficie motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-11 w-full animate-pulse rounded-xl bg-superficie motion-reduce:animate-none" />
    </div>
  );
}

function EstadoCompleto({ icono: Icono, titulo, children, accion }) {
  return (
    <div className="flex flex-col items-start gap-3 py-6 animate-aparecer motion-reduce:animate-desvanecer">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-superficie text-slate-600">
        <Icono className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-900">{titulo}</p>
        <div className="max-w-sm text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
      {accion}
    </div>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-600">{etiqueta}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{valor || "Sin dato"}</dd>
    </div>
  );
}

function VistaPreviaMentor({ mentor }) {
  const experiencia =
    mentor.anios_experiencia === null || mentor.anios_experiencia === undefined
      ? null
      : `${mentor.anios_experiencia} ${mentor.anios_experiencia === 1 ? "año" : "años"}`;

  return (
    <div className="space-y-3 rounded-2xl bg-superficie-alta p-4 ring-1 ring-slate-200/70 animate-aparecer motion-reduce:animate-desvanecer">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Dato etiqueta="Nivel académico" valor={NIVELES_ACADEMICOS[mentor.nivel_academico] || mentor.nivel_academico} />
        <Dato etiqueta="Experiencia" valor={experiencia} />
        <Dato etiqueta="Disponibilidad" valor={mentor.disponibilidad} />
      </dl>
      {mentor.biografia && <p className="text-sm leading-relaxed text-slate-700">{mentor.biografia}</p>}
      {mentor.enlace_perfil && (
        <a
          href={mentor.enlace_perfil}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:decoration-ufps focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
        >
          Ver perfil profesional
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
      )}
    </div>
  );
}

// Panel lateral para ver y gestionar los mentores del proyecto de una iniciativa aprobada.
// Solo el coordinador asigna y quita; admin y Dirección lo ven en modo lectura.
export default function MentoresPanel({ iniciativa, onClose, onAsignadosCambiados }) {
  const { rolActivo, logout } = useAuth();
  const puedeGestionar = (rolActivo || "").trim().toLowerCase() === "coordinador";
  const idTitulo = useId();
  const idSelector = useId();

  const panelRef = useRef(null);
  const botonCerrarRef = useRef(null);
  const tituloAsignadosRef = useRef(null);
  const selectorRef = useRef(null);
  // logout cambia en cada render del AuthProvider: se guarda en una ref para no recargar los datos
  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const nombreProyecto = iniciativa?.iniciativa?.titulo || iniciativa?.nombre || "este proyecto";
  const idIniciativa = iniciativa?.id_iniciativa;
  const idProyectoConocido = iniciativa?.proyecto?.id_proyecto ?? null;

  const [visible, setVisible] = useState(false);
  const [estado, setEstado] = useState({ fase: "cargando" }); // cargando | sinProyecto | sinPermiso | error | listo
  const [idProyecto, setIdProyecto] = useState(null);
  const [asignados, setAsignados] = useState([]);
  const [disponibles, setDisponibles] = useState([]);
  const [totalActivos, setTotalActivos] = useState(0);

  const [seleccion, setSeleccion] = useState("");
  const [ocupado, setOcupado] = useState(null); // "asignar" | id_mentor que se está quitando
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [saliendoId, setSaliendoId] = useState(null);
  const [aviso, setAviso] = useState(null); // { tipo: "exito" | "error", titulo, detalle }

  // ---------- apertura, cierre y foco ----------
  useEffect(() => {
    const anterior = document.activeElement;
    const frame = requestAnimationFrame(() => setVisible(true));
    botonCerrarRef.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(frame);
      if (anterior && typeof anterior.focus === "function") anterior.focus({ preventScroll: true });
    };
  }, []);

  const cerrar = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, prefiereMenosMovimiento() ? 0 : SALIDA_PANEL_MS);
  }, [onClose]);

  function manejarTeclado(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (confirmandoId !== null) setConfirmandoId(null);
      else cerrar();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    // Mantiene el foco dentro del panel mientras está abierto
    const enfocables = [...panelRef.current.querySelectorAll(SELECTOR_FOCO)];
    if (enfocables.length === 0) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  // ---------- datos ----------
  // 401, o el 403 que hoy devuelve el backend cuando el token venció: se cierra la sesión
  const manejarErrorSesion = useCallback((err) => {
    const tokenVencido = err?.status === 403 && /token inv[aá]lido o expirado/i.test(err.message || "");
    if (err?.status === 401 || tokenVencido) {
      logoutRef.current?.();
      return true;
    }
    return false;
  }, []);

  const aplicarDatos = useCallback((resultado) => {
    if (!resultado.idProyecto) {
      setEstado({ fase: "sinProyecto" });
      return;
    }
    setIdProyecto(resultado.idProyecto);
    setAsignados([...resultado.datos.asignados].sort(porNombre));
    setDisponibles([...resultado.datos.disponibles].sort(porNombre));
    setTotalActivos(resultado.datos.totalActivos);
    setEstado({ fase: "listo" });
  }, []);

  const aplicarFallo = useCallback(
    (err) => {
      if (manejarErrorSesion(err)) return;
      if (err.status === 403) setEstado({ fase: "sinPermiso", mensaje: err.message });
      else setEstado({ fase: "error", mensaje: err.message });
    },
    [manejarErrorSesion]
  );

  // El estado inicial ya es "cargando"; los setState ocurren al llegar la respuesta
  useEffect(() => {
    let activo = true;
    obtenerDatosPanel(idIniciativa, idProyectoConocido)
      .then((resultado) => activo && aplicarDatos(resultado))
      .catch((err) => activo && aplicarFallo(err));
    return () => {
      activo = false;
    };
  }, [idIniciativa, idProyectoConocido, aplicarDatos, aplicarFallo]);

  // Avisa al Banco cuántos mentores quedaron, para actualizar el aviso de "falta asignar"
  const onCambiosRef = useRef(onAsignadosCambiados);
  useEffect(() => {
    onCambiosRef.current = onAsignadosCambiados;
  }, [onAsignadosCambiados]);
  const cantidadAsignados = asignados.length;
  useEffect(() => {
    if (estado.fase === "listo") onCambiosRef.current?.(cantidadAsignados);
  }, [estado.fase, cantidadAsignados]);

  function reintentar() {
    setEstado({ fase: "cargando" });
    obtenerDatosPanel(idIniciativa, idProyectoConocido).then(aplicarDatos).catch(aplicarFallo);
  }

  // Tras un error de negocio se resincronizan las listas sin mostrar el esqueleto
  async function resincronizar() {
    if (!idProyecto) return;
    try {
      const datos = await getMentoresDelProyecto(idProyecto);
      setAsignados([...datos.asignados].sort(porNombre));
      setDisponibles([...datos.disponibles].sort(porNombre));
      setTotalActivos(datos.totalActivos);
    } catch {
      // Se conserva lo que ya se ve; el aviso de error ya explica qué pasó
    }
  }

  function avisarError(err, accion) {
    if (manejarErrorSesion(err)) return;
    setAviso({
      tipo: "error",
      titulo:
        err.status === 403
          ? `No puedes ${accion}: solo el coordinador gestiona los mentores.`
          : `No pudimos ${accion}.`,
      detalle: err.message,
    });
  }

  // ---------- acciones ----------
  const mentorSeleccionado = disponibles.find((m) => String(m.id_mentor) === seleccion) || null;

  async function asignar() {
    if (!mentorSeleccionado || ocupado) return;
    const mentor = mentorSeleccionado;
    setOcupado("asignar");
    setAviso(null);
    try {
      const res = await asignarMentor(idProyecto, mentor.id_mentor);
      const proyecto = res.asignacion?.nombre_proyecto || nombreProyecto;
      setDisponibles((prev) => prev.filter((m) => m.id_mentor !== mentor.id_mentor));
      setAsignados((prev) => [...prev.filter((m) => m.id_mentor !== mentor.id_mentor), mentor].sort(porNombre));
      setSeleccion("");
      // El selector sigue ahí si quedan mentores; si no, el foco va a la lista
      window.requestAnimationFrame(() => (selectorRef.current || tituloAsignadosRef.current)?.focus());
      setAviso({
        tipo: "exito",
        titulo: res.reactivada
          ? `${mentor.nombre} vuelve a ${proyecto}: reactivamos su asignación anterior.`
          : `Asignaste a ${mentor.nombre} a ${proyecto}.`,
        detalle: res.message,
      });
    } catch (err) {
      avisarError(err, "asignar el mentor");
      if (err.status === 400) resincronizar();
    } finally {
      setOcupado(null);
    }
  }

  async function quitar(mentor) {
    if (ocupado) return;
    setOcupado(mentor.id_mentor);
    setAviso(null);
    try {
      const res = await desasignarMentor(idProyecto, mentor.id_mentor);
      const proyecto = res.asignacion?.nombre_proyecto || nombreProyecto;
      setConfirmandoId(null);
      // La fila se desvanece y luego sale de la lista
      setSaliendoId(mentor.id_mentor);
      window.setTimeout(
        () => {
          setAsignados((prev) => prev.filter((m) => m.id_mentor !== mentor.id_mentor));
          setDisponibles((prev) => [...prev.filter((m) => m.id_mentor !== mentor.id_mentor), mentor].sort(porNombre));
          setSaliendoId(null);
          tituloAsignadosRef.current?.focus();
        },
        prefiereMenosMovimiento() ? 0 : SALIDA_FILA_MS
      );
      setAviso({ tipo: "exito", titulo: `Quitaste a ${mentor.nombre} de ${proyecto}.`, detalle: res.message });
    } catch (err) {
      avisarError(err, "quitar el mentor");
      if (err.status === 400) resincronizar();
    } finally {
      setOcupado(null);
    }
  }

  // ---------- render ----------
  function contenido() {
    if (estado.fase === "cargando") return <Esqueleto />;

    if (estado.fase === "sinProyecto") {
      return (
        <EstadoCompleto icono={FolderClosed} titulo="Esta iniciativa aún no tiene proyecto">
          Los mentores se asignan al proyecto, y el proyecto se crea al aprobar la iniciativa. Si ya la
          aprobaste y sigues viendo esto, pide que revisen su proyecto en el sistema.
        </EstadoCompleto>
      );
    }

    if (estado.fase === "sinPermiso") {
      return (
        <EstadoCompleto icono={ShieldOff} titulo="Tu rol no puede ver los mentores">
          {estado.mensaje || "No tienes permisos para consultar los mentores de este proyecto."}
        </EstadoCompleto>
      );
    }

    if (estado.fase === "error") {
      return (
        <EstadoCompleto
          icono={AlertCircle}
          titulo="No pudimos cargar los mentores"
          accion={
            <button type="button" onClick={reintentar} className={BOTON_SECUNDARIO}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </button>
          }
        >
          {estado.mensaje}
        </EstadoCompleto>
      );
    }

    return (
      <div className="space-y-8">
        {aviso && (
          <div
            role={aviso.tipo === "error" ? "alert" : undefined}
            className={`flex items-start gap-3 rounded-2xl p-3.5 text-sm animate-aparecer motion-reduce:animate-desvanecer ${
              aviso.tipo === "error" ? "bg-ufps-suave text-ufps" : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {aviso.tipo === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white animate-confirmar motion-reduce:animate-desvanecer">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-semibold">{aviso.titulo}</p>
              {aviso.detalle && (
                <p className={aviso.tipo === "error" ? "text-ufps" : "text-emerald-800"}>{aviso.detalle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAviso(null)}
              className="-my-3 -mr-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
              aria-label="Cerrar aviso"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Mentores asignados */}
        <section aria-labelledby={`${idTitulo}-asignados`} className="space-y-3">
          <h3
            id={`${idTitulo}-asignados`}
            ref={tituloAsignadosRef}
            tabIndex={-1}
            className="flex items-baseline gap-2 rounded-md text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
          >
            Acompañando el proyecto
            <span className="text-sm font-medium tabular-nums text-slate-500">{asignados.length}</span>
          </h3>

          {asignados.length === 0 ? (
            <p className="text-sm leading-relaxed text-slate-600">
              Este proyecto todavía no tiene mentores.
              {puedeGestionar && disponibles.length > 0 && " Elige uno abajo para empezar."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {asignados.map((m) => {
                const confirmando = confirmandoId === m.id_mentor;
                const quitando = ocupado === m.id_mentor;
                return (
                  <li
                    key={m.id_mentor}
                    className={`py-3 transition-[opacity,transform] duration-150 ease-out-suave first:pt-0 motion-reduce:transform-none motion-reduce:transition-opacity ${
                      saliendoId === m.id_mentor ? "translate-x-3 opacity-0" : "animate-aparecer motion-reduce:animate-desvanecer"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-superficie text-xs font-semibold text-slate-700"
                        aria-hidden="true"
                      >
                        {iniciales(m.nombre)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{m.nombre}</p>
                        <p className="truncate text-xs text-slate-600">
                          {m.area_especializacion || "Sin área registrada"}
                          {m.correo && (
                            <>
                              {" · "}
                              <a
                                href={`mailto:${m.correo}`}
                                className="rounded-sm underline decoration-slate-300 underline-offset-2 hover:text-slate-900 hover:decoration-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
                              >
                                {m.correo}
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                      {puedeGestionar && !confirmando && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmandoId(m.id_mentor);
                            setAviso(null);
                          }}
                          disabled={Boolean(ocupado) || saliendoId !== null}
                          className={`${BOTON_PELIGRO} disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent disabled:active:scale-100`}
                          aria-label={`Quitar a ${m.nombre} del proyecto`}
                        >
                          Quitar
                        </button>
                      )}
                    </div>

                    {confirmando && (
                      <div className="mt-3 space-y-3 rounded-2xl bg-ufps-suave p-3.5 animate-aparecer motion-reduce:animate-desvanecer">
                        <p className="text-sm text-slate-800">
                          ¿Quitar a <strong className="font-semibold">{m.nombre}</strong> de {nombreProyecto}? Si cambias de
                          opinión, puedes volver a asignarle el proyecto.
                        </p>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmandoId(null)}
                            disabled={quitando}
                            className={BOTON_FANTASMA}
                            // El foco va a "Cancelar": es la opción segura
                            autoFocus
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => quitar(m)}
                            disabled={quitando}
                            className={BOTON_PRIMARIO}
                          >
                            {quitando && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                            {quitando ? "Quitando…" : "Sí, quitar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Asignar un mentor nuevo */}
        {puedeGestionar ? (
          <section aria-labelledby={`${idTitulo}-asignar`} className="space-y-3 border-t border-slate-100 pt-6">
            <h3 id={`${idTitulo}-asignar`} className="text-sm font-semibold text-slate-900">
              Sumar un mentor
            </h3>

            {disponibles.length === 0 ? (
              <p className="text-sm leading-relaxed text-slate-600">
                {totalActivos === 0
                  ? "No hay mentores activos; un mentor aparece aquí cuando completa su perfil académico."
                  : "Todos los mentores activos ya acompañan este proyecto."}
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label htmlFor={idSelector} className={ETIQUETA}>
                    Mentor
                  </label>
                  <div className="relative">
                    <select
                      ref={selectorRef}
                      id={idSelector}
                      value={seleccion}
                      onChange={(e) => {
                        setSeleccion(e.target.value);
                        setAviso(null);
                      }}
                      disabled={ocupado === "asignar"}
                      className={`${CAMPO} appearance-none pr-10 disabled:cursor-not-allowed disabled:bg-superficie disabled:text-slate-500`}
                    >
                      <option value="">Elige un mentor…</option>
                      {disponibles.map((m) => (
                        <option key={m.id_mentor} value={m.id_mentor}>
                          {m.area_especializacion ? `${m.nombre} — ${m.area_especializacion}` : m.nombre}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {mentorSeleccionado && <VistaPreviaMentor key={mentorSeleccionado.id_mentor} mentor={mentorSeleccionado} />}

                <button
                  type="button"
                  onClick={asignar}
                  disabled={!mentorSeleccionado || Boolean(ocupado)}
                  className={`${BOTON_PRIMARIO} w-full`}
                >
                  {ocupado === "asignar" && (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  )}
                  {ocupado === "asignar"
                    ? "Asignando…"
                    : mentorSeleccionado
                      ? `Asignar a ${mentorSeleccionado.nombre}`
                      : "Asignar mentor"}
                </button>
              </>
            )}
          </section>
        ) : (
          <p className="flex items-start gap-2 border-t border-slate-100 pt-6 text-sm text-slate-600">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            Solo el coordinador puede asignar o quitar mentores. Aquí ves quiénes acompañan el proyecto.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onKeyDown={manejarTeclado}>
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ease-out-suave motion-reduce:duration-150 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={cerrar}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`relative flex h-full w-full max-w-md flex-col bg-white shadow-[-12px_0_32px_-12px_rgba(15,23,42,0.25)] transition-[transform,opacity] ease-panel motion-reduce:translate-x-0 motion-reduce:transition-opacity ${
          visible ? "translate-x-0 opacity-100 duration-[260ms]" : "translate-x-full opacity-100 duration-200 motion-reduce:opacity-0"
        }`}
      >
        <header className="flex items-start gap-3 px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={idTitulo} className="text-lg font-semibold tracking-tight text-slate-900">
              Mentores
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-600" title={nombreProyecto}>
              {nombreProyecto}
            </p>
          </div>
          <button
            ref={botonCerrarRef}
            type="button"
            onClick={cerrar}
            className={`${BOTON_ICONO} -mr-2 -mt-1`}
            aria-label="Cerrar mentores"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <p className="sr-only" aria-live="polite">
          {aviso?.tipo === "exito" ? aviso.titulo : ""}
        </p>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 sm:px-6">{contenido()}</div>
      </aside>
    </div>
  );
}
