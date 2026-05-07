function trimTrailingSlash(value) {
  if (!value) return value;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveDefaultApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:8080";
  }

  const protocol = window.location.protocol === "https:" ? "https" : "http";
  const hostname = window.location.hostname || "localhost";
  return `${protocol}://${hostname}:8080`;
}

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL) || resolveDefaultApiBaseUrl();
export const API_HTTP_BASE_URL = `${API_BASE_URL}/api`;
export const WS_ENDPOINT_URL = `${API_BASE_URL}/ws`;
