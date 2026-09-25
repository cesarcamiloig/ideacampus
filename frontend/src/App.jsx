import { useState } from "react";
import LoginPage from "./modules/gestion_administrativa/pages/LoginPage";
import SuccessPage from "./modules/gestion_administrativa/pages/SuccessPage";
import { getToken } from "./modules/gestion_administrativa/services/authService";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getToken()));

  return isAuthenticated ? (
    <SuccessPage />
  ) : (
    <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
  );
}

export default App;
