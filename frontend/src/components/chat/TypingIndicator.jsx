export default function TypingIndicator({ visible }) {
  return (
    <div className="typing-row">
      {visible ? <p className="typing-indicator">Typing...</p> : <p className="typing-indicator placeholder">.</p>}
    </div>
  );
}
