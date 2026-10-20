import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getToken,
  getUsuario,
  fetchPerfilUsuario,
  logout as clearSessionStorage,
} from "../modules/gestion_administrativa/services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [usuario, setUsuario] = useState(() => (getToken() ? getUsuario() : null));

  const refreshSession = useCallback(async () => {
    const currentToken = getToken();
    setToken(currentToken);
    if (!currentToken) {
      setUsuario(null);
      return null;
    }
    try {
      const perfil = await fetchPerfilUsuario();
      if (perfil) {
        setUsuario((prev) => {
          const rawRoles = perfil.roles_asignados || perfil.roles || (perfil.rol ? [perfil.rol] : []);
          const currentRol = prev?.rol;
          const validRol = (currentRol && rawRoles.includes(currentRol))
            ? currentRol
            : (perfil.rol || rawRoles[0] || null);

          const updated = {
            ...prev,
            ...perfil,
            rol: validRol,
            roles: rawRoles,
            roles_asignados: rawRoles,
          };
          try {
            localStorage.setItem("usuario", JSON.stringify(updated));
          } catch {
            // Ignora si localStorage no está disponible
          }
          return updated;
        });
        return perfil;
      }
    } catch {
      // Fallback a almacenamiento local si la solicitud falla
    }
    const localUser = getUsuario();
    setUsuario(localUser);
    return localUser;
  }, []);

  const updateUsuario = useCallback((newData) => {
    setUsuario((prev) => {
      const updated = typeof newData === "function" ? newData(prev) : { ...prev, ...newData };
      try {
        localStorage.setItem("usuario", JSON.stringify(updated));
      } catch {
        // Ignora si localStorage no está disponible
      }
      return updated;
    });
  }, []);

  const updateCurrentUserRoles = useCallback((newRoles) => {
    if (!Array.isArray(newRoles)) return;
    setUsuario((prev) => {
      if (!prev) return prev;
      const currentRol = prev.rol;
      const nextRol = newRoles.includes(currentRol) ? currentRol : (newRoles[0] || null);
      const updated = {
        ...prev,
        rol: nextRol,
        roles: newRoles,
        roles_asignados: newRoles,
      };
      try {
        localStorage.setItem("usuario", JSON.stringify(updated));
      } catch {
        // Ignora si localStorage no está disponible
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.key || e.key === "usuario") {
        setUsuario(getUsuario());
      }
      if (!e.key || e.key === "token") {
        setToken(getToken());
      }
    };

    const handleSessionUpdated = () => {
      refreshSession();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("gennova:session-updated", handleSessionUpdated);

    // Sincronizar perfil con backend al cargar si hay sesión activa
    if (token) {
      refreshSession();
    }

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("gennova:session-updated", handleSessionUpdated);
    };
  }, [token, refreshSession]);

  function logout() {
    clearSessionStorage();
    setToken(null);
    setUsuario(null);
  }

  const isAuthenticated = Boolean(token);
  const rolActivo = usuario?.rol || ( Array.isArray(usuario?.roles) ? usuario.roles[0] : null ) || null;
  const rolesAsignados =
    usuario?.roles_asignados || usuario?.roles || (usuario?.rol ? [usuario.rol] : []);

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
        updateUsuario,
        updateCurrentUserRoles,
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
