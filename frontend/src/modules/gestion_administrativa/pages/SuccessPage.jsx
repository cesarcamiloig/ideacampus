import { useAuth } from "../../../context/AuthContext";
import { getToken, getUsuario, logout as clearAuthStorage } from "../services/authService";
import "./SuccessPage.css";

function SuccessPage({ onLogout }) {
  const auth = useAuth();
  const token = auth?.token ?? getToken();
  const usuario = auth?.usuario ?? getUsuario();

  function handleLogout() {
    if (auth?.logout) {
      auth.logout();
    } else {
      clearAuthStorage();
    }
    if (onLogout) {
      onLogout();
    }
  }

  return (
    <main className="success-page">
      <section className="success-message" aria-labelledby="success-title">
        <div className="success-icon" aria-hidden="true">
          ✓
        </div>
        <h1 id="success-title">Login exitoso</h1>
        <p>Tu sesión fue iniciada correctamente.</p>
        {usuario && (
          <p>
            <strong>{usuario.nombre}</strong> ({usuario.correo}) — Rol activo: <strong>{usuario.rol}</strong>
          </p>
        )}
        {token && <p className="token-status">Token JWT guardado en el almacenamiento local.</p>}
        <button type="button" className="logout-button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

export default SuccessPage;
