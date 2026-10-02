import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./modules/gestion_administrativa/pages/LoginPage";
import SuccessPage from "./modules/gestion_administrativa/pages/SuccessPage";
import TutorProfileForm from "./modules/gestion_acompaniamiento/pages/TutorProfileForm";

function AppContent() {
  const { isAuthenticated, usuario, refreshSession, logout } = useAuth();
  const rolActivo = usuario?.rol?.trim().toLowerCase();

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={refreshSession} />;
  }

  if (rolActivo === "tutor" || rolActivo === "mentor") {
    return <TutorProfileForm />;
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
