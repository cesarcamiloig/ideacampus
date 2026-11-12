import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BOTON_SECUNDARIO_SM, FOCO } from "./estilos";

const MARGEN = 8;
const SEPARACION = 6;

// Menú desplegable de acciones agrupadas. Se dibuja en un portal con posición fija para que
// no lo recorten contenedores con scroll (p. ej. una tabla) y se voltea hacia arriba si no cabe.
//
// grupos: [{ titulo, items: [{ id, label, icono, onClick, detalle, alerta, peligro, haspopup }] }]
// alerta (en el botón): muestra un punto rojo para avisar que algo requiere atención.
export function MenuAcciones({ etiqueta = "Acciones", icono: Icono, grupos, alerta = false, textoAlerta, etiquetaAccesible }) {
  const idMenu = useId();
  const botonRef = useRef(null);
  const menuRef = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState(null);

  const grupoVisibles = grupos
    .map((g) => ({ ...g, items: g.items.filter(Boolean) }))
    .filter((g) => g.items.length > 0);

  const cerrar = useCallback((devolverFoco = true) => {
    setAbierto(false);
    setPosicion(null);
    if (devolverFoco) botonRef.current?.focus({ preventScroll: true });
  }, []);

  // Ubica el menú bajo el botón, alineado a su borde derecho; si no cabe abajo, va arriba.
  // Si tampoco cabe arriba, se pega al borde inferior y el propio menú hace scroll.
  const ubicar = useCallback(() => {
    if (!botonRef.current || !menuRef.current) return;
    const boton = botonRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const alto = window.innerHeight;
    let top = boton.bottom + SEPARACION;
    if (top + menu.height > alto - MARGEN) {
      const arriba = boton.top - menu.height - SEPARACION;
      top = arriba >= MARGEN ? arriba : Math.max(MARGEN, alto - MARGEN - menu.height);
    }
    const left = Math.min(Math.max(MARGEN, boton.right - menu.width), window.innerWidth - menu.width - MARGEN);
    setPosicion({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (abierto) ubicar();
  }, [abierto, ubicar]);

  // Enfoca la primera opción al abrir
  useEffect(() => {
    if (abierto && posicion) {
      menuRef.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    }
  }, [abierto, posicion]);

  // Clic fuera cierra el menú. Al hacer scroll (de la página, la tabla o el propio menú) o al
  // cambiar el tamaño de la ventana, el menú sigue al botón en lugar de cerrarse.
  useEffect(() => {
    if (!abierto) return undefined;
    let cuadro = 0;
    const alPresionar = (e) => {
      if (menuRef.current?.contains(e.target) || botonRef.current?.contains(e.target)) return;
      cerrar(false);
    };
    const reubicar = (e) => {
      if (e?.target && menuRef.current?.contains(e.target)) return;
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(ubicar);
    };
    document.addEventListener("mousedown", alPresionar);
    document.addEventListener("scroll", reubicar, true);
    window.addEventListener("resize", reubicar);
    return () => {
      cancelAnimationFrame(cuadro);
      document.removeEventListener("mousedown", alPresionar);
      document.removeEventListener("scroll", reubicar, true);
      window.removeEventListener("resize", reubicar);
    };
  }, [abierto, cerrar, ubicar]);

  function manejarTeclado(e) {
    const opciones = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])];
    const actual = opciones.indexOf(document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cerrar();
    } else if (e.key === "Tab") {
      cerrar(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      opciones[(actual + 1) % opciones.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      opciones[(actual - 1 + opciones.length) % opciones.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      opciones[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      opciones[opciones.length - 1]?.focus();
    }
  }

  function elegir(item) {
    cerrar(false);
    item.onClick?.();
  }

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !abierto) {
            e.preventDefault();
            setAbierto(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label={etiquetaAccesible}
        className={`${BOTON_SECUNDARIO_SM} relative ${abierto ? "bg-slate-50 ring-slate-300" : ""}`}
      >
        {Icono && <Icono className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />}
        {etiqueta}
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 motion-reduce:transition-none ${abierto ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        {alerta && (
          <>
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-ufps ring-2 ring-white" aria-hidden="true" />
            <span className="sr-only"> ({textoAlerta || "requiere atención"})</span>
          </>
        )}
      </button>

      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            id={idMenu}
            role="menu"
            aria-label={etiquetaAccesible || etiqueta}
            onKeyDown={manejarTeclado}
            style={{ top: posicion?.top ?? -9999, left: posicion?.left ?? -9999 }}
            className={`fixed z-[70] max-h-[min(30rem,calc(100dvh-1rem))] w-72 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.3)] ${
              posicion ? "animate-aparecer motion-reduce:animate-desvanecer" : "invisible"
            }`}
          >
            {grupoVisibles.map((grupo, i) => (
              <div key={grupo.titulo || i} role="group" aria-label={grupo.titulo} className={i > 0 ? "mt-1.5 border-t border-slate-100 pt-1.5" : ""}>
                {grupo.titulo && (
                  <p className="px-4 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{grupo.titulo}</p>
                )}
                {grupo.items.map((item) => {
                  const IconoItem = item.icono;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      aria-haspopup={item.haspopup}
                      onClick={() => elegir(item)}
                      className={`group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 ${FOCO} focus-visible:ring-inset`}
                    >
                      <span
                        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          item.peligro ? "bg-white text-ufps ring-1 ring-slate-200" : "bg-superficie text-slate-600"
                        } transition-colors group-hover:bg-white group-hover:ring-1 group-hover:ring-slate-200`}
                      >
                        {IconoItem && <IconoItem className="h-4 w-4" aria-hidden="true" />}
                        {item.alerta && (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ufps ring-2 ring-white" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${item.peligro ? "text-ufps" : "text-slate-900"}`}>
                          {item.label}
                        </span>
                        {item.detalle && (
                          <span className={`block text-xs ${item.alerta ? "font-medium text-ufps" : "text-slate-500"}`}>
                            {item.detalle}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
