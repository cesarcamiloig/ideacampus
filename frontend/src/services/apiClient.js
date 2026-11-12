export const BASE_API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

function rolSeleccionado() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null")?.rol || null;
  } catch {
    return null;
  }
}

export async function apiRequest(
  endpoint,
  { method = "GET", body, headers = {}, auth = true, responseType = "json" } = {},
) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${BASE_API_URL}${cleanEndpoint}`;

  const requestHeaders = { ...headers };

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
      // El token guarda el rol con el que se inició sesión; el que se elige después en el
      // selector de roles se envía aparte para que el backend filtre con el rol correcto
      const rol = rolSeleccionado();
      if (rol) requestHeaders["X-Rol-Activo"] = rol;
    }
  }

  let payload = body;
  if (body !== undefined && body !== null && typeof body === "object" && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = requestHeaders["Content-Type"] || "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: payload,
  });

  if (responseType === "blob" && response.ok) {
    return response.blob();
  }

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
    }
    const message = data?.error || data?.detail || "Error al comunicarse con el servidor";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: "GET" }),
  download: (endpoint, options) =>
    apiRequest(endpoint, { ...options, method: "GET", responseType: "blob" }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "PUT", body }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "PATCH", body }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: "DELETE" }),
};
