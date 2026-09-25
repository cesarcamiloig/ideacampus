import { getToken } from "../services/authService";
import "./SuccessPage.css";

function SuccessPage() {
  const token = getToken();

  return (
    <main className="success-page">
      <section className="success-message" aria-labelledby="success-title">
        <div className="success-icon" aria-hidden="true">
          ✓
        </div>
        <h1 id="success-title">Login exitoso</h1>
        <p>Tu sesión fue iniciada correctamente.</p>
        {token && <p className="token-status">Token JWT guardado en el almacenamiento local.</p>}
      </section>
    </main>
  );
}

export default SuccessPage;
