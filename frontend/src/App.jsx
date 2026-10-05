import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./modules/gestion_administrativa/pages/LoginPage";
import SuccessPage from "./modules/gestion_administrativa/pages/SuccessPage";
import TutorProfileForm from "./modules/gestion_acompaniamiento/pages/TutorProfileForm";
import AdminParametrosPage from "./modules/gestion_administrativa/pages/AdminParametrosPage";
import EquipoForm from "./modules/gestion_emprendimiento_2/pages/EquipoForm";

function AppContent() {
  const { isAuthenticated, usuario, refreshSession, logout } = useAuth();
  const rolActivo = usuario?.rol?.trim().toLowerCase();

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={refreshSession} />;
  }

  if (rolActivo === "admin") {
    return <AdminParametrosPage />;
  }

  if (rolActivo === "tutor" || rolActivo === "mentor") {
    return <TutorProfileForm />;
  }

  if (rolActivo === "estudiante") {
    return <EquipoForm />;
  }

  return <SuccessPage onLogout={logout} />;
}


function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
