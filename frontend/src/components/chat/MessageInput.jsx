import { useState } from "react";

export default function MessageInput() {
  const [text, setText] = useState("");
  return (
    <form>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type..." />
      <button type="submit">Send</button>
    </form>
  );
}

