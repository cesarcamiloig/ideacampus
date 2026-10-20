import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, ExternalLink, X } from "lucide-react";
import { BOTON_ICONO, CAMPO, ETIQUETA } from "../../gestion_evaluacion/components/estilos";
import { SALIDA_PANEL_MS, iniciales, prefiereMenosMovimiento } from "./panelUtilidades";

// Piezas compartidas por los paneles de asignación de roles del proyecto (mentores, tutor).

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Panel lateral con animación de entrada/salida, foco atrapado y retorno del foco al cerrar.
// onEscape: si devuelve true, Escape ya se manejó (p. ej. cancelar una confirmación) y no cierra.
export function PanelLateral({ titulo, subtitulo, etiquetaCerrar, onClose, onEscape, anuncio, children }) {
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

  function manejarTeclado(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!onEscape?.()) cerrar();
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
              {titulo}
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-600" title={subtitulo}>
              {subtitulo}
            </p>
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
      </aside>
    </div>
  );
}

export function Esqueleto({ texto }) {
  return (
    <div className="space-y-8" aria-busy="true">
      <span className="sr-only">{texto}</span>
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

export function EstadoCompleto({ icono: Icono, titulo, children, accion }) {
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

export function AvisoPanel({ aviso, onCerrar }) {
  if (!aviso) return null;
  const esError = aviso.tipo === "error";
  return (
    <div
      role={esError ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-2xl p-3.5 text-sm animate-aparecer motion-reduce:animate-desvanecer ${
        esError ? "bg-ufps-suave text-ufps" : "bg-emerald-50 text-emerald-900"
      }`}
    >
      {esError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white animate-confirmar motion-reduce:animate-desvanecer">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-semibold">{aviso.titulo}</p>
        {aviso.detalle && <p className={esError ? "text-ufps" : "text-emerald-800"}>{aviso.detalle}</p>}
      </div>
      <button
        type="button"
        onClick={onCerrar}
        className="-my-3 -mr-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
        aria-label="Cerrar aviso"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// Fila de una persona asignada: iniciales, nombre, área y correo, con una acción a la derecha
export function FilaPersona({ nombre, area, correo, accion }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-superficie text-xs font-semibold text-slate-700"
        aria-hidden="true"
      >
        {iniciales(nombre)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{nombre}</p>
        <p className="truncate text-xs text-slate-600">
          {area || "Sin área registrada"}
          {correo && (
            <>
              {" · "}
              <a
                href={`mailto:${correo}`}
                className="rounded-sm underline decoration-slate-300 underline-offset-2 hover:text-slate-900 hover:decoration-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
              >
                {correo}
              </a>
            </>
          )}
        </p>
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

// Vista previa del perfil académico: datos en rejilla, biografía y enlace al perfil profesional
export function VistaPreviaPerfil({ datos, biografia, enlacePerfil }) {
  return (
    <div className="space-y-3 rounded-2xl bg-superficie-alta p-4 ring-1 ring-slate-200/70 animate-aparecer motion-reduce:animate-desvanecer">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {datos.map((d) => (
          <Dato key={d.etiqueta} etiqueta={d.etiqueta} valor={d.valor} />
        ))}
      </dl>
      {biografia && <p className="text-sm leading-relaxed text-slate-700">{biografia}</p>}
      {enlacePerfil && (
        <a
          href={enlacePerfil}
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

// Selector nativo con la etiqueta y el chevron del sistema visual
export function SelectorPersona({ etiqueta, valor, onChange, opciones, placeholder, disabled, selectRef }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta}
      </label>
      <div className="relative">
        <select
          ref={selectRef}
          id={id}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`${CAMPO} appearance-none pr-10 disabled:cursor-not-allowed disabled:bg-superficie disabled:text-slate-500`}
        >
          <option value="">{placeholder}</option>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
