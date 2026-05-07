import { API_BASE_URL } from "../../config/appConfig";

function formatLastMessageAt(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const now = new Date();
  const sameDay =
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate();

  if (sameDay) {
    return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupMemberCount(group) {
  if (typeof group?.memberCount === "number") return group.memberCount;
  return Array.isArray(group?.members) ? group.members.length : 0;
}

function groupOnlineCount(group) {
  if (!Array.isArray(group?.members)) return 0;
  return group.members.filter((member) => member.online).length;
}

function groupUnreadCount(group) {
  if (typeof group?.unreadCount === "number" && Number.isFinite(group.unreadCount)) {
    return Math.max(0, group.unreadCount);
  }
  return 0;
}

function resolveImageUrl(value) {
  if (!value) return "";
  return value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("blob:")
    || value.startsWith("data:")
    ? value
    : `${API_BASE_URL}${value}`;
}

function avatarLabel(value, fallback = "U") {
  const text = (value || "").trim();
  if (!text) return fallback;
  return text.slice(0, 2).toUpperCase();
}

function groupAlertMarker(group) {
  if ((group?.mentionAlertKind || "").toLowerCase() === "reply") return "R";
  if ((group?.mentionAlertKind || "").toLowerCase() === "added") return "+";
  return "@";
}

function groupPreview(group) {
  const alertText = (group?.mentionAlertText || "").trim();
  if (alertText) {
    return `${groupAlertMarker(group)} ${alertText}`;
  }
  const preview = (group?.lastMessage || "").trim();
  if (preview) return preview;
  const description = (group?.description || "").trim();
  if (description) return description;
  return "No messages yet";
}

function groupHasRealtimeAlert(group) {
  return Boolean((group?.mentionAlertText || "").trim());
}

function sameGroupId(a, b) {
  return String(a ?? "") === String(b ?? "");
}

export default function ChatSidebar({
  mode,
  onModeChange,
  search,
  onSearchChange,
  conversations,
  groups,
  activePrivateUserId,
  activeGroupId,
  onSelectPrivate,
  onSelectGroup,
  onCreateGroup
}) {
  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar-top">
        <div className="mode-toggle">
          <button type="button" className={mode === "private" ? "active" : ""} onClick={() => onModeChange("private")}>
            Chats
          </button>
          <button type="button" className={mode === "group" ? "active" : ""} onClick={() => onModeChange("group")}>
            Groups
          </button>
        </div>
        <input
          className="chat-search"
          type="search"
          placeholder={mode === "private" ? "Search users or chats" : "Search groups"}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="chat-list">
        {mode === "private"
          ? conversations.map((item) => {
              const privateAvatarUrl = resolveImageUrl(item.profileImageUrl || "");
              return (
                <button
                  key={item.userId}
                  type="button"
                  className={`chat-item ${activePrivateUserId === item.userId ? "active" : ""}`}
                  onClick={() => onSelectPrivate(item.userId)}
                >
                  <div className="chat-item-avatar">
                    {privateAvatarUrl ? (
                      <img
                        src={privateAvatarUrl}
                        alt={item.displayName || item.username || "User"}
                        className="chat-item-avatar-image"
                      />
                    ) : (
                      avatarLabel(item.displayName || item.username || "U", "U")
                    )}
                  </div>
                  <div className="chat-item-content">
                    <p className="chat-item-name">
                      {item.displayName || item.username}
                      {item.online ? <span className="status-dot online" /> : <span className="status-dot" />}
                    </p>
                    <p className="chat-item-preview">{item.lastMessage || "No messages yet"}</p>
                  </div>
                  <div className="chat-item-meta">
                    <span>{formatLastMessageAt(item.lastMessageAt)}</span>
                    {item.unread ? <span className="unread-badge">1</span> : null}
                  </div>
                </button>
              );
            })
          : groups.map((group) => {
              const groupAvatarUrl = resolveImageUrl(group.groupImageUrl || "");
              return (
                <button
                  key={group.id}
                  type="button"
                  className={`chat-item ${sameGroupId(activeGroupId, group.id) ? "active" : ""}`}
                  onClick={() => onSelectGroup(group.id)}
                >
                  <div className="chat-item-avatar">
                    {groupAvatarUrl ? (
                      <img
                        src={groupAvatarUrl}
                        alt={group.groupName || "Group"}
                        className="chat-item-avatar-image"
                      />
                    ) : (
                      avatarLabel(group.groupName || "G", "G")
                    )}
                  </div>
                  <div className="chat-item-content">
                    <p className="chat-item-name">
                      {group.groupName}
                      {group.currentUserAdmin ? <span className="admin-badge">ADMIN</span> : null}
                      {groupHasRealtimeAlert(group) ? <span className="mention-state-badge">{groupAlertMarker(group)}</span> : null}
                    </p>
                    <p className={`chat-item-preview ${groupHasRealtimeAlert(group) ? "mention-alert-preview" : ""}`}>{groupPreview(group)}</p>
                  </div>
                  <div className="chat-item-meta group-item-meta">
                    <span>{formatLastMessageAt(group.lastMessageAt)}</span>
                    <span>{groupOnlineCount(group)} online | {groupMemberCount(group)} members</span>
                    {groupUnreadCount(group) > 0 ? (
                      <span className="unread-badge">{groupUnreadCount(group) > 99 ? "99+" : groupUnreadCount(group)}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
      </div>

      {mode === "group" ? (
        <div className="chat-sidebar-bottom">
          <button type="button" className="primary-btn small" onClick={onCreateGroup}>
            Create Group
          </button>
        </div>
      ) : null}
    </aside>
  );
}
