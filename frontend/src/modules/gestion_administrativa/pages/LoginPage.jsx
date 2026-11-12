import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { authenticateWithGoogle } from "../services/authService";

// Trazos decorativos del fondo (gris tenue, sin relleno)
const TRAZO = "pointer-events-none absolute fill-none stroke-slate-400 [stroke-linecap:round] [stroke-linejoin:round]";

const LOGO_UFPS_URL =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRLYRDeAyduSAIcGYXU8zMh8ydMIRvGXAL5zj9GN-qG_SU9Be1tSneByVo&s=10";

const DEFAULT_GOOGLE_CLIENT_ID = "260735986909-fu7gptlsfojfho3kmaj212djjf8k6p60.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

function InstitutionIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0 fill-none stroke-current opacity-90 [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.6]"
    >
      <path d="M3 9.2 12 4l9 5.2-9 5.2-9-5.2Z" />
      <path d="M6.5 11.5v4.7c2.9 2.1 8.1 2.1 11 0v-4.7M20.5 10v5" />
    </svg>
  );
}

function BgLeft() {
  return (
    <svg
      className={`${TRAZO} -left-16 top-1/2 w-44 -translate-y-1/2 opacity-[0.08] [stroke-width:1.2] sm:left-[2%] sm:w-[clamp(180px,18vw,340px)] sm:opacity-[0.13]`}
      viewBox="0 0 380 500"
      aria-hidden="true"
    >
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
    <svg
      className={`${TRAZO} -right-16 top-1/2 w-44 -translate-y-1/2 opacity-[0.08] [stroke-width:1.2] sm:right-[2%] sm:w-[clamp(180px,18vw,340px)] sm:opacity-[0.13]`}
      viewBox="0 0 380 500"
      aria-hidden="true"
    >
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
    <svg
      className={`${TRAZO} right-[21%] top-[3%] hidden w-[clamp(80px,9vw,150px)] opacity-[0.09] [stroke-width:1.1] sm:block`}
      viewBox="0 0 160 160"
      aria-hidden="true"
    >
      <circle cx="30" cy="120" r="5" /><circle cx="90" cy="40" r="7" /><circle cx="140" cy="100" r="5" />
      <path d="M30 120 90 40 140 100" />
      <rect x="72" y="22" width="36" height="36" rx="3" />
      <path d="M80 12v-8m16 8v-8M80 68v8m16-8v8M62 30h-8m8 16h-8M118 30h8m-8 16h8" />
    </svg>
  );
}

function BgAccentBL() {
  return (
    <svg
      className={`${TRAZO} bottom-[5%] left-[21%] hidden w-[clamp(80px,9vw,150px)] opacity-[0.09] [stroke-width:1.1] sm:block`}
      viewBox="0 0 160 160"
      aria-hidden="true"
    >
      <circle cx="130" cy="40" r="5" /><circle cx="70" cy="120" r="7" /><circle cx="20" cy="60" r="5" />
      <path d="M130 40 70 120 20 60" />
      <path d="M40 100h80M55 88h50M67 78h26M80 78V54" />
      <circle cx="80" cy="44" r="10" />
      <path d="M77 44h6M80 41v6" />
    </svg>
  );
}

function LoginCard({ status, errorMessage, googleButtonRef, rolSeleccionado, setRolSeleccionado }) {
  return (
    <main
      className="relative z-10 flex w-[min(88vw,366px)] flex-col items-center rounded-2xl border border-white/20 bg-ufps px-6 pb-6 pt-7 text-white shadow-[0_28px_64px_rgba(31,41,55,0.16),0_6px_18px_rgba(200,30,30,0.14),inset_0_1px_0_rgba(255,255,255,0.18)] sm:w-[430px] sm:px-11 sm:pb-7 sm:pt-9"
      aria-labelledby="gennova-title"
    >
      <header className="flex flex-col items-center text-center">
        <img
          className="mb-4 h-14 w-14 shadow-[0_10px_22px_rgba(90,12,20,0.3),0_2px_6px_rgba(90,12,20,0.2)] animate-aparecer motion-reduce:animate-none sm:h-[72px] sm:w-[72px]"
          src={LOGO_UFPS_URL}
          alt="Universidad Francisco de Paula Santander"
          width="72"
          height="72"
        />
        <h1 id="gennova-title" className="mb-2 font-marca text-[27px] font-bold leading-tight tracking-[0.055em] sm:text-[31px]">
          GENNOVA
        </h1>
        <p className="text-[13px] font-medium leading-snug sm:text-sm">
          Gestión de emprendimientos e<br />innovación estudiantil
        </p>
        <p className="mt-1.5 max-w-[260px] text-[11px] leading-snug text-white/80 sm:max-w-none">
          Universidad Francisco de Paula Santander
        </p>
      </header>

      <div className="relative mt-6 w-full max-w-[340px]">
        <select
          className="h-[50px] w-full cursor-pointer appearance-none rounded-xl border border-white/90 bg-white pl-4 pr-11 text-sm text-slate-800 shadow-[0_4px_14px_rgba(114,27,34,0.12)] transition-shadow duration-150 hover:shadow-[0_6px_18px_rgba(114,27,34,0.2)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-white/70"
          aria-label="Selecciona un rol para iniciar sesión"
          value={rolSeleccionado}
          onChange={(e) => setRolSeleccionado(e.target.value)}
        >
          <option value="">Selecciona un rol</option>
          <option value="estudiante">Estudiante</option>
          <option value="admin">Administrador</option>
          <option value="direccion_del_programa">Dirección del Programa</option>
          <option value="coordinador">Coordinador</option>
          <option value="tutor">Tutor</option>
          <option value="mentor">Mentor</option>
          <option value="evaluador">Evaluador</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ufps"
          aria-hidden="true"
        />
      </div>

      <div ref={googleButtonRef} className="mt-6 flex justify-center" />

      {status === "loading" && <p className="mt-3.5 text-[12.5px] text-white/85">Conectando...</p>}
      {status === "error" && (
        <p className="mt-3.5 rounded-lg bg-black/15 px-3 py-2 text-[12.5px] text-white" role="alert">
          {errorMessage}
        </p>
      )}

      <section className="mt-5 flex items-center justify-center gap-2.5 text-left" aria-label="Acceso institucional">
        <InstitutionIcon />
        <div>
          <p className="text-[11.5px] leading-tight text-white/80">Solo cuentas institucionales</p>
          <strong className="mt-px block text-[13.5px] font-semibold tracking-[0.01em]">@ufps.edu.co</strong>
        </div>
      </section>
    </main>
  );
}

function PageFooter() {
  return (
    <div
      className="pointer-events-none absolute bottom-3.5 left-1/2 flex -translate-x-1/2 select-none flex-wrap items-center justify-center gap-2 whitespace-nowrap px-4 text-center text-[10px] tracking-[0.01em] text-slate-400 sm:bottom-6 sm:gap-2.5 sm:text-[11px]"
      aria-hidden="true"
    >
      <span>© {new Date().getFullYear()} Universidad Francisco de Paula Santander</span>
      <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-slate-300" />
      <span>GENNOVA — Innovación y Emprendimiento</span>
    </div>
  );
}

function LoginPage({ onLoginSuccess }) {
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("No pudimos verificar tu cuenta.");
  const [rolSeleccionado, setRolSeleccionado] = useState("");
  const rolRef = useRef(rolSeleccionado);
  const onLoginSuccessRef = useRef(onLoginSuccess);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    rolRef.current = rolSeleccionado;
  }, [rolSeleccionado]);

  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
  }, [onLoginSuccess]);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function handleCredentialResponse(response) {
      console.log("[Google] Callback ejecutado");

      if (!response?.credential) {
        console.error("[Google] La respuesta no contiene un token credential", response);
        setErrorMessage("La respuesta de Google no contiene un token válido.");
        setStatus("error");
        return;
      }

      const rolActual = rolRef.current;
      if (!rolActual) {
        setErrorMessage("Por favor selecciona un rol antes de iniciar sesión.");
        setStatus("error");
        return;
      }

      setStatus("loading");
      try {
        const data = await authenticateWithGoogle(response.credential, rolActual);
        console.log("Sesión iniciada:", data.usuario);
        onLoginSuccessRef.current();
      } catch (err) {
        console.error(err);
        setErrorMessage(err.message || "No pudimos verificar tu cuenta.");
        setStatus("error");
      }
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 340,
        text: "continue_with",
      });
    };
    script.onerror = () => {
      console.error("[Google] No se pudo cargar Google Identity Services");
      setStatus("error");
    };
    document.body.appendChild(script);
  }, []);

  return (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_90%_60%_at_50%_44%,rgba(255,255,255,0.94)_0%,transparent_100%),#f8fafc] px-4 pb-14 pt-5 supports-[min-height:100dvh]:min-h-dvh sm:bg-[radial-gradient(ellipse_65%_70%_at_50%_46%,rgba(255,255,255,0.88)_0%,transparent_100%),#f8fafc] sm:px-8 sm:pb-16 sm:pt-10">
    <BgLeft />
    <BgRight />
    <BgAccentTR />
    <BgAccentBL />
    <LoginCard
      status={status}
      errorMessage={errorMessage}
      googleButtonRef={googleButtonRef}
      rolSeleccionado={rolSeleccionado}
      setRolSeleccionado={setRolSeleccionado}
    />
    <PageFooter />
  </div>
);
}

export default LoginPage;