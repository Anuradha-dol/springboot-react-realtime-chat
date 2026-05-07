import { useState } from "react";

export default function MessageInput({ onSend, onTypingChange, disabled = false }) {
  const [text, setText] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText("");
    onTypingChange?.(false);
  };

  const handleChange = (event) => {
    const value = event.target.value;
    setText(value);
    onTypingChange?.(value.trim().length > 0);
  };

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <button type="button" className="icon-btn" aria-label="Attach file">
        +
      </button>
      <input
        value={text}
        onChange={handleChange}
        placeholder={disabled ? "Select another user to chat" : "Type a message"}
        disabled={disabled}
      />
      <button type="submit" className="primary-btn compact" disabled={disabled}>
        Send
      </button>
    </form>
  );
}
