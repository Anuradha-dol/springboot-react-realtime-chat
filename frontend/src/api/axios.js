import axios from "axios";
import { API_HTTP_BASE_URL } from "../config/appConfig";

const api = axios.create({
  baseURL: API_HTTP_BASE_URL,
  withCredentials: true
});

const refreshClient = axios.create({
  baseURL: API_HTTP_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("chatapp_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    const isAuthEndpoint = String(originalRequest?.url || "").startsWith("/auth/");
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        // Refresh token flow keeps session alive without exposing refresh token in JS.
        const refreshResponse = await refreshClient.post("/auth/refresh-token");
        const newToken = refreshResponse?.data?.data?.token;
        if (newToken) {
          localStorage.setItem("chatapp_token", newToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem("chatapp_token");
        localStorage.removeItem("chatapp_user");
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }
    }

    if (status === 401 || status === 403) {
      error.userFriendlyMessage = status === 401 ? "Session expired. Please log in again." : "You do not have permission.";
    }
    return Promise.reject(error);
  }
);

export default api;
