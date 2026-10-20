import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, FolderClosed, Loader2, Lock, RefreshCw, ShieldOff } from "lucide-react";
import {
  BOTON_FANTASMA,
  BOTON_PELIGRO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
} from "../../gestion_evaluacion/components/estilos";
import {
  asignarMentor,
  desasignarMentor,
  getMentoresDelProyecto,
  getProyectoDeIniciativa,
} from "../services/mentorService";
import {
  AvisoPanel,
  Esqueleto,
  EstadoCompleto,
  FilaPersona,
  PanelLateral,
  SelectorPersona,
  VistaPreviaPerfil,
} from "./panelComun";
import {
  NIVELES_ACADEMICOS,
  SALIDA_FILA_MS,
  porNombre,
  prefiereMenosMovimiento,
  textoExperiencia,
  useManejarErrorSesion,
  usePuedeGestionar,
} from "./panelUtilidades";

// Proyecto de la iniciativa y, si existe, sus mentores asignados y disponibles.
// El listado de iniciativas ya trae id_proyecto; si no viene, se consulta por la iniciativa.
async function obtenerDatosPanel(idIniciativa, idProyectoConocido) {
  const idProyecto = idProyectoConocido ?? (await getProyectoDeIniciativa(idIniciativa));
  if (!idProyecto) return { idProyecto: null, datos: null };
  return { idProyecto, datos: await getMentoresDelProyecto(idProyecto) };
}

// Panel lateral para ver y gestionar los mentores del proyecto de una iniciativa aprobada.
// Solo el coordinador asigna y quita; admin y Dirección lo ven en modo lectura.
export default function MentoresPanel({ iniciativa, onClose, onAsignadosCambiados }) {
  const puedeGestionar = usePuedeGestionar();
  const manejarErrorSesion = useManejarErrorSesion();
  const idTitulo = useId();

  const tituloAsignadosRef = useRef(null);
  const selectorRef = useRef(null);

  const nombreProyecto = iniciativa?.iniciativa?.titulo || iniciativa?.nombre || "este proyecto";
  const idIniciativa = iniciativa?.id_iniciativa;
  const idProyectoConocido = iniciativa?.proyecto?.id_proyecto ?? null;

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

  // ---------- datos ----------
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
    if (estado.fase === "cargando") return <Esqueleto texto="Cargando mentores…" />;

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
        <AvisoPanel aviso={aviso} onCerrar={() => setAviso(null)} />

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
                    <FilaPersona
                      nombre={m.nombre}
                      area={m.area_especializacion}
                      correo={m.correo}
                      accion={
                        puedeGestionar &&
                        !confirmando && (
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
                        )
                      }
                    />

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
                <SelectorPersona
                  etiqueta="Mentor"
                  valor={seleccion}
                  onChange={(valor) => {
                    setSeleccion(valor);
                    setAviso(null);
                  }}
                  opciones={disponibles.map((m) => ({
                    valor: m.id_mentor,
                    texto: m.area_especializacion ? `${m.nombre} — ${m.area_especializacion}` : m.nombre,
                  }))}
                  placeholder="Elige un mentor…"
                  disabled={ocupado === "asignar"}
                  selectRef={selectorRef}
                />

                {mentorSeleccionado && (
                  <VistaPreviaPerfil
                    key={mentorSeleccionado.id_mentor}
                    datos={[
                      {
                        etiqueta: "Nivel académico",
                        valor: NIVELES_ACADEMICOS[mentorSeleccionado.nivel_academico] || mentorSeleccionado.nivel_academico,
                      },
                      { etiqueta: "Experiencia", valor: textoExperiencia(mentorSeleccionado.anios_experiencia) },
                      { etiqueta: "Disponibilidad", valor: mentorSeleccionado.disponibilidad },
                    ]}
                    biografia={mentorSeleccionado.biografia}
                    enlacePerfil={mentorSeleccionado.enlace_perfil}
                  />
                )}

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
    <PanelLateral
      titulo="Mentores"
      subtitulo={nombreProyecto}
      etiquetaCerrar="Cerrar mentores"
      onClose={onClose}
      onEscape={() => {
        if (confirmandoId === null) return false;
        setConfirmandoId(null);
        return true;
      }}
      anuncio={aviso?.tipo === "exito" ? aviso.titulo : ""}
    >
      {contenido()}
    </PanelLateral>
  );
}
