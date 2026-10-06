import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./modules/gestion_administrativa/pages/LoginPage";
import SuccessPage from "./modules/gestion_administrativa/pages/SuccessPage";
import TutorProfileForm from "./modules/gestion_acompaniamiento/pages/TutorProfileForm";
import AdminParametrosPage from "./modules/gestion_administrativa/pages/AdminParametrosPage";
import ConvocatoriasPage from "./modules/gestion_convocatorias/pages/ConvocatoriasPage";

function AppContent() {
  const { isAuthenticated, usuario, refreshSession, logout } = useAuth();
  const rolActivo = usuario?.rol?.trim().toLowerCase();
  const [currentModule, setCurrentModule] = useState(null);

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={refreshSession} />;
  }

  // Determinar el módulo activo según navegación o rol inicial
  const activeModule = currentModule || (rolActivo === "admin" ? "parametros" : "convocatorias");

  // Módulo de Convocatorias (o postulaciones)
  if (activeModule === "convocatorias" || activeModule === "postulaciones") {
    return <ConvocatoriasPage onNavigate={setCurrentModule} activeModule="convocatorias" />;
  }

  // Módulo de Administración Paramétrica
  if (activeModule === "parametros" && rolActivo === "admin") {
    return <AdminParametrosPage onNavigate={setCurrentModule} />;
  }

  // Perfiles de Tutor / Mentor (HU-16)
  if (rolActivo === "tutor" || rolActivo === "mentor") {
    return <TutorProfileForm />;
  }

  // Fallback para admin
  if (rolActivo === "admin") {
    return <AdminParametrosPage onNavigate={setCurrentModule} />;
  }

  // Para coordinador u otros roles institucionales
  return <ConvocatoriasPage onNavigate={setCurrentModule} activeModule={activeModule} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
