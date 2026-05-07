import { useSelector } from "react-redux";

export default function useChats() {
  return useSelector((state) => state.chats.chats);
}

