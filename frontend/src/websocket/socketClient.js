import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_ENDPOINT_URL } from "../config/appConfig";

class SocketClient {
  constructor() {
    this.client = null;
    this.groupSubscriptions = new Map();
    this.connectionErrorTimer = null;
  }

  clearDeferredConnectionError() {
    if (this.connectionErrorTimer) {
      clearTimeout(this.connectionErrorTimer);
      this.connectionErrorTimer = null;
    }
  }

  deferConnectionError(message, onConnectionIssue) {
    this.clearDeferredConnectionError();
    this.connectionErrorTimer = setTimeout(() => {
      this.connectionErrorTimer = null;
      if (this.client?.active && !this.client?.connected) {
        onConnectionIssue?.(message);
      }
    }, 1200);
  }

  connect({ token, onPrivateMessage, onTyping, onPresence, onGroupEvent, onConnected, onConnectionIssue }) {
    if (this.client?.active) {
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT_URL),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 2500,
      connectionTimeout: 8000,
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000
    });

    this.client.onConnect = () => {
      this.clearDeferredConnectionError();
      onConnected?.();
      this.client.subscribe("/user/queue/private-messages", (frame) => {
        onPrivateMessage?.(JSON.parse(frame.body));
      });
      this.client.subscribe("/user/queue/typing", (frame) => {
        onTyping?.(JSON.parse(frame.body));
      });
      this.client.subscribe("/topic/presence", (frame) => {
        onPresence?.(JSON.parse(frame.body));
      });
      this.client.subscribe("/user/queue/group-events", (frame) => {
        onGroupEvent?.(JSON.parse(frame.body));
      });
    };

    this.client.onStompError = (frame) => {
      onConnectionIssue?.(frame.headers?.message || "Realtime connection failed.");
    };

    this.client.onWebSocketError = () => {
      this.deferConnectionError("Realtime connection error. Reconnecting...", onConnectionIssue);
    };

    this.client.onWebSocketClose = (event) => {
      if (!this.client?.active || event?.code === 1000) return;
      this.deferConnectionError("Realtime disconnected. Reconnecting...", onConnectionIssue);
    };

    this.client.activate();
  }

  subscribeGroup(groupId, onGroupMessage, onGroupTyping, onGroupSeen, onPollUpdated, onMessageDeleted) {
    if (!this.client?.connected || this.groupSubscriptions.has(groupId)) {
      return;
    }

    const messageSub = this.client.subscribe(`/topic/group/${groupId}`, (frame) => {
      onGroupMessage?.(groupId, JSON.parse(frame.body));
    });

    const typingSub = this.client.subscribe(`/topic/group/${groupId}/typing`, (frame) => {
      onGroupTyping?.(groupId, JSON.parse(frame.body));
    });

    const seenSub = this.client.subscribe(`/topic/group/${groupId}/message-seen`, (frame) => {
      onGroupSeen?.(groupId, JSON.parse(frame.body));
    });

    const pollSub = this.client.subscribe(`/topic/group/${groupId}/polls`, (frame) => {
      onPollUpdated?.(groupId, JSON.parse(frame.body));
    });

    const deletedSub = this.client.subscribe(`/topic/group/${groupId}/message-deleted`, (frame) => {
      onMessageDeleted?.(groupId, JSON.parse(frame.body));
    });

    this.groupSubscriptions.set(groupId, [messageSub, typingSub, seenSub, pollSub, deletedSub]);
  }

  unsubscribeGroup(groupId) {
    const subscriptions = this.groupSubscriptions.get(groupId);
    if (!subscriptions) return;
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.groupSubscriptions.delete(groupId);
  }

  sendPrivateTyping(targetUserId, typing) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: "/app/typing/private",
      body: JSON.stringify({ targetUserId, typing })
    });
  }

  sendGroupTyping(groupId, typing) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: "/app/typing/group",
      body: JSON.stringify({ groupId, typing })
    });
  }

  disconnect() {
    if (!this.client) return;
    this.clearDeferredConnectionError();
    this.groupSubscriptions.forEach((subscriptions) => subscriptions.forEach((sub) => sub.unsubscribe()));
    this.groupSubscriptions.clear();
    this.client.deactivate();
    this.client = null;
  }
}

const socketClient = new SocketClient();
export default socketClient;
