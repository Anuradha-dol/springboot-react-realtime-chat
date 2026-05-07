import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export default function useWebSocket(url = "http://localhost:8080/ws") {
  const clientRef = useRef(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(url),
      reconnectDelay: 3000
    });
    client.activate();
    clientRef.current = client;

    return () => client.deactivate();
  }, [url]);

  return clientRef;
}

