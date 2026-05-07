import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chats",
  initialState: { chats: [], messages: [] },
  reducers: {
    setChats: (state, action) => {
      state.chats = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    }
  }
});

export const { setChats, setMessages } = chatSlice.actions;
export default chatSlice.reducer;

