import api from "../api/axios";

// Private chat endpoints now use cleaner /chats/private aliases.
export const getConversations = () => api.get("/chats/private/conversations");
export const getPrivateMessages = (userId) => api.get(`/chats/private/${userId}/messages`);
export const sendPrivateText = (payload) => api.post("/chats/private/messages/text", payload);
export const sendPrivateMedia = (payload) => api.post("/chats/private/messages/media", payload);
export const markPrivateMessageRead = (messageId) => api.patch(`/chats/private/${messageId}/read`);
export const deleteMessageForMe = (messageId) => api.delete(`/chats/private/${messageId}/me`);
export const deleteMessageForEveryone = (messageId) => api.delete(`/chats/private/${messageId}/everyone`);

export const uploadChatImage = (formData, onUploadProgress) =>
  api.post("/uploads/chat/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress
  });

export const uploadChatVideo = (formData, onUploadProgress) =>
  api.post("/uploads/chat/video", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress
  });
