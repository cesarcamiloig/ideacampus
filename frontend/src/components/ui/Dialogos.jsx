import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { BOTON_ICONO, BOTON_OSCURO, BOTON_PRIMARIO, BOTON_SECUNDARIO } from "./estilos";
import { SALIDA_PANEL_MS, prefiereMenosMovimiento, useAtraparFoco } from "./utilidades";

// ---------------------------------------------------------------------------
// Panel lateral: formularios y detalles que se abren desde la derecha
// ---------------------------------------------------------------------------

// onEscape: si devuelve true, Escape ya se manejó (p. ej. cancelar una confirmación) y no cierra.
export function PanelLateral({ titulo, subtitulo, etiquetaCerrar = "Cerrar", onClose, onEscape, anuncio, ancho = "max-w-md", pie, children }) {
  const idTitulo = useId();
  const panelRef = useRef(null);
  const botonCerrarRef = useRef(null);
  const [visible, setVisible] = useState(false);

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

  const manejarTeclado = useAtraparFoco(panelRef, () => {
    if (!onEscape?.()) cerrar();
  });

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
        className={`relative flex h-full w-full ${ancho} flex-col bg-white shadow-[-12px_0_32px_-12px_rgba(15,23,42,0.25)] transition-[transform,opacity] ease-panel motion-reduce:translate-x-0 motion-reduce:transition-opacity ${
          visible ? "translate-x-0 opacity-100 duration-[260ms]" : "translate-x-full opacity-100 duration-200 motion-reduce:opacity-0"
        }`}
      >
        <header className="flex items-start gap-3 px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={idTitulo} className="text-lg font-semibold tracking-tight text-slate-900">
              {titulo}
            </h2>
            {subtitulo && (
              <p className="mt-0.5 truncate text-sm text-slate-600" title={typeof subtitulo === "string" ? subtitulo : undefined}>
                {subtitulo}
              </p>
            )}
          </div>
          <button
            ref={botonCerrarRef}
            type="button"
            onClick={cerrar}
            className={`${BOTON_ICONO} -mr-2 -mt-1`}
            aria-label={etiquetaCerrar}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Región viva siempre montada: anuncia los avisos de éxito */}
        <p className="sr-only" aria-live="polite">
          {anuncio || ""}
        </p>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 sm:px-6">{children}</div>
        {pie && <footer className="border-t border-slate-200 bg-superficie-alta px-5 py-4 sm:px-6">{pie}</footer>}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal centrado
// ---------------------------------------------------------------------------

const ANCHOS_MODAL = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
};

// Diálogo centrado con cabecera (rótulo, título, subtítulo), cuerpo con scroll y pie opcional.
// Se monta solo cuando open es true; Escape y el fondo lo cierran.
export function Modal({
  open,
  onClose,
  titulo,
  subtitulo,
  seccion,
  icono: Icono,
  ancho = "lg",
  pie,
  etiquetaCerrar = "Cerrar",
  cerrarConFondo = true,
  children,
}) {
  if (!open) return null;
  return (
    <ModalAbierto
      onClose={onClose}
      titulo={titulo}
      subtitulo={subtitulo}
      seccion={seccion}
      Icono={Icono}
      ancho={ancho}
      pie={pie}
      etiquetaCerrar={etiquetaCerrar}
      cerrarConFondo={cerrarConFondo}
    >
      {children}
    </ModalAbierto>
  );
}

function ModalAbierto({ onClose, titulo, subtitulo, seccion, Icono, ancho, pie, etiquetaCerrar, cerrarConFondo, children }) {
  const idTitulo = useId();
  const dialogoRef = useRef(null);
  const botonCerrarRef = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    botonCerrarRef.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (anterior && typeof anterior.focus === "function") anterior.focus({ preventScroll: true });
    };
  }, []);

  const manejarTeclado = useAtraparFoco(dialogoRef, () => onClose?.());

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" onKeyDown={manejarTeclado}>
      <div
        className="absolute inset-0 bg-slate-900/40 animate-desvanecer"
        onClick={cerrarConFondo ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`relative flex max-h-[92vh] w-full ${ANCHOS_MODAL[ancho] || ancho} flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-aparecer motion-reduce:animate-desvanecer sm:rounded-2xl`}
      >
        <header className="flex items-start gap-3 border-b border-slate-200 bg-superficie-alta px-5 py-4 sm:px-6">
          {Icono && (
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ufps text-white">
              <Icono className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {seccion && <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">{seccion}</p>}
            <h2 id={idTitulo} className="text-lg font-semibold tracking-tight text-slate-900">
              {titulo}
            </h2>
            {subtitulo && <div className="mt-0.5 text-sm text-slate-600">{subtitulo}</div>}
          </div>
          <button
            ref={botonCerrarRef}
            type="button"
            onClick={onClose}
            className={`${BOTON_ICONO} -mr-2 -mt-1`}
            aria-label={etiquetaCerrar}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        {pie && (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-superficie-alta px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {pie}
          </footer>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmación
// ---------------------------------------------------------------------------

// peligro: la acción destructiva usa el rojo UFPS; si no, el botón oscuro
export function DialogoConfirmacion({
  open,
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  peligro = false,
  procesando = false,
  deshabilitado = false,
  onConfirmar,
  onCancelar,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={procesando ? undefined : onCancelar}
      titulo={titulo}
      icono={AlertCircle}
      ancho="md"
      etiquetaCerrar="Cancelar"
      pie={
        <>
          <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO} disabled={procesando}>
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={peligro ? BOTON_PRIMARIO : BOTON_OSCURO}
            disabled={procesando || deshabilitado}
          >
            {procesando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {textoConfirmar}
          </button>
        </>
      }
    >
      {mensaje && <p className="text-sm leading-relaxed text-slate-700">{mensaje}</p>}
      {children}
    </Modal>
  );
}
