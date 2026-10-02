import { apiClient } from "../../../services/apiClient";

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
  const data = await apiClient.post(
    "/auth/google/",
    { id_token: idToken, rol },
    { auth: false }
  );

  if (!data?.token) {
    throw new Error("La respuesta del servidor no contiene un token JWT");
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));

  return data;
}

export async function fetchPerfilUsuario() {
  const perfil = await apiClient.get("/auth/me/");
  if (perfil) {
    localStorage.setItem("usuario", JSON.stringify(perfil));
  }
  return perfil;
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