import ChatItem from "./ChatItem";

export default function ChatList({ chats = [], activeChatId, onSelect }) {
  if (chats.length === 0) {
    return <div className="empty-chat-list">No chats found.</div>;
  }

  return (
    <div className="chat-list">
      {chats.map((chat) => (
        <ChatItem key={chat.id} chat={chat} isActive={chat.id === activeChatId} onSelect={onSelect} />
      ))}
    </div>
  );
}
