import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../config/appConfig";

function resolveMediaUrl(mediaUrl) {
  if (!mediaUrl) return "";
  return mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://") ? mediaUrl : `${API_BASE_URL}${mediaUrl}`;
}

function resolveAssetUrl(url) {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://") ? url : `${API_BASE_URL}${url}`;
}

function hasMentionToken(content) {
  if (!content) return false;
  return /(^|[^A-Za-z0-9_])@[A-Za-z0-9_]{1,50}(?![A-Za-z0-9_])/.test(content);
}

function hasMentionForUser(content, username) {
  if (!content || !username) return false;
  const escaped = String(username).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mentionRegex = new RegExp(`(^|[^A-Za-z0-9_])@${escaped}(?![A-Za-z0-9_])`, "i");
  return mentionRegex.test(content);
}

function renderMessageContent(content) {
  if (!content) return null;
  const mentionRegex = /(^|[^A-Za-z0-9_])(@[A-Za-z0-9_]{1,50})/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const prefix = match[1] || "";
    const mention = match[2] || "";
    const fullMatchStart = match.index;
    const mentionStart = fullMatchStart + prefix.length;

    if (fullMatchStart > lastIndex) {
      parts.push({ text: content.slice(lastIndex, fullMatchStart), mention: false });
    }
    if (prefix) {
      parts.push({ text: prefix, mention: false });
    }
    if (mention) {
      parts.push({ text: mention, mention: true });
    }
    lastIndex = mentionStart + mention.length;
  }

  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), mention: false });
  }

  if (parts.length === 0) {
    return content;
  }

  return parts.map((part, index) =>
    part.mention ? (
      <span key={`mention-${index}`} className="message-mention">
        {part.text}
      </span>
    ) : (
      <span key={`text-${index}`}>{part.text}</span>
    )
  );
}

function renderMedia(message) {
  if (!message.mediaUrl) return null;
  const mediaUrl = resolveMediaUrl(message.mediaUrl);

  if (message.messageType === "IMAGE") {
    return <img src={mediaUrl} alt="chat media" className="message-media-image" />;
  }

  if (message.messageType === "VIDEO") {
    return (
      <video controls className="message-media-video">
        <source src={mediaUrl} />
      </video>
    );
  }

  return (
    <a className="message-file-link" href={mediaUrl} target="_blank" rel="noreferrer">
      Open file
    </a>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.2 7.2 4.8 12l5.4 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.4 12h7.8c3.1 0 5.6 2.5 5.6 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MessageBubble({
  message,
  showSender = false,
  mentionUsername = "",
  onDeleteForMe,
  onDeleteForEveryone,
  onVotePoll,
  onOpenMessageSeenInfo,
  onReplyToMessage
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [voting, setVoting] = useState(false);
  const menuRef = useRef(null);
  const avatarUrl = resolveAssetUrl(message.avatarUrl);

  const canDeleteForEveryone = Boolean(message.mine && onDeleteForEveryone);
  const canDeleteForMe = Boolean(message.mine && onDeleteForMe);
  const canReply = Boolean(onReplyToMessage);
  const canShowActions = canDeleteForMe || canDeleteForEveryone || canReply;
  const canOpenOverflowMenu = canDeleteForMe || canDeleteForEveryone;
  const deleteForMeLabel = showSender ? "Delete message" : "Delete for me";

  const poll = message.messageType === "POLL" ? message.poll : null;
  const pollTotalVotes = Number(poll?.totalVotes || 0);
  const hasMention = hasMentionToken(message.content || "");
  const mentionedCurrentUser = hasMentionForUser(message.content || "", mentionUsername);
  const seenByOthers = showSender && message.mine
    ? (message.seenBy || []).filter((entry) => String(entry.userId) !== String(message.senderId))
    : [];

  const handleVote = async (optionId) => {
    if (!poll || !onVotePoll || voting) return;
    setVoting(true);
    try {
      await onVotePoll(message.groupId, poll.id, optionId);
    } finally {
      setVoting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const actionItems = [];
  if (canDeleteForMe) {
    actionItems.push({
      key: "delete-me",
      label: deleteForMeLabel,
      danger: false,
      onClick: () => {
        onDeleteForMe(message);
        setMenuOpen(false);
      }
    });
  }
  if (canDeleteForEveryone) {
    actionItems.push({
      key: "delete-everyone",
      label: "Delete for everyone",
      danger: true,
      onClick: () => {
        onDeleteForEveryone(message);
        setMenuOpen(false);
      }
    });
  }

  return (
    <div className={`message-row ${message.mine ? "outgoing" : "incoming"}`}>
      <div className="message-avatar" aria-hidden="true">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="message-avatar-image" />
        ) : (
          <span>{message.avatarLabel || "U"}</span>
        )}
      </div>

      <article className={`message-bubble ${message.mine ? "outgoing" : "incoming"}`}>
        {canShowActions ? (
          <div className={`message-bubble-actions ${message.mine ? "mine" : ""}`} ref={menuRef}>
            {canReply ? (
              <button
                type="button"
                className="message-reply-quick"
                title="Reply"
                aria-label="Reply to message"
                onClick={() => onReplyToMessage?.(message)}
              >
                <ReplyIcon />
              </button>
            ) : null}

            {canOpenOverflowMenu ? (
              <button
                type="button"
                className="message-menu-toggle"
                aria-label="Open message actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <MoreIcon />
              </button>
            ) : null}

            {menuOpen && canOpenOverflowMenu ? (
              <div className="message-menu" role="menu">
                {actionItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    className={`message-menu-item ${item.danger ? "danger" : ""}`}
                    onClick={item.onClick}
                  >
                    <span className="message-menu-label">{item.label}</span>
                  </button>
                ))}
                {actionItems.length === 0 ? (
                  <div className="message-menu-empty">No actions</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {showSender && !message.mine ? <p className="message-sender">{message.senderName}</p> : null}
        {showSender && hasMention ? (
          <p className={`message-tag ${mentionedCurrentUser ? "you" : ""}`}>
            <span className="message-tag-icon">@</span>
            {mentionedCurrentUser ? "You were mentioned" : "Mention"}
          </p>
        ) : null}
        {message.replyToMessageId ? (
          <div className="message-reply-preview">
            <p className="message-reply-preview-label">Reply to {message.replyToSenderName || "User"}</p>
            <p className="message-reply-preview-content">{message.replyToContent || "Message"}</p>
          </div>
        ) : null}
        {poll ? (
          <div className="poll-card">
            <div className="poll-header">
              <span className="poll-badge">Poll</span>
              <span className="poll-total">{pollTotalVotes} votes</span>
            </div>
            <p className="poll-question">{poll.question}</p>
            <div className="poll-options">
              {(poll.options || []).map((option) => {
                const optionVotes = Number(option.voteCount || 0);
                const optionPercent = pollTotalVotes > 0 ? Math.round((optionVotes * 100) / pollTotalVotes) : 0;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`poll-option-btn ${option.votedByCurrentUser ? "voted" : ""}`}
                    onClick={() => handleVote(option.id)}
                    disabled={voting}
                  >
                    <div className="poll-option-top">
                      <span className="poll-option-text">{option.optionText}</span>
                      <span className="poll-option-count">{optionPercent}%</span>
                    </div>
                    <span className="poll-option-votes">{optionVotes} votes</span>
                    <div className="poll-option-track">
                      <span
                        className="poll-option-fill"
                        style={{
                          width: `${optionPercent}%`
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {message.content && !poll ? <p className="message-content">{renderMessageContent(message.content)}</p> : null}
        {renderMedia(message)}
        <span className="message-time">
          {message.time}
          {message.mine && !showSender ? ` | ${message.read ? "Read" : "Sent"}` : ""}
        </span>
        {seenByOthers.length > 0 ? (
          <button
            type="button"
            className="message-seen-by"
            onClick={() => onOpenMessageSeenInfo?.(message)}
          >
            Seen by {seenByOthers.length}
          </button>
        ) : null}
      </article>
    </div>
  );
}
