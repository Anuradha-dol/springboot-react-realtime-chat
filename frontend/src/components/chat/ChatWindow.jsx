import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

export default function ChatWindow({ messages = [] }) {
  return (
    <section>
      <div>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
      <MessageInput />
    </section>
  );
}

