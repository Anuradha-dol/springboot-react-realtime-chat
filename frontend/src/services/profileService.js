import api from "../api/axios";

// Prefer /users/me endpoints; keep other profile endpoints where needed.
export const getMyProfile = () => api.get("/users/me");
export const getUserProfile = (userId) => api.get(`/profile/users/${userId}`);
export const updateMyProfile = (payload) => api.patch("/users/me", payload);
export const uploadProfilePhoto = (formData) =>
  api.post("/profile/me/profile-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
export const uploadCoverPhoto = (formData) =>
  api.post("/profile/me/cover-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
export const changePassword = (payload) => api.put("/profile/me/password", payload);
// New endpoint keeps account deletion under /users/me.
export const deleteAccount = (payload) => api.delete("/users/me", { data: payload });
export const searchUsers = (query) => api.get("/users", { params: { q: query } });
