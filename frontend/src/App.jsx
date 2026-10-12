import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./modules/gestion_administrativa/pages/LoginPage";
import AdminParametrosPage from "./modules/gestion_administrativa/pages/AdminParametrosPage";
import ConvocatoriasPage from "./modules/gestion_convocatorias/pages/ConvocatoriasPage";
import RoleDashboardPage from "./modules/gestion_administrativa/pages/RoleDashboardPage";

function AppContent() {
  const { isAuthenticated, usuario, refreshSession } = useAuth();
  const rolActivo = usuario?.rol?.trim().toLowerCase();
  const [currentModule, setCurrentModule] = useState(null);

  // Al cambiar de rol con el conmutador, reiniciar el módulo activo para cargar la vista por defecto del nuevo rol
  useEffect(() => {
    setCurrentModule(null);
  }, [rolActivo]);

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={refreshSession} />;
  }

  // 1. Administrador del Sistema
  if (rolActivo === "admin" || rolActivo === "administrador") {
    if (currentModule === "convocatorias") {
      return <ConvocatoriasPage key="admin-convocatorias" onNavigate={setCurrentModule} activeModule="convocatorias" />;
    }
    if (currentModule === "emprendimientos") {
      return <RoleDashboardPage key="admin-emprendimientos" role="coordinador" onNavigate={setCurrentModule} defaultModule="emprendimientos" />;
    }
    return <AdminParametrosPage key="admin-parametros" onNavigate={setCurrentModule} />;
  }

  // 2. Coordinador de Emprendimiento (Gestión de convocatorias)
  if (rolActivo === "coordinador") {
    const activeModule = currentModule || "convocatorias";
    if (activeModule === "convocatorias") {
      return <ConvocatoriasPage key="coord-convocatorias" onNavigate={setCurrentModule} activeModule="convocatorias" />;
    }
    return <RoleDashboardPage key={`coord-${activeModule}`} role={rolActivo} onNavigate={setCurrentModule} defaultModule={activeModule} />;
  }

  // Dirección del Programa administra convocatorias desde la misma interfaz.
  if (
    ["direccion_del_programa", "direccion"].includes(rolActivo) &&
    currentModule === "convocatorias"
  ) {
    return <ConvocatoriasPage key="direccion-convocatorias" onNavigate={setCurrentModule} activeModule="convocatorias" />;
  }

  // 3. Estudiante Emprendedor y otros roles institucionales
  return <RoleDashboardPage key={rolActivo} role={rolActivo} onNavigate={setCurrentModule} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
