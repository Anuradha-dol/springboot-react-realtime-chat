import api from "./axios";

export const getMessagesByChat = (chatId) => api.get(`/messages/chat/${chatId}`);
export const sendMessage = (payload) => api.post("/messages", payload);

