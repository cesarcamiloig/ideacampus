import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./modules/gestion_administrativa/pages/LoginPage";
import AdminParametrosPage from "./modules/gestion_administrativa/pages/AdminParametrosPage";
import ConvocatoriasPage from "./modules/gestion_convocatorias/pages/ConvocatoriasPage";
import RoleDashboardPage from "./modules/gestion_administrativa/pages/RoleDashboardPage";
import { consumirBienvenidaPendiente } from "./modules/gestion_administrativa/services/authService";
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, SECCION, TARJETA } from "./components/ui";

function AppContent() {
  const { isAuthenticated, usuario, refreshSession } = useAuth();
  const rolActivo = usuario?.rol?.trim().toLowerCase();
  const [currentModule, setCurrentModule] = useState(null);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

  // Al conmutar de rol, reiniciar el módulo activo para cargar la vista inicial del nuevo rol
  useEffect(() => {
    setCurrentModule(null);
  }, [rolActivo]);

  // La bienvenida aparece solo en la primera pantalla tras iniciar sesión:
  // al recargar con la sesión ya abierta la marca ya se consumió
  useEffect(() => {
    if (!isAuthenticated) {
      setMostrarBienvenida(false);
    } else if (consumirBienvenidaPendiente()) {
      setMostrarBienvenida(true);
    }
  }, [isAuthenticated]);

  // Cualquier navegación del usuario (apartados, notificaciones, cambio de rol) oculta la bienvenida;
  // las redirecciones automáticas no
  function navegar(modulo, opciones) {
    if (!opciones?.automatico) {
      setMostrarBienvenida(false);
    }
    setCurrentModule(modulo);
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={refreshSession} />;
  }

  // 1. Administrador del Sistema
  if (rolActivo === "admin" || rolActivo === "administrador") {
    if (currentModule === "convocatorias") {
      return <ConvocatoriasPage key="admin-convocatorias" onNavigate={navegar} activeModule="convocatorias" />;
    }
    if (currentModule === "emprendimientos") {
      return <RoleDashboardPage key="admin-emprendimientos" role="admin" onNavigate={navegar} defaultModule="emprendimientos" mostrarBienvenida={mostrarBienvenida} />;
    }
    if (currentModule === "alertas") {
      return <RoleDashboardPage key="admin-alertas" role="admin" onNavigate={navegar} defaultModule="alertas" mostrarBienvenida={mostrarBienvenida} />;
    }
    return <AdminParametrosPage key="admin-parametros" onNavigate={navegar} mostrarBienvenida={mostrarBienvenida} />;
  }

  // 2. Coordinador de Emprendimiento
  if (rolActivo === "coordinador") {
    // El coordinador no gestiona convocatorias: entra a Proyectos (también si una
    // notificación o alerta intenta llevarlo a convocatorias)
    const activeModule = !currentModule || currentModule === "convocatorias" ? "iniciativas" : currentModule;
    return <RoleDashboardPage key={`coord-${activeModule}`} role={rolActivo} onNavigate={navegar} defaultModule={activeModule} mostrarBienvenida={mostrarBienvenida} />;
  }

  // Dirección del Programa administra convocatorias desde la misma interfaz.
  if (
    ["direccion_del_programa", "direccion"].includes(rolActivo) &&
    currentModule === "convocatorias"
  ) {
    return <ConvocatoriasPage key="direccion-convocatorias" onNavigate={navegar} activeModule="convocatorias" />;
  }

  // 3. Estudiante Emprendedor y otros roles institucionales
  return <RoleDashboardPage key={rolActivo} role={rolActivo} onNavigate={navegar} defaultModule={currentModule} mostrarBienvenida={mostrarBienvenida} />;
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
        <div className="flex min-h-screen items-center justify-center bg-superficie p-6">
          <div className={`${TARJETA} w-full max-w-lg space-y-4 p-8 text-center`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ufps text-xl font-bold text-white">
              !
            </div>
            <p className={SECCION}>GENNOVA</p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Ocurrió un problema al cargar la aplicación
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Es posible que tengas datos de sesión en caché correspondientes a la base de datos anterior. Puedes restablecer la sesión para volver a ingresar con las nuevas credenciales institucionales.
            </p>
            {this.state.error && (
              <pre className="max-h-36 overflow-auto rounded-xl bg-slate-50 p-3 text-left font-mono text-xs text-ufps ring-1 ring-slate-200">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className={BOTON_PRIMARIO}
              >
                Limpiar Sesión y Reiniciar
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={BOTON_SECUNDARIO}
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
