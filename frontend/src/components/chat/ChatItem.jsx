export default function ChatItem({ chat, isActive, onSelect }) {
  return (
    <button
      type="button"
      className={`chat-item ${isActive ? "active" : ""}`}
      onClick={() => onSelect(chat.id)}
      title={chat.name}
    >
      <div className="avatar-badge small">{chat.name.slice(0, 2).toUpperCase()}</div>
      <div className="chat-item-content">
        <div className="chat-item-row">
          <span className="chat-item-name">{chat.name}</span>
          <span className="chat-item-time">{chat.lastMessageAt}</span>
        </div>
        <div className="chat-item-row">
          <span className="chat-item-message">{chat.lastMessage}</span>
          {chat.unread > 0 ? <span className="chat-item-unread">{chat.unread}</span> : null}
        </div>
      </div>
    </button>
  );
}
