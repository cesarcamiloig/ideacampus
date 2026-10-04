import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./modules/gestion_administrativa/pages/LoginPage";
import AdminParametrosPage from "./modules/gestion_administrativa/pages/AdminParametrosPage";
import RoleDashboardPage from "./modules/gestion_administrativa/pages/RoleDashboardPage";

function AppContent() {
  const { isAuthenticated, usuario, refreshSession } = useAuth();
  const rolActivo = usuario?.rol?.trim().toLowerCase();

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={refreshSession} />;
  }

  if (rolActivo === "admin" || rolActivo === "administrador") {
    return <AdminParametrosPage />;
  }

  return <RoleDashboardPage role={rolActivo} />;
}


function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
