import api from "./axios";

export const getMedia = () => api.get("/media");

