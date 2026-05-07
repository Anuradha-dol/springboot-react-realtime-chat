import { createContext, useContext } from "react";
import useWebSocket from "../hooks/useWebSocket";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socket = useWebSocket();
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocketContext() {
  return useContext(SocketContext);
}

