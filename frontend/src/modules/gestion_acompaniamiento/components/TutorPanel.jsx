import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, FolderClosed, Loader2, Lock, RefreshCw, ShieldOff } from "lucide-react";
import {
  BOTON_FANTASMA,
  BOTON_PELIGRO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
} from "../../gestion_evaluacion/components/estilos";
import { asignarTutor, getTutorDeIniciativa, getTutoresDisponibles } from "../services/tutorAsignacionService";
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

// Tutor actual del proyecto y tutores activos, en paralelo
async function obtenerDatosTutor(idIniciativa) {
  const [actual, tutores] = await Promise.all([getTutorDeIniciativa(idIniciativa), getTutoresDisponibles()]);
  if (!actual?.idProyecto) return { idProyecto: null, tutor: null, tutores: [] };
  return { idProyecto: actual.idProyecto, tutor: actual.tutor, tutores };
}

// Panel lateral para asignar, cambiar o quitar el tutor académico del proyecto de una
// iniciativa aprobada. Solo el coordinador gestiona; admin y Dirección lo ven en modo lectura.
export default function TutorPanel({ iniciativa, onClose, onTutorCambiado }) {
  const puedeGestionar = usePuedeGestionar();
  const manejarErrorSesion = useManejarErrorSesion();
  const idTitulo = useId();

  const tituloTutorRef = useRef(null);
  const selectorRef = useRef(null);

  const nombreProyecto = iniciativa?.iniciativa?.titulo || iniciativa?.nombre || "este proyecto";
  const idIniciativa = iniciativa?.id_iniciativa;

  const [estado, setEstado] = useState({ fase: "cargando" }); // cargando | sinProyecto | sinPermiso | error | listo
  const [idProyecto, setIdProyecto] = useState(null);
  const [tutor, setTutor] = useState(null); // { id_tutor, nombre, correo, area_conocimiento }
  const [tutores, setTutores] = useState([]);

  const [seleccion, setSeleccion] = useState("");
  const [ocupado, setOcupado] = useState(null); // "asignar" | "quitar"
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: "exito" | "error", titulo, detalle }

  // ---------- datos ----------
  const aplicarDatos = useCallback((resultado) => {
    if (!resultado.idProyecto) {
      setEstado({ fase: "sinProyecto" });
      return;
    }
    setIdProyecto(resultado.idProyecto);
    setTutor(resultado.tutor);
    setTutores([...resultado.tutores].sort(porNombre));
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
    obtenerDatosTutor(idIniciativa)
      .then((resultado) => activo && aplicarDatos(resultado))
      .catch((err) => activo && aplicarFallo(err));
    return () => {
      activo = false;
    };
  }, [idIniciativa, aplicarDatos, aplicarFallo]);

  // Avisa al Banco si el proyecto quedó con tutor, para actualizar el aviso de "falta asignar"
  const onCambioRef = useRef(onTutorCambiado);
  useEffect(() => {
    onCambioRef.current = onTutorCambiado;
  }, [onTutorCambiado]);
  const tieneTutor = Boolean(tutor);
  useEffect(() => {
    if (estado.fase === "listo") onCambioRef.current?.(tieneTutor);
  }, [estado.fase, tieneTutor]);

  function reintentar() {
    setEstado({ fase: "cargando" });
    obtenerDatosTutor(idIniciativa).then(aplicarDatos).catch(aplicarFallo);
  }

  function avisarError(err, accion) {
    if (manejarErrorSesion(err)) return;
    setAviso({
      tipo: "error",
      titulo:
        err.status === 403
          ? `No puedes ${accion}: no tienes permiso para gestionar tutores.`
          : `No pudimos ${accion}.`,
      detalle: err.message,
    });
  }

  // ---------- acciones ----------
  const opciones = tutores.filter((t) => t.id_tutor !== tutor?.id_tutor);
  const tutorSeleccionado = opciones.find((t) => String(t.id_tutor) === seleccion) || null;

  async function asignar() {
    if (!tutorSeleccionado || ocupado) return;
    const nuevo = tutorSeleccionado;
    const anterior = tutor;
    setOcupado("asignar");
    setAviso(null);
    try {
      const res = await asignarTutor(idProyecto, nuevo.id_tutor);
      const proyecto = res.nombreProyecto || nombreProyecto;
      setTutor({
        id_tutor: nuevo.id_tutor,
        nombre: nuevo.nombre,
        correo: nuevo.correo,
        area_conocimiento: nuevo.area_conocimiento,
      });
      setSeleccion("");
      window.requestAnimationFrame(() => (selectorRef.current || tituloTutorRef.current)?.focus());
      setAviso({
        tipo: "exito",
        titulo: anterior
          ? `Cambiaste la tutoría de ${proyecto}: ahora está a cargo de ${nuevo.nombre}.`
          : `${nuevo.nombre} quedó a cargo de la tutoría de ${proyecto}.`,
        detalle: res.message,
      });
    } catch (err) {
      avisarError(err, "asignar el tutor");
    } finally {
      setOcupado(null);
    }
  }

  async function quitar() {
    if (!tutor || ocupado) return;
    const quitado = tutor;
    setOcupado("quitar");
    setAviso(null);
    try {
      const res = await asignarTutor(idProyecto, null);
      const proyecto = res.nombreProyecto || nombreProyecto;
      setConfirmandoQuitar(false);
      // La fila se desvanece y luego desaparece
      setSaliendo(true);
      window.setTimeout(
        () => {
          setTutor(null);
          setSaliendo(false);
          tituloTutorRef.current?.focus();
        },
        prefiereMenosMovimiento() ? 0 : SALIDA_FILA_MS
      );
      setAviso({ tipo: "exito", titulo: `Quitaste a ${quitado.nombre} de la tutoría de ${proyecto}.`, detalle: res.message });
    } catch (err) {
      avisarError(err, "quitar el tutor");
    } finally {
      setOcupado(null);
    }
  }

  // ---------- render ----------
  function contenido() {
    if (estado.fase === "cargando") return <Esqueleto texto="Cargando tutor…" />;

    if (estado.fase === "sinProyecto") {
      return (
        <EstadoCompleto icono={FolderClosed} titulo="Esta iniciativa aún no tiene proyecto">
          El tutor se asigna al proyecto, y el proyecto se crea al aprobar la iniciativa. Si ya la
          aprobaste y sigues viendo esto, pide que revisen su proyecto en el sistema.
        </EstadoCompleto>
      );
    }

    if (estado.fase === "sinPermiso") {
      return (
        <EstadoCompleto icono={ShieldOff} titulo="Tu rol no puede ver el tutor">
          {estado.mensaje || "No tienes permisos para consultar el tutor de este proyecto."}
        </EstadoCompleto>
      );
    }

    if (estado.fase === "error") {
      return (
        <EstadoCompleto
          icono={AlertCircle}
          titulo="No pudimos cargar el tutor"
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

    const quitando = ocupado === "quitar";

    return (
      <div className="space-y-8">
        <AvisoPanel aviso={aviso} onCerrar={() => setAviso(null)} />

        {/* Tutor actual */}
        <section aria-labelledby={`${idTitulo}-actual`} className="space-y-3">
          <h3
            id={`${idTitulo}-actual`}
            ref={tituloTutorRef}
            tabIndex={-1}
            className="rounded-md text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
          >
            Tutor del proyecto
          </h3>

          {!tutor ? (
            <p className="text-sm leading-relaxed text-slate-600">
              Este proyecto todavía no tiene tutor.
              {puedeGestionar && opciones.length > 0 && " Elige uno abajo para garantizar su seguimiento académico."}
            </p>
          ) : (
            <div
              key={tutor.id_tutor}
              className={`transition-[opacity,transform] duration-150 ease-out-suave motion-reduce:transform-none motion-reduce:transition-opacity ${
                saliendo ? "translate-x-3 opacity-0" : "animate-aparecer motion-reduce:animate-desvanecer"
              }`}
            >
              <FilaPersona
                nombre={tutor.nombre}
                area={tutor.area_conocimiento}
                correo={tutor.correo}
                accion={
                  puedeGestionar &&
                  !confirmandoQuitar && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmandoQuitar(true);
                        setAviso(null);
                      }}
                      disabled={Boolean(ocupado) || saliendo}
                      className={`${BOTON_PELIGRO} disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent disabled:active:scale-100`}
                      aria-label={`Quitar a ${tutor.nombre} de la tutoría del proyecto`}
                    >
                      Quitar
                    </button>
                  )
                }
              />

              {confirmandoQuitar && (
                <div className="mt-3 space-y-3 rounded-2xl bg-ufps-suave p-3.5 animate-aparecer motion-reduce:animate-desvanecer">
                  <p className="text-sm text-slate-800">
                    ¿Quitar a <strong className="font-semibold">{tutor.nombre}</strong> de la tutoría de {nombreProyecto}?
                    El proyecto quedará sin seguimiento académico hasta que asignes otro tutor.
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmandoQuitar(false)}
                      disabled={quitando}
                      className={BOTON_FANTASMA}
                      // El foco va a "Cancelar": es la opción segura
                      autoFocus
                    >
                      Cancelar
                    </button>
                    <button type="button" onClick={quitar} disabled={quitando} className={BOTON_PRIMARIO}>
                      {quitando && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                      {quitando ? "Quitando…" : "Sí, quitar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Asignar o cambiar el tutor */}
        {puedeGestionar ? (
          <section aria-labelledby={`${idTitulo}-asignar`} className="space-y-3 border-t border-slate-100 pt-6">
            <h3 id={`${idTitulo}-asignar`} className="text-sm font-semibold text-slate-900">
              {tutor ? "Cambiar de tutor" : "Asignar un tutor"}
            </h3>

            {opciones.length === 0 ? (
              <p className="text-sm leading-relaxed text-slate-600">
                {tutores.length === 0
                  ? "No hay tutores activos; un tutor aparece aquí cuando completa su perfil académico."
                  : "No hay otros tutores activos para reemplazarlo."}
              </p>
            ) : (
              <>
                <SelectorPersona
                  etiqueta="Tutor"
                  valor={seleccion}
                  onChange={(valor) => {
                    setSeleccion(valor);
                    setAviso(null);
                  }}
                  opciones={opciones.map((t) => ({
                    valor: t.id_tutor,
                    texto: t.area_conocimiento ? `${t.nombre} — ${t.area_conocimiento}` : t.nombre,
                  }))}
                  placeholder="Elige un tutor…"
                  disabled={ocupado === "asignar"}
                  selectRef={selectorRef}
                />

                {tutorSeleccionado && (
                  <VistaPreviaPerfil
                    key={tutorSeleccionado.id_tutor}
                    datos={[
                      {
                        etiqueta: "Nivel académico",
                        valor: NIVELES_ACADEMICOS[tutorSeleccionado.nivel_academico] || tutorSeleccionado.nivel_academico,
                      },
                      { etiqueta: "Experiencia", valor: textoExperiencia(tutorSeleccionado.anios_experiencia) },
                      { etiqueta: "Área de conocimiento", valor: tutorSeleccionado.area_conocimiento },
                    ]}
                    biografia={tutorSeleccionado.biografia}
                    enlacePerfil={tutorSeleccionado.enlace_perfil}
                  />
                )}

                {tutor && tutorSeleccionado && (
                  <p className="text-sm text-slate-600">
                    {tutorSeleccionado.nombre} reemplazará a {tutor.nombre} en la tutoría del proyecto.
                  </p>
                )}

                <button
                  type="button"
                  onClick={asignar}
                  disabled={!tutorSeleccionado || Boolean(ocupado) || saliendo}
                  className={`${BOTON_PRIMARIO} w-full`}
                >
                  {ocupado === "asignar" && (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  )}
                  {ocupado === "asignar"
                    ? "Guardando…"
                    : tutorSeleccionado
                      ? `${tutor ? "Cambiar a" : "Asignar a"} ${tutorSeleccionado.nombre}`
                      : tutor
                        ? "Cambiar tutor"
                        : "Asignar tutor"}
                </button>
              </>
            )}
          </section>
        ) : (
          <p className="flex items-start gap-2 border-t border-slate-100 pt-6 text-sm text-slate-600">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            Solo el coordinador puede asignar o cambiar el tutor. Aquí ves quién acompaña el proyecto.
          </p>
        )}
      </div>
    );
  }

  return (
    <PanelLateral
      titulo="Tutor"
      subtitulo={nombreProyecto}
      etiquetaCerrar="Cerrar tutor"
      onClose={onClose}
      onEscape={() => {
        if (!confirmandoQuitar) return false;
        setConfirmandoQuitar(false);
        return true;
      }}
      anuncio={aviso?.tipo === "exito" ? aviso.titulo : ""}
    >
      {contenido()}
    </PanelLateral>
  );
}
