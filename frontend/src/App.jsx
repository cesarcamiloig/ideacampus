import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./modules/gestion_administrativa/pages/LoginPage";
import AdminParametrosPage from "./modules/gestion_administrativa/pages/AdminParametrosPage";
import ConvocatoriasPage from "./modules/gestion_convocatorias/pages/ConvocatoriasPage";
import RoleDashboardPage from "./modules/gestion_administrativa/pages/RoleDashboardPage";

function AppContent() {
  const { isAuthenticated, usuario, refreshSession } = useAuth();
  const rolActivo = usuario?.rol?.trim().toLowerCase();
  const [currentModule, setCurrentModule] = useState(null);

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={refreshSession} />;
  }

  // 1. Administrador del Sistema
  if (rolActivo === "admin" || rolActivo === "administrador") {
    if (currentModule === "convocatorias") {
      return <ConvocatoriasPage onNavigate={setCurrentModule} activeModule="convocatorias" />;
    }
    if (currentModule === "emprendimientos") {
      return <RoleDashboardPage role="coordinador" onNavigate={setCurrentModule} defaultModule="emprendimientos" />;
    }
    return <AdminParametrosPage onNavigate={setCurrentModule} />;
  }

  // 2. Coordinador de Emprendimiento (Gestión de convocatorias HU-02)
  if (rolActivo === "coordinador") {
    const activeModule = currentModule || "convocatorias";
    if (activeModule === "convocatorias") {
      return <ConvocatoriasPage onNavigate={setCurrentModule} activeModule="convocatorias" />;
    }
    return <RoleDashboardPage role={rolActivo} onNavigate={setCurrentModule} defaultModule={activeModule} />;
  }

  // 3. Estudiante Emprendedor (HU-03) y otros roles institucionales
  return <RoleDashboardPage role={rolActivo} onNavigate={setCurrentModule} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
