import api from "./axios";

// Keep legacy user APIs and expose new /users/me helpers.
export const getUsers = () => api.get("/users");
export const getUserById = (id) => api.get(`/users/${id}`);
export const updateProfile = (id, payload) => api.put(`/users/${id}/profile`, payload);
export const getMe = () => api.get("/users/me");
export const updateMe = (payload) => api.patch("/users/me", payload);
export const deleteAccount = (payload) => api.delete("/users/me", { data: payload });
