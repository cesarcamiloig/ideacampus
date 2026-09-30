import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./modules/gestion_administrativa/pages/LoginPage";
import SuccessPage from "./modules/gestion_administrativa/pages/SuccessPage";

function AppContent() {
  const { isAuthenticated, refreshSession, logout } = useAuth();

  return isAuthenticated ? (
    <SuccessPage onLogout={logout} />
  ) : (
    <LoginPage onLoginSuccess={refreshSession} />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
