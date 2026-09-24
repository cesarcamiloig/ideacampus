import { useState } from "react";
import GoogleButton from "../components/GoogleButton";
import { loginWithGoogle } from "../services/authService";
import "./LoginPage.css";

function InstitutionIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 9.2 12 4l9 5.2-9 5.2-9-5.2Z" />
      <path d="M6.5 11.5v4.7c2.9 2.1 8.1 2.1 11 0v-4.7M20.5 10v5" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M6.5 18H6a2 2 0 0 1-2-2v-2h2.5v4Zm11 0h.5a2 2 0 0 0 2-2v-2h-2.5v4ZM17.5 18c-.6 1.3-1.8 2-3.5 2" />
    </svg>
  );
}

function BgLeft() {
  return (
    <svg className="bg-panel bg-panel-left" viewBox="0 0 380 500" aria-hidden="true">
      <circle cx="60" cy="80" r="7" /><circle cx="160" cy="60" r="5" />
      <circle cx="280" cy="100" r="8" /><circle cx="340" cy="200" r="6" />
      <circle cx="80" cy="230" r="5" /><circle cx="200" cy="300" r="9" />
      <circle cx="310" cy="370" r="6" /><circle cx="55" cy="420" r="7" />
      <circle cx="160" cy="460" r="5" /><circle cx="260" cy="440" r="7" />
      <path d="M60 80 160 60M160 60 280 100M280 100 340 200M340 200 200 300M200 300 310 370M80 230 200 300M55 420 160 460M160 460 260 440M200 300 160 460" />
      <rect x="118" y="118" width="44" height="44" rx="3" />
      <path d="M129 108v-9m11 9v-9m11 9v-9M129 172v9m11-9v9m11-9v9M108 129h-9m9 11h-9m9 11h-9M172 129h9m-9 11h9m-9 11h9" />
      <rect x="245" y="245" width="36" height="36" rx="3" />
      <path d="M254 235v-8m12 8v-8M254 291v8m12-8v8M235 254h-8m8 12h-8M291 254h8m-8 12h8" />
    </svg>
  );
}

function BgRight() {
  return (
    <svg className="bg-panel bg-panel-right" viewBox="0 0 380 500" aria-hidden="true">
      <path d="M90 380h200M100 380V240h20v-30h120v30h20v140M130 380v-60h40v60M210 380v-60h40v60M160 210V170M190 210V170M220 210V170M150 170h80M160 240h60v40h-60zM190 210v-40" />
      <circle cx="190" cy="120" r="16" />
      <path d="M186 120h8M190 116v8" />
      <circle cx="60" cy="100" r="6" /><circle cx="320" cy="130" r="5" />
      <circle cx="50" cy="280" r="7" /><circle cx="330" cy="280" r="6" />
      <circle cx="80" cy="430" r="5" /><circle cx="300" cy="430" r="5" />
      <path d="M60 100 100 240M320 130 280 240M50 280 100 380M330 280 280 380" />
    </svg>
  );
}

function BgAccentTR() {
  return (
    <svg className="bg-panel bg-accent-tr" viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="30" cy="120" r="5" /><circle cx="90" cy="40" r="7" /><circle cx="140" cy="100" r="5" />
      <path d="M30 120 90 40 140 100" />
      <rect x="72" y="22" width="36" height="36" rx="3" />
      <path d="M80 12v-8m16 8v-8M80 68v8m16-8v8M62 30h-8m8 16h-8M118 30h8m-8 16h8" />
    </svg>
  );
}

function BgAccentBL() {
  return (
    <svg className="bg-panel bg-accent-bl" viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="130" cy="40" r="5" /><circle cx="70" cy="120" r="7" /><circle cx="20" cy="60" r="5" />
      <path d="M130 40 70 120 20 60" />
      <path d="M40 100h80M55 88h50M67 78h26M80 78V54" />
      <circle cx="80" cy="44" r="10" />
      <path d="M77 44h6M80 41v6" />
    </svg>
  );
}

function LoginCard({ status, onLogin }) {
  return (
    <main className="login-card" aria-labelledby="gennova-title">
      <header className="brand">
        <div className="brand-mark" aria-hidden="true">U</div>
        <h1 id="gennova-title">GENNOVA</h1>
        <p className="tagline">Gestión de emprendimientos e<br />innovación estudiantil</p>
        <p className="university">Universidad Francisco de Paula Santander</p>
      </header>

      <GoogleButton onClick={onLogin} disabled={status === "loading"} />

      {status === "error" && (
        <p className="login-error-msg" role="alert">No pudimos verificar tu cuenta.</p>
      )}

      <section className="institution-note" aria-label="Acceso institucional">
        <InstitutionIcon />
        <div>
          <p>Solo cuentas institucionales</p>
          <strong>@ufps.edu.co</strong>
        </div>
      </section>

      <div className="separator" />

      <footer className="support">
        <SupportIcon />
        <div>
          <p>¿Problemas para ingresar?</p>
          <a href="mailto:soporte@ufps.edu.co">Contacta a soporte</a>
        </div>
      </footer>
    </main>
  );
}

function PageFooter() {
  return (
    <div className="page-footer" aria-hidden="true">
      <span>© {new Date().getFullYear()} Universidad Francisco de Paula Santander</span>
      <span className="footer-dot" />
      <span>GENNOVA — Innovación y Emprendimiento</span>
    </div>
  );
}

function LoginPage() {
  const [status, setStatus] = useState("idle"); // idle | loading | error

  const handleLogin = () => {
    setStatus("loading");
    loginWithGoogle();
  };

  return (
    <div className="app-shell">
      <BgLeft />
      <BgRight />
      <BgAccentTR />
      <BgAccentBL />
      <LoginCard status={status} onLogin={handleLogin} />
      <PageFooter />
    </div>
  );
}

export default LoginPage;