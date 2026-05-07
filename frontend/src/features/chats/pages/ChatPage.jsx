import { useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getMessagesByChat, sendMessage } from "../../../api/messageApi";
import { getUsers } from "../../../api/userApi";
import ChatList from "../../../components/chat/ChatList";
import ChatWindow from "../../../components/chat/ChatWindow";
import MessageInput from "../../../components/chat/MessageInput";
import OnlineStatus from "../../../components/chat/OnlineStatus";
import TypingIndicator from "../../../components/chat/TypingIndicator";
import { logout } from "../../auth/authSlice";

const CHAT_ID = 1;

function formatMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return "";
}

export default function ChatPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const clientRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError("");
        const [usersResponse, messagesResponse] = await Promise.all([getUsers(), getMessagesByChat(CHAT_ID)]);

        const fetchedUsers = Array.isArray(usersResponse.data) ? usersResponse.data : [];
        const fetchedMessages = Array.isArray(messagesResponse.data) ? messagesResponse.data : [];

        setUsers(fetchedUsers);
        setMessages(fetchedMessages);

        const firstOtherUser = fetchedUsers.find((user) => user.id !== auth.user?.id) || fetchedUsers[0] || null;
        setActiveUserId(firstOtherUser?.id || null);
      } catch (err) {
        const apiMessage = err?.response?.data?.message;
        setError(apiMessage || "Failed to load users and messages.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [auth.user?.id]);

  useEffect(() => {
    if (!auth.user?.id) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      reconnectDelay: 3000
    });

    client.onConnect = () => {
      client.subscribe("/topic/messages", (frame) => {
        const incoming = JSON.parse(frame.body);
        setMessages((prev) => {
          if (prev.some((item) => item.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      });
    };

    client.onStompError = () => {
      setError("WebSocket connection error.");
    };

    client.activate();
    clientRef.current = client;

    return () => {
      clientRef.current = null;
      client.deactivate();
    };
  }, [auth.user?.id]);

  const otherUsers = useMemo(() => {
    return users.filter((user) => user.id !== auth.user?.id);
  }, [users, auth.user?.id]);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return otherUsers;
    return otherUsers.filter((user) => {
      const name = (user.displayName || user.username || "").toLowerCase();
      const username = (user.username || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      return name.includes(query) || username.includes(query) || email.includes(query);
    });
  }, [otherUsers, search]);

  const userCards = useMemo(() => {
    return filteredUsers.map((user) => {
      const lastMessage = [...messages].reverse().find((message) => message.senderId === user.id);
      return {
        id: user.id,
        name: user.displayName || user.username,
        lastMessage: lastMessage ? lastMessage.content : user.email || `@${user.username}`,
        lastMessageAt: lastMessage ? formatMessageTime(lastMessage.createdAt) : "",
        unread: 0
      };
    });
  }, [filteredUsers, messages]);

  const activeUser = useMemo(() => {
    return otherUsers.find((user) => user.id === activeUserId) || null;
  }, [otherUsers, activeUserId]);

  const uiMessages = useMemo(() => {
    const validSenderIds = new Set(users.map((user) => user.id));
    if (auth.user?.id) {
      validSenderIds.add(auth.user.id);
    }

    return messages
      .filter((message) => validSenderIds.has(message.senderId))
      .map((message) => ({
        id: message.id,
        fromMe: message.senderId === auth.user?.id,
        senderName: message.senderName || "Unknown",
        content: message.content,
        time: formatMessageTime(message.createdAt)
      }));
  }, [messages, auth.user?.id, users]);

  const handleSend = async (text) => {
    setError("");
    const payload = {
      chatId: CHAT_ID,
      senderId: auth.user?.id,
      content: text
    };

    const client = clientRef.current;
    if (client?.connected) {
      client.publish({
        destination: "/app/chat.send",
        body: JSON.stringify(payload)
      });
      return;
    }

    try {
      const response = await sendMessage(payload);
      const saved = response.data;
      setMessages((prev) => {
        if (prev.some((item) => item.id === saved.id)) return prev;
        return [...prev, saved];
      });
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || "Failed to send message.");
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="chat-shell">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div className="current-user">
            <div className="avatar-badge">
              {(auth.user?.displayName || auth.user?.username || "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="current-user-meta">
              <p className="current-user-name">{auth.user?.displayName || auth.user?.username || "User"}</p>
              <p className="current-user-subtitle">Connected</p>
            </div>
          </div>
          <button type="button" className="ghost-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>

        <div className="chat-search-row">
          <input
            className="chat-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
          />
        </div>

        <ChatList chats={userCards} activeChatId={activeUser?.id} onSelect={setActiveUserId} />
      </aside>

      <section className="chat-main">
        <header className="chat-main-header">
          <div className="chat-main-user">
            <div className="avatar-badge">
              {(activeUser?.displayName || activeUser?.username || "GR").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2>{activeUser?.displayName || activeUser?.username || "General Chat Room"}</h2>
              <OnlineStatus online />
            </div>
          </div>
        </header>

        {loading ? <div className="empty-chat-list">Loading...</div> : <ChatWindow messages={uiMessages} />}
        <TypingIndicator visible={false} />
        {!loading && !activeUser ? (
          <p className="form-error chat-error">No other users found. Register another account to start chatting.</p>
        ) : null}
        {error ? <p className="form-error chat-error">{error}</p> : null}
        <MessageInput onSend={handleSend} onTypingChange={() => {}} disabled={!activeUser} />
      </section>
    </div>
  );
}
