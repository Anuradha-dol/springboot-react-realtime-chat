import { useSelector } from "react-redux";

export default function useMessages() {
  return useSelector((state) => state.chats.messages);
}

