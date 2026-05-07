import api from "./axios";

export const getChats = () => api.get("/chats");
export const createChat = (payload) => api.post("/chats", payload);

