import ChatItem from "./ChatItem";

export default function ChatList({ chats = [] }) {
  return (
    <div>
      {chats.map((chat) => (
        <ChatItem key={chat.id} chat={chat} />
      ))}
    </div>
  );
}

