const BASE_API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
const API_URL = `${BASE_API_URL}/auth/google/`;

function isTokenValid(token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    return Boolean(payload.id_usuario && payload.correo);
  } catch {
    return false;
  }
}

export async function authenticateWithGoogle(idToken, rol) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken, rol: rol }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No pudimos verificar tu cuenta");
  }

  if (!data.token) {
    throw new Error("La respuesta del servidor no contiene un token JWT");
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));

  return data;
}

export function getToken() {
  const token = localStorage.getItem("token");
  if (token && !isTokenValid(token)) {
    logout();
    return null;
  }
  return token;
}

export function getUsuario() {
  const raw = localStorage.getItem("usuario");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}