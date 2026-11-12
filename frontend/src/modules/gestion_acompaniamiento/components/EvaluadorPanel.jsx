import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, FolderClosed, Loader2, Lock, RefreshCw, ShieldOff } from "lucide-react";
import {
  BOTON_FANTASMA,
  BOTON_PELIGRO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
} from "../../../components/ui/estilos";
import {
  asignarEvaluador,
  getEvaluadorDeProyecto,
  getEvaluadoresDisponibles,
} from "../services/evaluadorAsignacionService";
import { AvisoPanel, Esqueleto, EstadoCompleto, FilaPersona, PanelLateral, SelectorPersona } from "./panelComun";
import { SALIDA_FILA_MS, porNombre, prefiereMenosMovimiento, useManejarErrorSesion, usePuedeGestionar } from "./panelUtilidades";

const ROL_EVALUADOR = "Evaluador de iniciativas";

// Evaluador actual del proyecto y evaluadores activos, en paralelo
async function obtenerDatosEvaluador(idProyecto) {
  const [evaluador, evaluadores] = await Promise.all([
    getEvaluadorDeProyecto(idProyecto),
    getEvaluadoresDisponibles(),
  ]);
  return { evaluador, evaluadores };
}

// Panel lateral para asignar, cambiar o quitar el evaluador del proyecto de una iniciativa
// aprobada. Muestra todos los evaluadores activos, aunque ya evalúen otros proyectos.
// Solo el coordinador gestiona; admin y Dirección lo ven en modo lectura.
export default function EvaluadorPanel({ iniciativa, onClose, onEvaluadorCambiado }) {
  const puedeGestionar = usePuedeGestionar();
  const manejarErrorSesion = useManejarErrorSesion();
  const idTitulo = useId();

  const tituloEvaluadorRef = useRef(null);
  const selectorRef = useRef(null);

  const nombreProyecto = iniciativa?.iniciativa?.titulo || iniciativa?.nombre || "este proyecto";
  const idProyecto = iniciativa?.proyecto?.id_proyecto ?? null;

  // cargando | sinProyecto | sinPermiso | error | listo
  const [estado, setEstado] = useState({ fase: idProyecto ? "cargando" : "sinProyecto" });
  const [evaluador, setEvaluador] = useState(null); // { id_usuario, nombre, correo }
  const [evaluadores, setEvaluadores] = useState([]);

  const [seleccion, setSeleccion] = useState("");
  const [ocupado, setOcupado] = useState(null); // "asignar" | "quitar"
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: "exito" | "error", titulo, detalle }

  // ---------- datos ----------
  const aplicarDatos = useCallback((resultado) => {
    setEvaluador(resultado.evaluador);
    setEvaluadores([...resultado.evaluadores].sort(porNombre));
    setEstado({ fase: "listo" });
  }, []);

  const aplicarFallo = useCallback(
    (err) => {
      if (manejarErrorSesion(err)) return;
      if (err.status === 403) setEstado({ fase: "sinPermiso", mensaje: err.message });
      else if (err.status === 404) setEstado({ fase: "sinProyecto" });
      else setEstado({ fase: "error", mensaje: err.message });
    },
    [manejarErrorSesion]
  );

  useEffect(() => {
    if (!idProyecto) return undefined;
    let activo = true;
    obtenerDatosEvaluador(idProyecto)
      .then((resultado) => activo && aplicarDatos(resultado))
      .catch((err) => activo && aplicarFallo(err));
    return () => {
      activo = false;
    };
  }, [idProyecto, aplicarDatos, aplicarFallo]);

  // Avisa a la lista de proyectos si quedó con evaluador, para actualizar el aviso de "falta asignar"
  const onCambioRef = useRef(onEvaluadorCambiado);
  useEffect(() => {
    onCambioRef.current = onEvaluadorCambiado;
  }, [onEvaluadorCambiado]);
  const tieneEvaluador = Boolean(evaluador);
  useEffect(() => {
    if (estado.fase === "listo") onCambioRef.current?.(tieneEvaluador);
  }, [estado.fase, tieneEvaluador]);

  function reintentar() {
    setEstado({ fase: "cargando" });
    obtenerDatosEvaluador(idProyecto).then(aplicarDatos).catch(aplicarFallo);
  }

  function avisarError(err, accion) {
    if (manejarErrorSesion(err)) return;
    setAviso({
      tipo: "error",
      titulo:
        err.status === 403
          ? `No puedes ${accion}: no tienes permiso para gestionar evaluadores.`
          : `No pudimos ${accion}.`,
      detalle: err.message,
    });
  }

  // ---------- acciones ----------
  const opciones = evaluadores.filter((e) => e.id_usuario !== evaluador?.id_usuario);
  const evaluadorSeleccionado = opciones.find((e) => String(e.id_usuario) === seleccion) || null;

  async function asignar() {
    if (!evaluadorSeleccionado || ocupado) return;
    const nuevo = evaluadorSeleccionado;
    const anterior = evaluador;
    setOcupado("asignar");
    setAviso(null);
    try {
      const res = await asignarEvaluador(idProyecto, nuevo.id_usuario);
      const proyecto = res.nombreProyecto || nombreProyecto;
      setEvaluador({ id_usuario: nuevo.id_usuario, nombre: nuevo.nombre, correo: nuevo.correo });
      setSeleccion("");
      window.requestAnimationFrame(() => (selectorRef.current || tituloEvaluadorRef.current)?.focus());
      setAviso({
        tipo: "exito",
        titulo: anterior
          ? `Cambiaste el evaluador de ${proyecto}: ahora lo evalúa ${nuevo.nombre}.`
          : `${nuevo.nombre} quedó como evaluador de ${proyecto}.`,
      });
    } catch (err) {
      avisarError(err, "asignar el evaluador");
    } finally {
      setOcupado(null);
    }
  }

  async function quitar() {
    if (!evaluador || ocupado) return;
    const quitado = evaluador;
    setOcupado("quitar");
    setAviso(null);
    try {
      const res = await asignarEvaluador(idProyecto, null);
      const proyecto = res.nombreProyecto || nombreProyecto;
      setConfirmandoQuitar(false);
      // La fila se desvanece y luego desaparece
      setSaliendo(true);
      window.setTimeout(
        () => {
          setEvaluador(null);
          setSaliendo(false);
          tituloEvaluadorRef.current?.focus();
        },
        prefiereMenosMovimiento() ? 0 : SALIDA_FILA_MS
      );
      setAviso({ tipo: "exito", titulo: `Quitaste a ${quitado.nombre} como evaluador de ${proyecto}.` });
    } catch (err) {
      avisarError(err, "quitar el evaluador");
    } finally {
      setOcupado(null);
    }
  }

  // ---------- render ----------
  function contenido() {
    if (estado.fase === "cargando") return <Esqueleto texto="Cargando evaluador…" />;

    if (estado.fase === "sinProyecto") {
      return (
        <EstadoCompleto icono={FolderClosed} titulo="Esta iniciativa aún no tiene proyecto">
          El evaluador se asigna al proyecto, y el proyecto se crea al aprobar la iniciativa. Si ya la
          aprobaste y sigues viendo esto, pide que revisen su proyecto en el sistema.
        </EstadoCompleto>
      );
    }

    if (estado.fase === "sinPermiso") {
      return (
        <EstadoCompleto icono={ShieldOff} titulo="Tu rol no puede ver el evaluador">
          {estado.mensaje || "No tienes permisos para consultar el evaluador de este proyecto."}
        </EstadoCompleto>
      );
    }

    if (estado.fase === "error") {
      return (
        <EstadoCompleto
          icono={AlertCircle}
          titulo="No pudimos cargar el evaluador"
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

        {/* Evaluador actual */}
        <section aria-labelledby={`${idTitulo}-actual`} className="space-y-3">
          <h3
            id={`${idTitulo}-actual`}
            ref={tituloEvaluadorRef}
            tabIndex={-1}
            className="rounded-md text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
          >
            Evaluador del proyecto
          </h3>

          {!evaluador ? (
            <p className="text-sm leading-relaxed text-slate-600">
              Este proyecto todavía no tiene evaluador.
              {puedeGestionar && opciones.length > 0 && " Elige uno abajo para que califique sus hitos."}
            </p>
          ) : (
            <div
              key={evaluador.id_usuario}
              className={`transition-[opacity,transform] duration-150 ease-out-suave motion-reduce:transform-none motion-reduce:transition-opacity ${
                saliendo ? "translate-x-3 opacity-0" : "animate-aparecer motion-reduce:animate-desvanecer"
              }`}
            >
              <FilaPersona
                nombre={evaluador.nombre}
                area={ROL_EVALUADOR}
                correo={evaluador.correo}
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
                      aria-label={`Quitar a ${evaluador.nombre} como evaluador del proyecto`}
                    >
                      Quitar
                    </button>
                  )
                }
              />

              {confirmandoQuitar && (
                <div className="mt-3 space-y-3 rounded-2xl border border-ufps bg-white p-3.5 animate-aparecer motion-reduce:animate-desvanecer">
                  <p className="text-sm text-slate-800">
                    ¿Quitar a <strong className="font-semibold">{evaluador.nombre}</strong> como evaluador de{" "}
                    {nombreProyecto}? El proyecto quedará sin evaluador hasta que asignes otro.
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

        {/* Asignar o cambiar el evaluador */}
        {puedeGestionar ? (
          <section aria-labelledby={`${idTitulo}-asignar`} className="space-y-3 border-t border-slate-100 pt-6">
            <h3 id={`${idTitulo}-asignar`} className="text-sm font-semibold text-slate-900">
              {evaluador ? "Cambiar de evaluador" : "Asignar un evaluador"}
            </h3>

            {opciones.length === 0 ? (
              <p className="text-sm leading-relaxed text-slate-600">
                {evaluadores.length === 0
                  ? "No hay evaluadores activos; un usuario aparece aquí cuando tiene el rol de evaluador."
                  : "No hay otros evaluadores activos para reemplazarlo."}
              </p>
            ) : (
              <>
                <SelectorPersona
                  etiqueta="Evaluador"
                  valor={seleccion}
                  onChange={(valor) => {
                    setSeleccion(valor);
                    setAviso(null);
                  }}
                  opciones={opciones.map((e) => ({
                    valor: e.id_usuario,
                    texto: e.correo ? `${e.nombre} — ${e.correo}` : e.nombre,
                  }))}
                  placeholder="Elige un evaluador…"
                  disabled={ocupado === "asignar"}
                  selectRef={selectorRef}
                />

                {evaluador && evaluadorSeleccionado && (
                  <p className="text-sm text-slate-600">
                    {evaluadorSeleccionado.nombre} reemplazará a {evaluador.nombre} como evaluador del proyecto.
                  </p>
                )}

                <button
                  type="button"
                  onClick={asignar}
                  disabled={!evaluadorSeleccionado || Boolean(ocupado) || saliendo}
                  className={`${BOTON_PRIMARIO} w-full`}
                >
                  {ocupado === "asignar" && (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  )}
                  {ocupado === "asignar"
                    ? "Guardando…"
                    : evaluadorSeleccionado
                      ? `${evaluador ? "Cambiar a" : "Asignar a"} ${evaluadorSeleccionado.nombre}`
                      : evaluador
                        ? "Cambiar evaluador"
                        : "Asignar evaluador"}
                </button>
              </>
            )}
          </section>
        ) : (
          <p className="flex items-start gap-2 border-t border-slate-100 pt-6 text-sm text-slate-600">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            Solo el coordinador puede asignar o cambiar el evaluador. Aquí ves quién evalúa el proyecto.
          </p>
        )}
      </div>
    );
  }

  return (
    <PanelLateral
      titulo="Evaluador"
      subtitulo={nombreProyecto}
      etiquetaCerrar="Cerrar evaluador"
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
