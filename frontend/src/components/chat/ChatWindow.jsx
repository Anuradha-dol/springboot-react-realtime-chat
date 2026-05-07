import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({
  messages = [],
  showSender = false,
  emptyLabel = "Select a chat to start messaging.",
  mentionUsername = "",
  onDeleteForMe,
  onDeleteForEveryone,
  onVotePoll,
  onOpenMessageSeenInfo,
  onReplyToMessage,
  wallpaper
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const wallpaperStyle = wallpaper
    ? {
        "--chat-wallpaper-image": `url("${wallpaper.src}")`,
        "--chat-wallpaper-repeat": wallpaper.repeat || "repeat",
        "--chat-wallpaper-size": wallpaper.size || "360px auto",
        "--chat-wallpaper-position": wallpaper.position || "top left",
        "--chat-wallpaper-overlay": wallpaper.overlay || "rgba(4, 12, 18, 0.7)"
      }
    : undefined;

  return (
    <section className="chat-window" style={wallpaperStyle}>
      <div className="messages">
        {messages.length === 0 ? <div className="empty-chat-screen">{emptyLabel}</div> : null}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            showSender={showSender}
            mentionUsername={mentionUsername}
            onDeleteForMe={onDeleteForMe}
            onDeleteForEveryone={onDeleteForEveryone}
            onVotePoll={onVotePoll}
            onOpenMessageSeenInfo={onOpenMessageSeenInfo}
            onReplyToMessage={onReplyToMessage}
          />
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
