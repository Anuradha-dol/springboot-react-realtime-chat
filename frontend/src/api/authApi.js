import api from "./axios";

// Auth APIs are grouped here to keep pages simple and consistent.
export const register = (payload) => api.post("/auth/register", payload);
export const verifyEmailOtp = (payload) => api.post("/auth/verify-email-otp", payload);
export const resendEmailOtp = (payload) => api.post("/auth/resend-email-otp", payload);
export const login = (payload) => api.post("/auth/login", payload);
export const logoutApi = () => api.post("/auth/logout");
export const refreshToken = () => api.post("/auth/refresh-token");
export const me = () => api.get("/auth/me");
export const requestForgotPasswordOtp = (payload) => api.post("/auth/forgot-password/request-otp", payload);
export const verifyForgotPasswordOtp = (payload) => api.post("/auth/forgot-password/verify-otp", payload);
export const resetPassword = (payload) => api.post("/auth/forgot-password/reset", payload);
export const resendForgotPasswordOtp = (payload) => api.post("/auth/forgot-password/resend-otp", payload);
