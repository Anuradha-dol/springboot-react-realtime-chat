import { createSlice } from "@reduxjs/toolkit";

const storedToken = localStorage.getItem("chatapp_token");
const storedUser = localStorage.getItem("chatapp_user");

const initialState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken || null,
  isAuthenticated: Boolean(storedToken)
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem("chatapp_user", JSON.stringify(action.payload.user));
      localStorage.setItem("chatapp_token", action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("chatapp_user");
      localStorage.removeItem("chatapp_token");
    }
  }
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
