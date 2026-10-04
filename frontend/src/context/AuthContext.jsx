import { createContext, useContext, useState } from "react";
import {
  getToken,
  getUsuario,
  logout as clearSessionStorage,
} from "../modules/gestion_administrativa/services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [usuario, setUsuario] = useState(() => (getToken() ? getUsuario() : null));

  function refreshSession() {
    const currentToken = getToken();
    setToken(currentToken);
    setUsuario(currentToken ? getUsuario() : null);
  }

  function logout() {
    clearSessionStorage();
    setToken(null);
    setUsuario(null);
  }

  const isAuthenticated = Boolean(token);
  const rolActivo = usuario?.rol || null;
  const rolesAsignados =
    usuario?.roles_asignados || (usuario?.rol ? [usuario.rol] : []);

  function hasRole(rolesRequeridos) {
    if (!rolActivo) return false;
    if (Array.isArray(rolesRequeridos)) {
      return rolesRequeridos.includes(rolActivo);
    }
    return rolActivo === rolesRequeridos;
  }

  function switchRole(newRole) {
    if (usuario && newRole) {
      const updatedUser = { ...usuario, rol: newRole };
      setUsuario(updatedUser);
      try {
        localStorage.setItem("usuario", JSON.stringify(updatedUser));
      } catch {
        // Ignora si localStorage no está disponible
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        usuario,
        isAuthenticated,
        rolActivo,
        rolesAsignados,
        hasRole,
        refreshSession,
        switchRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de un AuthProvider");
  }
  return context;
}
