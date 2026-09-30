function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="google-icon" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.83-1.76-5.62-4.13H3.03v2.61A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.38 13.87A6.02 6.02 0 0 1 6.06 12c0-.65.11-1.28.32-1.87V7.52H3.03A10 10 0 0 0 2 12c0 1.61.38 3.14 1.03 4.48l3.35-2.61Z" fill="#FBBC05" />
      <path d="M12 6c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.97 5.52l3.35 2.61C7.17 7.76 9.39 6 12 6Z" fill="#EA4335" />
    </svg>
  );
}

function GoogleButton({ onClick, disabled }) {
  return (
    <button className="google-button" type="button" onClick={onClick} disabled={disabled}>
      <GoogleIcon />
      <span>{disabled ? "Conectando..." : "Continuar con Google"}</span>
    </button>
  );
}

export default GoogleButton;