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

  // Al conmutar de rol, reiniciar el módulo activo para cargar la vista inicial del nuevo rol
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
      return <RoleDashboardPage key="admin-emprendimientos" role="admin" onNavigate={setCurrentModule} defaultModule="emprendimientos" />;
    }
    if (currentModule === "alertas") {
      return <RoleDashboardPage key="admin-alertas" role="admin" onNavigate={setCurrentModule} defaultModule="alertas" />;
    }
    return <AdminParametrosPage key="admin-parametros" onNavigate={setCurrentModule} />;
  }

  // 2. Coordinador de Emprendimiento
  if (rolActivo === "coordinador") {
    // El coordinador no gestiona convocatorias: entra a Proyectos (también si una
    // notificación o alerta intenta llevarlo a convocatorias)
    const activeModule = !currentModule || currentModule === "convocatorias" ? "iniciativas" : currentModule;
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
  return <RoleDashboardPage key={rolActivo} role={rolActivo} onNavigate={setCurrentModule} defaultModule={currentModule} />;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignorar
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 font-sans">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Ocurrió un problema al cargar la aplicación
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Es posible que tengas datos de sesión en caché correspondientes a la base de datos anterior. Puedes restablecer la sesión para volver a ingresar con las nuevas credenciales institucionales.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-slate-50 border border-slate-200 p-3 rounded-lg text-left overflow-auto text-red-600 font-mono max-h-36">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors shadow-sm"
              >
                Limpiar Sesión y Reiniciar
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors border border-slate-200"
              >
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
