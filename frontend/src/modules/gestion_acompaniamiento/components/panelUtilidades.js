import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";

// Constantes, funciones y hooks compartidos por los paneles de roles del proyecto.
// Van separados de panelComun.jsx para que ese archivo solo exporte componentes (fast refresh).

export const NIVELES_ACADEMICOS = {
  pregrado: "Pregrado",
  especializacion: "Especialización",
  maestria: "Maestría",
  doctorado: "Doctorado",
};

// Duraciones alineadas con las clases de transición
export const SALIDA_PANEL_MS = 200;
export const SALIDA_FILA_MS = 160;

export function prefiereMenosMovimiento() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function porNombre(a, b) {
  return (a.nombre || "").localeCompare(b.nombre || "", "es");
}

export function iniciales(nombre = "") {
  return (
    nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function textoExperiencia(anios) {
  if (anios === null || anios === undefined) return null;
  return `${anios} ${anios === 1 ? "año" : "años"}`;
}

// 401, o el 403 que hoy devuelve el backend cuando el token venció: se cierra la sesión.
// Devuelve true si el error era de sesión (y ya se manejó).
export function useManejarErrorSesion() {
  const { logout } = useAuth();
  // logout cambia en cada render del AuthProvider: se guarda en una ref para no recargar los datos
  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  return useCallback((err) => {
    const tokenVencido = err?.status === 403 && /token inv[aá]lido o expirado/i.test(err.message || "");
    if (err?.status === 401 || tokenVencido) {
      logoutRef.current?.();
      return true;
    }
    return false;
  }, []);
}

// Las acciones de asignar y quitar solo se muestran al coordinador
export function usePuedeGestionar() {
  const { rolActivo } = useAuth();
  return (rolActivo || "").trim().toLowerCase() === "coordinador";
}
