const API_URL = "http://localhost:8000/api/auth/google/";

export async function authenticateWithGoogle(idToken) {
  const response = await fetch(API_URL, { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "No pudimos verificar tu cuenta");
  }

  if (!data.token) {
    throw new Error("La respuesta del servidor no contiene un token JWT");
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));

  return data;
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUsuario() {
  const raw = localStorage.getItem("usuario");
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}