import { useCallback, useEffect, useRef } from "react";

// Duraciones alineadas con las clases de transición de los diálogos
export const SALIDA_PANEL_MS = 200;
export const SALIDA_FILA_MS = 160;

export function prefiereMenosMovimiento() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function iniciales(nombre = "") {
  return (
    String(nombre)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Mantiene el foco dentro de un diálogo: devuelve un manejador de teclado para el contenedor.
// onEscape se llama al pulsar Escape.
export function useAtraparFoco(contenedorRef, onEscape) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  return useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !contenedorRef.current) return;
      const enfocables = [...contenedorRef.current.querySelectorAll(SELECTOR_FOCO)];
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
    },
    [contenedorRef],
  );
}
