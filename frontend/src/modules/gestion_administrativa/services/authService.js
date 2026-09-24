// URL del backend que inicia el flujo de login con Google.
// TODO: confirmar con el equipo de backend la URL real (puerto/endpoint).
const GOOGLE_LOGIN_URL = "http://localhost:8000/auth/google/login/";

export function loginWithGoogle() {
  window.location.href = GOOGLE_LOGIN_URL;
}
