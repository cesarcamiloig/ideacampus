import { useState } from "react";
import GoogleButton from "../components/GoogleButton";
import { loginWithGoogle } from "../services/authService";
import "./LoginPage.css";

function LoginPage() {
  const [status, setStatus] = useState("idle"); // idle | loading | error

  const handleLogin = () => {
    setStatus("loading");
    loginWithGoogle();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">U</div>
          <h1>Iniciar sesión</h1>
          <p>Sistema de gestión de emprendimientos UFPS</p>
        </div>

        <GoogleButton onClick={handleLogin} disabled={status === "loading"} />

        {status === "loading" && (
          <p className="login-status">Conectando con Google...</p>
        )}

        {status === "error" && (
          <p className="login-error">No pudimos verificar tu cuenta.</p>
        )}

        <p className="login-hint">Usa tu cuenta institucional (@ufps.edu.co)</p>
      </div>
    </div>
  );
}

export default LoginPage;