import api from "./axios";

// Legacy chat-room message endpoints keep /messages and add /chats/messages alias.
export const getMessagesByChat = (chatId) => api.get(`/chats/messages/${chatId}`);
export const sendMessage = (payload) => api.post("/chats/messages", payload);
