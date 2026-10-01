export const BASE_API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

export async function apiRequest(endpoint, { method = "GET", body, headers = {}, auth = true } = {}) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${BASE_API_URL}${cleanEndpoint}`;

  const requestHeaders = { ...headers };

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
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
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "PUT", body }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: "PATCH", body }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: "DELETE" }),
};
