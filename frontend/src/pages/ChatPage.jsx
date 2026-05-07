import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatWindow from "../components/chat/ChatWindow";
import MediaUpload from "../components/chat/MediaUpload";
import CreateGroupModal from "../components/group/CreateGroupModal";
import GroupInfo from "../components/group/GroupInfo";
import { logoutApi } from "../api/authApi";
import {
  deleteMessageForEveryone,
  deleteMessageForMe,
  getConversations,
  getPrivateMessages,
  markPrivateMessageRead,
  sendPrivateMedia,
  sendPrivateText,
  uploadChatImage,
  uploadChatVideo
} from "../services/chatService";
import {
  addGroupMembers,
  createGroupPoll,
  createGroup,
  deleteOwnGroupMessage,
  getGroupDetails,
  getGroupMembers,
  getGroupMessages,
  getMyGroups,
  leaveGroup,
  markGroupMessagesSeen,
  removeGroupMember,
  sendGroupMessage,
  updateGroupMemberRole,
  updateGroupProfile,
  uploadGroupImage,
  voteGroupPoll
} from "../services/groupService";
import { searchUsers } from "../services/profileService";
import socketClient from "../websocket/socketClient";
import { logout } from "../features/auth/authSlice";
import {
  CHAT_WALLPAPERS,
  CHAT_WALLPAPER_STORAGE_KEY,
  DEFAULT_CHAT_WALLPAPER_ID
} from "../constants/chatWallpapers";
import { API_BASE_URL } from "../config/appConfig";

const CHAT_MODE_STORAGE_KEY = "chatapp_mode";
const CHAT_SELECTED_PRIVATE_STORAGE_KEY = "chatapp_selected_private_user_id";
const CHAT_SELECTED_GROUP_STORAGE_KEY = "chatapp_selected_group_id";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? [];
}

function timeLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toMessageId(id) {
  return id == null ? "" : String(id);
}

function toGroupId(id) {
  return id == null ? "" : String(id);
}

function toStoredNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sameMessageId(a, b) {
  return toMessageId(a) === toMessageId(b);
}

function sameGroupId(a, b) {
  return toGroupId(a) === toGroupId(b);
}

function upsertMessage(messages, message) {
  const index = messages.findIndex((item) => sameMessageId(item.id, message.id));
  if (index < 0) {
    return [...messages, message];
  }
  const next = [...messages];
  next[index] = { ...next[index], ...message };
  return next;
}

function avatarLabel(name) {
  const normalized = (name || "").trim();
  if (!normalized) return "U";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return normalized.slice(0, 2).toUpperCase();
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

function errorMessage(err, fallback) {
  return err?.userFriendlyMessage || err?.response?.data?.message || fallback;
}

function upsertGroup(groups, group) {
  if (!group?.id) return groups;
  const incomingMembers = Array.isArray(group?.members) ? group.members : [];
  const index = groups.findIndex((item) => sameGroupId(item.id, group.id));
  if (index < 0) {
    return [group, ...groups];
  }

  const existing = groups[index];
  const existingMembers = Array.isArray(existing?.members) ? existing.members : [];
  const shouldKeepExistingMembers = existingMembers.length > 0 && incomingMembers.length === 0;
  const mergedGroup = shouldKeepExistingMembers
    ? {
        ...group,
        members: existingMembers,
        memberCount: Math.max(
          typeof group.memberCount === "number" ? group.memberCount : 0,
          existingMembers.length
        )
      }
    : group;

  const next = [...groups];
  next[index] = mergedGroup;
  return next;
}

function mergeGroups(groups) {
  const list = Array.isArray(groups) ? groups : [];
  let merged = [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    merged = upsertGroup(merged, list[i]);
  }
  return merged;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasMentionForUsername(content, username) {
  if (!content || !username) return false;
  const mentionRegex = new RegExp(`(^|[^A-Za-z0-9_])@${escapeRegExp(username)}(?![A-Za-z0-9_])`, "i");
  return mentionRegex.test(content);
}

function membersForGroup(group) {
  return Array.isArray(group?.members) ? group.members : [];
}

function memberCountForGroup(group) {
  if (!group) return 0;
  if (typeof group.memberCount === "number") return group.memberCount;
  return membersForGroup(group).length;
}

function onlineCountForGroup(group) {
  return membersForGroup(group).filter((member) => member.online).length;
}

function mergeSeenBy(existing = [], incoming = []) {
  const map = new Map();
  [...existing, ...incoming].forEach((entry) => {
    if (!entry?.userId) return;
    map.set(entry.userId, entry);
  });
  return Array.from(map.values()).sort((a, b) => new Date(a.seenAt || 0) - new Date(b.seenAt || 0));
}

function messagePreviewText(message) {
  if (!message) return "";
  const content = (message.content || "").trim();
  if (content) return content;
  if (message.messageType === "IMAGE") return "Photo";
  if (message.messageType === "VIDEO") return "Video";
  if (message.messageType === "FILE") return "File";
  if (message.messageType === "POLL") return message.poll?.question || "Poll";
  return "Message";
}

function groupListPreviewText(message, currentUserId) {
  if (!message) return "";
  const senderPrefix = Number(message.senderId) === Number(currentUserId)
    ? "You"
    : (message.senderName || "Member");
  return `${senderPrefix}: ${messagePreviewText(message)}`;
}

function extractMentionQuery(value, caretIndex) {
  if (typeof value !== "string" || typeof caretIndex !== "number") return null;
  if (caretIndex < 0 || caretIndex > value.length) return null;

  const prefix = value.slice(0, caretIndex);
  const atIndex = prefix.lastIndexOf("@");
  if (atIndex < 0) return null;

  if (atIndex > 0 && /[A-Za-z0-9_]/.test(prefix[atIndex - 1])) {
    return null;
  }

  const query = prefix.slice(atIndex + 1);
  if (query.length > 50) return null;
  if (!/^[A-Za-z0-9_]*$/.test(query)) return null;

  return {
    start: atIndex,
    end: caretIndex,
    query: query.toLowerCase()
  };
}

function WallpaperIcon() {
  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="8.3" cy="9" r="1.4" />
      <path d="m4.8 16.2 4-3.8 2.9 2.8 2.5-2.2 4.8 3.2" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.2v6" />
      <circle cx="12" cy="7.5" r="0.9" />
    </svg>
  );
}

function PollIcon() {
  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6.5h14" />
      <path d="M5 11.5h9" />
      <path d="M5 16.5h6.5" />
      <circle cx="17.5" cy="16.5" r="2.2" />
    </svg>
  );
}

export default function ChatPage() {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem(CHAT_MODE_STORAGE_KEY);
    return saved === "group" ? "group" : "private";
  });
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedPrivateUserId, setSelectedPrivateUserId] = useState(() =>
    toStoredNumber(localStorage.getItem(CHAT_SELECTED_PRIVATE_STORAGE_KEY))
  );
  const [selectedGroupId, setSelectedGroupId] = useState(() =>
    toStoredNumber(localStorage.getItem(CHAT_SELECTED_GROUP_STORAGE_KEY))
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [inputCaretIndex, setInputCaretIndex] = useState(0);
  const [mentionFocusIndex, setMentionFocusIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [socketError, setSocketError] = useState("");
  const [toast, setToast] = useState("");
  const [messageSeenInfo, setMessageSeenInfo] = useState(null);
  const [typingText, setTypingText] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showWallpaperPanel, setShowWallpaperPanel] = useState(false);
  const [showQuickPollComposer, setShowQuickPollComposer] = useState(false);
  const [quickPollQuestion, setQuickPollQuestion] = useState("");
  const [quickPollOptions, setQuickPollOptions] = useState(["", ""]);
  const [creatingQuickPoll, setCreatingQuickPoll] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [pendingPrivateChatMember, setPendingPrivateChatMember] = useState(null);
  const [privateChatConfirmReady, setPrivateChatConfirmReady] = useState(false);
  const [groupRealtimeAlerts, setGroupRealtimeAlerts] = useState({});
  const [selectedWallpaperId, setSelectedWallpaperId] = useState(() => {
    const saved = localStorage.getItem(CHAT_WALLPAPER_STORAGE_KEY);
    return saved || DEFAULT_CHAT_WALLPAPER_ID;
  });
  const selectedPrivateUserIdRef = useRef(selectedPrivateUserId);
  const selectedGroupIdRef = useRef(selectedGroupId);
  const modeRef = useRef(mode);
  const usersRef = useRef(users);
  const messageInputRef = useRef(null);
  const realtimeToastRef = useRef({ message: "", expiresAt: 0 });
  const realtimeToastTimerRef = useRef(null);
  const privateChatConfirmTimerRef = useRef(null);

  useEffect(() => {
    selectedPrivateUserIdRef.current = selectedPrivateUserId;
  }, [selectedPrivateUserId]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const showRealtimeToast = useCallback((message) => {
    if (!message) return;
    const now = Date.now();
    if (realtimeToastRef.current.message === message && now < realtimeToastRef.current.expiresAt) {
      return;
    }
    realtimeToastRef.current = {
      message,
      expiresAt: now + 2800
    };
    setToast(message);
    if (realtimeToastTimerRef.current) {
      clearTimeout(realtimeToastTimerRef.current);
    }
    realtimeToastTimerRef.current = setTimeout(() => {
      setToast((current) => (current === message ? "" : current));
    }, 2800);
  }, []);

  const setGroupRealtimeAlert = useCallback((groupId, kind, text) => {
    const key = toGroupId(groupId);
    if (!key) return;
    setGroupRealtimeAlerts((prev) => {
      const next = {
        kind: kind || "mention",
        text: text || (kind === "reply" ? "Someone replied to you" : "You were mentioned")
      };
      const current = prev[key];
      if (current?.kind === next.kind && current?.text === next.text) {
        return prev;
      }
      return {
        ...prev,
        [key]: next
      };
    });
  }, []);

  const clearGroupRealtimeAlert = useCallback((groupId) => {
    const key = toGroupId(groupId);
    if (!key) return;
    setGroupRealtimeAlerts((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (realtimeToastTimerRef.current) {
        clearTimeout(realtimeToastTimerRef.current);
      }
      if (privateChatConfirmTimerRef.current) {
        clearTimeout(privateChatConfirmTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (selectedPrivateUserId == null) {
      localStorage.removeItem(CHAT_SELECTED_PRIVATE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(CHAT_SELECTED_PRIVATE_STORAGE_KEY, String(selectedPrivateUserId));
  }, [selectedPrivateUserId]);

  useEffect(() => {
    if (selectedGroupId == null) {
      localStorage.removeItem(CHAT_SELECTED_GROUP_STORAGE_KEY);
      return;
    }
    localStorage.setItem(CHAT_SELECTED_GROUP_STORAGE_KEY, String(selectedGroupId));
  }, [selectedGroupId]);

  useEffect(() => {
    if (mode !== "group" || !selectedGroupId) return;
    clearGroupRealtimeAlert(selectedGroupId);
  }, [mode, selectedGroupId, clearGroupRealtimeAlert]);

  useEffect(() => {
    setGroupRealtimeAlerts((prev) => {
      const keys = new Set(groups.map((group) => toGroupId(group.id)).filter(Boolean));
      let changed = false;
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (!keys.has(key)) {
          changed = true;
          return;
        }
        next[key] = value;
      });
      return changed ? next : prev;
    });
  }, [groups]);

  useEffect(() => {
    if (mode !== "group") {
      setShowGroupInfo(false);
      setMessageSeenInfo(null);
      setShowQuickPollComposer(false);
      setReplyTarget(null);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "group") return;
    setQuickPollQuestion("");
    setQuickPollOptions(["", ""]);
    setCreatingQuickPoll(false);
    setShowQuickPollComposer(false);
    setReplyTarget(null);
  }, [mode, selectedGroupId]);

  useEffect(() => {
    if (mode !== "private") return;
    setReplyTarget(null);
  }, [mode, selectedPrivateUserId]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [conversationsRes, groupsRes, usersRes] = await Promise.all([
          getConversations(),
          getMyGroups(),
          searchUsers("")
        ]);
        const conversationList = unwrap(conversationsRes);
        const groupListRaw = unwrap(groupsRes);
        const groupList = await Promise.all(
          groupListRaw.map(async (group) => {
            if (!group?.id) return group;
            try {
              const detailsRes = await getGroupDetails(group.id);
              const details = unwrap(detailsRes);
              if (Array.isArray(details?.members) && details.members.length > 0) {
                return details;
              }
              try {
                const membersRes = await getGroupMembers(group.id);
                const members = unwrap(membersRes);
                if (Array.isArray(members) && members.length > 0) {
                  return {
                    ...details,
                    members,
                    memberCount: Math.max(typeof details.memberCount === "number" ? details.memberCount : 0, members.length)
                  };
                }
              } catch {
                // keep base details
              }
              return details;
            } catch {
              return group;
            }
          })
        );
        const allUsers = unwrap(usersRes).filter((user) => user.id !== auth.user?.id);

        const conversationMap = new Map(conversationList.map((item) => [item.userId, item]));
        allUsers.forEach((user) => {
          if (!conversationMap.has(user.id)) {
            conversationMap.set(user.id, {
              userId: user.id,
              username: user.username,
              displayName: user.displayName,
              profileImageUrl: user.profileImageUrl,
              lastMessage: "",
              lastMessageAt: "",
              unread: false,
              online: user.online,
              lastSeen: user.lastSeen
            });
          }
        });

        const mergedConversations = Array.from(conversationMap.values());
        const rememberedPrivateUserId = toStoredNumber(localStorage.getItem(CHAT_SELECTED_PRIVATE_STORAGE_KEY));
        const rememberedGroupId = toStoredNumber(localStorage.getItem(CHAT_SELECTED_GROUP_STORAGE_KEY));

        setConversations(mergedConversations);
        setGroups(mergeGroups(groupList));
        setUsers(allUsers);

        const hasRememberedPrivate = rememberedPrivateUserId != null
          && mergedConversations.some((item) => item.userId === rememberedPrivateUserId);
        const hasRememberedGroup = rememberedGroupId != null
          && groupList.some((group) => sameGroupId(group.id, rememberedGroupId));

        if (hasRememberedPrivate) {
          setSelectedPrivateUserId(rememberedPrivateUserId);
        } else if (mergedConversations.length > 0) {
          setSelectedPrivateUserId(mergedConversations[0].userId);
        } else {
          setSelectedPrivateUserId(null);
        }

        if (mode === "group") {
          if (hasRememberedGroup) {
            setSelectedGroupId(rememberedGroupId);
          } else {
            setSelectedGroupId(groupList[0]?.id ?? null);
          }
        }
      } catch (err) {
        setError(err.userFriendlyMessage || err?.response?.data?.message || "Failed to load chat data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [auth.user?.id]);

  useEffect(() => {
    const token = auth.token || localStorage.getItem("chatapp_token");
    socketClient.connect({
      token,
      onPrivateMessage: (incoming) => {
        setConversations((prev) => {
          const otherUserId = incoming.senderId === auth.user?.id ? incoming.receiverId : incoming.senderId;
          const privatePreview = messagePreviewText(incoming);
          const next = [...prev];
          const index = next.findIndex((item) => item.userId === otherUserId);
          const userMeta = index >= 0 ? next[index] : usersRef.current.find((user) => user.id === otherUserId);
          const normalized = {
            ...(userMeta || {}),
            userId: otherUserId,
            lastMessage: privatePreview,
            lastMessageAt: timeLabel(incoming.createdAt),
            unread: incoming.receiverId === auth.user?.id && !incoming.mine
          };
          if (index >= 0) {
            next.splice(index, 1);
            next.unshift(normalized);
          } else {
            next.unshift(normalized);
          }
          return next;
        });

        const isSelected =
          (incoming.senderId === selectedPrivateUserIdRef.current && incoming.receiverId === auth.user?.id) ||
          (incoming.receiverId === selectedPrivateUserIdRef.current && incoming.senderId === auth.user?.id);

        if (isSelected) {
          const normalizedIncoming = normalizePrivateMessage(incoming);
          setMessages((prev) => {
            return upsertMessage(prev, normalizedIncoming);
          });
          if (!incoming.mine && incoming.receiverId === auth.user?.id) {
            markPrivateMessageRead(incoming.id).catch(() => {});
          }
        }
      },
      onTyping: (event) => {
        if (event.fromUserId === selectedPrivateUserId) {
          setTypingText(event.typing ? "typing..." : "");
        }
      },
      onPresence: (event) => {
        setConversations((prev) =>
          prev.map((item) =>
            item.userId === event.userId ? { ...item, online: event.online, lastSeen: event.lastSeen } : item
          )
        );
        setUsers((prev) =>
          prev.map((item) =>
            item.id === event.userId ? { ...item, online: event.online, lastSeen: event.lastSeen } : item
          )
        );
        setGroups((prev) =>
          mergeGroups(prev.map((group) => {
            const members = membersForGroup(group);
            if (members.length === 0) return group;
            let changed = false;
            const nextMembers = members.map((member) => {
              if (member.userId !== event.userId) return member;
              changed = true;
              return { ...member, online: event.online, lastSeen: event.lastSeen };
            });
            return changed ? { ...group, members: nextMembers } : group;
          }))
        );
      },
      onGroupEvent: (event) => {
        if (!event?.groupId) return;
        if (event.type === "GROUP_REMOVED") {
          setGroups((prev) => prev.filter((group) => !sameGroupId(group.id, event.groupId)));
          clearGroupRealtimeAlert(event.groupId);
          if (sameGroupId(selectedGroupIdRef.current, event.groupId)) {
            setSelectedGroupId(null);
            setMessages([]);
            setShowGroupInfo(false);
          }
          return;
        }

        if (event.type === "MENTION") {
          if (event.targetUserId && Number(event.targetUserId) !== Number(auth.user?.id)) {
            return;
          }
          setGroupRealtimeAlert(event.groupId, "mention", "You were mentioned");
          showRealtimeToast(event.message || "You are mentioned in a group.");
          return;
        }

        if (event.type === "REPLY") {
          if (event.targetUserId && Number(event.targetUserId) !== Number(auth.user?.id)) {
            return;
          }
          setGroupRealtimeAlert(event.groupId, "reply", "Someone replied to you");
          showRealtimeToast(event.message || "Someone replied to your message in a group.");
          return;
        }

        if (event.group) {
          setGroups((prev) => mergeGroups(upsertGroup(prev, event.group)));
        }
        if (sameGroupId(event.groupId, selectedGroupIdRef.current)) {
          refreshGroup(event.groupId).catch(() => {});
        }
      },
      onConnected: () => setSocketError(""),
      onConnectionIssue: (message) => setSocketError(message)
    });

    return () => socketClient.disconnect();
  }, [auth.token, auth.user?.id, clearGroupRealtimeAlert, setGroupRealtimeAlert, showRealtimeToast]);

  useEffect(() => {
    groups.forEach((group) => {
      socketClient.subscribeGroup(
        group.id,
        (groupId, incoming) => {
          const normalizedIncoming = normalizeGroupMessage(incoming, auth.user?.id);
          const groupMeta = groups.find((item) => sameGroupId(item.id, groupId));
          const groupName = groupMeta?.groupName || "group chat";
          const isActiveOpenGroup = modeRef.current === "group" && sameGroupId(groupId, selectedGroupIdRef.current);
          const senderName = normalizedIncoming.senderName || "Someone";
          const isReplyForMe = Number(normalizedIncoming.replyToSenderId) === Number(auth.user?.id);
          const isMentionForMe = hasMentionForUsername(normalizedIncoming.content || "", auth.user?.username);

          if (!normalizedIncoming.mine && (isReplyForMe || isMentionForMe)) {
            if (isReplyForMe) {
              setGroupRealtimeAlert(groupId, "reply", "Someone replied to you");
              showRealtimeToast(`${senderName} replied to your message in ${groupName}.`);
            } else {
              setGroupRealtimeAlert(groupId, "mention", "You were mentioned");
              showRealtimeToast(`${senderName} mentioned you in ${groupName}.`);
            }
          }

          setGroups((prev) =>
            mergeGroups(prev.map((group) => {
              if (!sameGroupId(group.id, groupId)) return group;
              const baseCount = typeof group.messageCount === "number" ? group.messageCount : 0;
              const baseUnread = typeof group.unreadCount === "number" ? group.unreadCount : 0;
              return {
                ...group,
                lastMessage: groupListPreviewText(normalizedIncoming, auth.user?.id),
                lastMessageAt: normalizedIncoming.createdAt,
                messageCount: Math.max(1, baseCount + 1),
                unreadCount: normalizedIncoming.mine || isActiveOpenGroup ? 0 : baseUnread + 1
              };
            }))
          );

          if (!isActiveOpenGroup) {
            return;
          }

          clearGroupRealtimeAlert(groupId);

          setMessages((prev) => {
            return upsertMessage(prev, normalizedIncoming);
          });
          if (!normalizedIncoming.mine) {
            markGroupMessagesSeen(groupId, [Number(normalizedIncoming.id)]).catch(() => {});
          }
        },
        (groupId, typingEvent) => {
          if (modeRef.current !== "group") return;
          if (sameGroupId(groupId, selectedGroupIdRef.current) && typingEvent.fromUserId !== auth.user?.id) {
            setTypingText(typingEvent.typing ? `${typingEvent.fromUsername} typing...` : "");
          }
        },
        (groupId, seenEvent) => {
          if (modeRef.current !== "group") return;
          if (!sameGroupId(groupId, selectedGroupIdRef.current) || !seenEvent?.messageId || !seenEvent?.seenBy) {
            return;
          }
          setMessages((prev) =>
            prev.map((item) =>
              sameMessageId(item.id, seenEvent.messageId)
                ? { ...item, seenBy: mergeSeenBy(item.seenBy, [seenEvent.seenBy]) }
                : item
            )
          );
        },
        (groupId, pollEvent) => {
          if (modeRef.current !== "group") return;
          if (!sameGroupId(groupId, selectedGroupIdRef.current) || !pollEvent?.messageId || !pollEvent?.poll) {
            return;
          }
          setMessages((prev) =>
            prev.map((item) =>
              sameMessageId(item.id, pollEvent.messageId)
                ? { ...item, poll: pollEvent.poll, messageType: "POLL" }
                : item
            )
          );
        },
        (groupId, deletedEvent) => {
          if (!deletedEvent?.messageId) {
            return;
          }
          setGroups((prev) =>
            mergeGroups(prev.map((group) => {
              if (!sameGroupId(group.id, groupId)) return group;
              const baseCount = typeof group.messageCount === "number" ? group.messageCount : 0;
              return {
                ...group,
                messageCount: Math.max(0, baseCount - 1)
              };
            }))
          );

          if (!sameGroupId(groupId, selectedGroupIdRef.current) || modeRef.current !== "group") {
            return;
          }

          setMessages((prev) => prev.filter((item) => !sameMessageId(item.id, deletedEvent.messageId)));
          setReplyTarget((prev) => {
            if (!prev) return prev;
            return sameMessageId(prev.id, deletedEvent.messageId) ? null : prev;
          });
        }
      );
    });
  }, [groups, selectedGroupId, auth.user?.id, auth.user?.username, clearGroupRealtimeAlert, setGroupRealtimeAlert, showRealtimeToast]);

  useEffect(() => {
    const loadPrivate = async () => {
      if (!selectedPrivateUserId || mode !== "private") return;
      try {
        setLoading(true);
        const response = await getPrivateMessages(selectedPrivateUserId);
        const list = unwrap(response).map(normalizePrivateMessage);
        setMessages(list);
        await Promise.all(
          list
            .filter((message) => !message.mine && !message.read)
            .map((message) => markPrivateMessageRead(message.id).catch(() => {}))
        );
      } catch (err) {
        setError(err.userFriendlyMessage || "Failed to load messages.");
      } finally {
        setLoading(false);
      }
    };

    loadPrivate();
  }, [selectedPrivateUserId, mode]);

  useEffect(() => {
    const loadGroup = async () => {
      if (!selectedGroupId || mode !== "group") return;
      try {
        setLoading(true);
        const response = await getGroupMessages(selectedGroupId);
        const list = unwrap(response).map((message) => normalizeGroupMessage(message, auth.user?.id));
        setMessages(list);
        const latestMessage = list.length > 0 ? list[list.length - 1] : null;
        setGroups((prev) =>
          mergeGroups(prev.map((group) => {
            if (!sameGroupId(group.id, selectedGroupId)) return group;
            const baseCount = typeof group.messageCount === "number" ? group.messageCount : 0;
            const next = {
              ...group,
              unreadCount: 0,
              messageCount: Math.max(baseCount, list.length)
            };
            if (latestMessage) {
              next.lastMessage = groupListPreviewText(latestMessage, auth.user?.id);
              next.lastMessageAt = latestMessage.createdAt;
            }
            return next;
          }))
        );

        const unseenFromOthers = list
          .filter((message) => !message.mine && !message.seenBy?.some((entry) => entry.userId === auth.user?.id))
          .map((message) => Number(message.id))
          .filter((id) => Number.isFinite(id));
        if (unseenFromOthers.length > 0) {
          markGroupMessagesSeen(selectedGroupId, unseenFromOthers).catch(() => {});
        }
      } catch (err) {
        setError(err.userFriendlyMessage || "Failed to load group messages.");
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [selectedGroupId, mode, auth.user?.id]);

  const filteredConversations = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return conversations;
    return conversations.filter((item) => {
      const name = `${item.displayName || ""} ${item.username || ""}`.toLowerCase();
      return name.includes(q) || (item.lastMessage || "").toLowerCase().includes(q);
    });
  }, [search, conversations]);

  const groupsWithRealtimeAlerts = useMemo(
    () =>
      groups.map((group) => {
        const key = toGroupId(group?.id);
        const alert = key ? groupRealtimeAlerts[key] : null;
        return {
          ...group,
          mentionAlertKind: alert?.kind || "",
          mentionAlertText: alert?.text || ""
        };
      }),
    [groups, groupRealtimeAlerts]
  );

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groupsWithRealtimeAlerts;
    return groupsWithRealtimeAlerts.filter((group) => (group.groupName || "").toLowerCase().includes(q));
  }, [search, groupsWithRealtimeAlerts]);

  const activeWallpaper = useMemo(
    () => CHAT_WALLPAPERS.find((wallpaper) => wallpaper.id === selectedWallpaperId) || CHAT_WALLPAPERS[0],
    [selectedWallpaperId]
  );

  const chatThemeStyle = useMemo(() => {
    const ui = activeWallpaper.ui || {};
    return {
      "--sidebar-bg": ui.sidebarBg,
      "--sidebar-border": ui.sidebarBorder,
      "--sidebar-surface-bg": ui.sidebarSurfaceBg,
      "--sidebar-surface-border": ui.sidebarSurfaceBorder,
      "--sidebar-text": ui.sidebarText,
      "--sidebar-muted": ui.sidebarMuted,
      "--sidebar-item-hover": ui.sidebarItemHover,
      "--sidebar-item-active-border": ui.sidebarItemActiveBorder,
      "--sidebar-avatar-bg": ui.sidebarAvatarBg,
      "--sidebar-search-bg": ui.sidebarSearchBg,
      "--sidebar-search-border": ui.sidebarSearchBorder,
      "--sidebar-search-text": ui.sidebarSearchText,
      "--sidebar-search-placeholder": ui.sidebarSearchPlaceholder,
      "--sidebar-mode-bg": ui.sidebarModeBg,
      "--sidebar-mode-active-bg": ui.sidebarModeActiveBg,
      "--sidebar-mode-active-text": ui.sidebarModeActiveText,
      "--sidebar-mode-inactive-text": ui.sidebarModeInactiveText,
      "--chat-header-bg": ui.headerBg,
      "--chat-panel-bg": ui.panelBg,
      "--chat-panel-border": ui.panelBorder,
      "--chat-panel-surface-bg": ui.panelSurfaceBg,
      "--chat-panel-surface-border": ui.panelSurfaceBorder,
      "--chat-panel-text": ui.panelText,
      "--chat-compose-bg": ui.composeBg,
      "--chat-compose-border": ui.composeBorder,
      "--chat-input-text": ui.inputText,
      "--chat-input-placeholder": ui.inputPlaceholder,
      "--chat-incoming-bg": ui.incomingBg,
      "--chat-incoming-border": ui.incomingBorder,
      "--chat-incoming-text": ui.incomingText,
      "--chat-incoming-meta": ui.incomingMeta,
      "--chat-outgoing-bg": ui.outgoingBg,
      "--chat-outgoing-border": ui.outgoingBorder,
      "--chat-outgoing-accent": ui.outgoingAccent,
      "--chat-outgoing-shadow": ui.outgoingShadow,
      "--chat-outgoing-text": ui.outgoingText,
      "--chat-outgoing-meta": ui.outgoingMeta,
      "--chat-menu-bg": ui.menuBg,
      "--chat-menu-border": ui.menuBorder,
      "--chat-menu-hover": ui.menuHover,
      "--chat-menu-text": ui.menuText,
      "--chat-menu-danger": ui.menuDanger,
      "--chat-empty-bg": ui.emptyBg,
      "--chat-empty-border": ui.emptyBorder,
      "--chat-empty-text": ui.emptyText
    };
  }, [activeWallpaper]);

  useEffect(() => {
    localStorage.setItem(CHAT_WALLPAPER_STORAGE_KEY, activeWallpaper.id);
  }, [activeWallpaper.id]);

  const activeGroup = useMemo(
    () => groupsWithRealtimeAlerts.find((group) => sameGroupId(group.id, selectedGroupId)) || null,
    [groupsWithRealtimeAlerts, selectedGroupId]
  );
  const activeConversation = useMemo(
    () => conversations.find((item) => item.userId === selectedPrivateUserId) || null,
    [conversations, selectedPrivateUserId]
  );
  const activeGroupMemberById = useMemo(() => {
    const map = new Map();
    membersForGroup(activeGroup).forEach((member) => {
      map.set(String(member.userId), member);
    });
    return map;
  }, [activeGroup]);
  const mentionContext = useMemo(() => {
    if (mode !== "group" || !selectedGroupId) return null;
    return extractMentionQuery(input, inputCaretIndex);
  }, [mode, selectedGroupId, input, inputCaretIndex]);
  const groupMentionCandidates = useMemo(() => {
    if (mode !== "group") return [];
    return membersForGroup(activeGroup)
      .filter((member) => member?.userId != null && Number(member.userId) !== Number(auth.user?.id))
      .filter((member) => Boolean(member.username))
      .map((member) => ({
        userId: member.userId,
        username: member.username,
        displayName: member.displayName || member.username || "User"
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [mode, activeGroup, auth.user?.id]);
  const mentionSuggestions = useMemo(() => {
    if (!mentionContext) return [];
    const q = mentionContext.query;
    return groupMentionCandidates
      .filter((member) => {
        if (!q) return true;
        const username = (member.username || "").toLowerCase();
        const displayName = (member.displayName || "").toLowerCase();
        return username.startsWith(q) || displayName.includes(q);
      })
      .slice(0, 8);
  }, [mentionContext, groupMentionCandidates]);

  useEffect(() => {
    setMentionFocusIndex(0);
  }, [mentionContext?.start, mentionContext?.query, mentionSuggestions.length]);

  const userMetaById = useMemo(() => {
    const map = new Map();

    if (auth.user?.id != null) {
      map.set(String(auth.user.id), {
        name: auth.user.displayName || auth.user.username || "You",
        profileImageUrl: auth.user.profileImageUrl || ""
      });
    }

    users.forEach((user) => {
      map.set(String(user.id), {
        name: user.displayName || user.username || "User",
        profileImageUrl: user.profileImageUrl || ""
      });
    });

    conversations.forEach((item) => {
      map.set(String(item.userId), {
        name: item.displayName || item.username || map.get(String(item.userId))?.name || "User",
        profileImageUrl: item.profileImageUrl || map.get(String(item.userId))?.profileImageUrl || ""
      });
    });

    groups.forEach((group) => {
      (group.members || []).forEach((member) => {
        map.set(String(member.userId), {
          name: member.displayName || member.username || map.get(String(member.userId))?.name || "User",
          profileImageUrl: member.profileImageUrl || map.get(String(member.userId))?.profileImageUrl || ""
        });
      });
    });

    return map;
  }, [auth.user, users, conversations, groups]);

  const preparedMessages = useMemo(() => {
    return messages.map((message) => {
      const ownMeta = auth.user?.id != null ? userMetaById.get(String(auth.user.id)) : null;
      const senderMeta = userMetaById.get(String(message.senderId));
      const fallbackIncomingName = message.senderName || activeConversation?.displayName || activeConversation?.username || "User";
      const selectedMeta = message.mine ? ownMeta : senderMeta;
      const finalName = selectedMeta?.name || (message.mine ? ownMeta?.name || "You" : fallbackIncomingName);
      const replySenderMeta = message.replyToSenderId != null ? userMetaById.get(String(message.replyToSenderId)) : null;

      return {
        ...message,
        time: timeLabel(message.createdAt),
        avatarUrl: selectedMeta?.profileImageUrl || "",
        avatarLabel: avatarLabel(finalName),
        replyToSenderName: message.replyToSenderName || replySenderMeta?.name || "User"
      };
    });
  }, [messages, auth.user?.id, activeConversation, userMetaById]);

  const headerTitle = mode === "private"
    ? activeConversation?.displayName || activeConversation?.username || "Select chat"
    : activeGroup?.groupName || "Select group";
  const activeGroupMemberCount = memberCountForGroup(activeGroup);
  const activeGroupOnlineCount = onlineCountForGroup(activeGroup);

  const headerStatus = typingText
    ? typingText
    : mode === "private"
      ? activeConversation?.online
        ? "online"
        : activeConversation?.lastSeen
          ? `last seen ${new Date(activeConversation.lastSeen).toLocaleString()}`
          : "offline"
      : activeGroup
        ? `${activeGroupOnlineCount} online | ${activeGroupMemberCount} members`
        : "group chat";
  const headerAvatarLabel = avatarLabel(headerTitle || "Chat");
  const headerAvatarUrl = resolveImageUrl(
    mode === "private"
      ? activeConversation?.profileImageUrl || ""
      : activeGroup?.groupImageUrl || ""
  );
  const canComposeMessage = mode === "private" ? Boolean(selectedPrivateUserId) : Boolean(selectedGroupId);

  const sendTyping = (value) => {
    if (mode === "private" && selectedPrivateUserId) {
      socketClient.sendPrivateTyping(selectedPrivateUserId, value);
    }
    if (mode === "group" && selectedGroupId) {
      socketClient.sendGroupTyping(selectedGroupId, value);
    }
  };

  const handleSelectMention = useCallback((member) => {
    if (!member?.username || !mentionContext) return;
    const before = input.slice(0, mentionContext.start);
    const after = input.slice(mentionContext.end);
    const mention = `@${member.username} `;
    const nextValue = `${before}${mention}${after}`;
    const nextCaret = before.length + mention.length;

    setInput(nextValue);
    setInputCaretIndex(nextCaret);
    setMentionFocusIndex(0);
    sendTyping(nextValue.trim().length > 0);

    requestAnimationFrame(() => {
      if (!messageInputRef.current) return;
      messageInputRef.current.focus();
      messageInputRef.current.setSelectionRange(nextCaret, nextCaret);
    });
  }, [input, mentionContext, sendTyping]);

  const handleMessageInputKeyDown = (event) => {
    if (mentionSuggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionFocusIndex((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionFocusIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (event.key === "Tab" || event.key === "Enter") {
        event.preventDefault();
        const selected = mentionSuggestions[mentionFocusIndex] || mentionSuggestions[0];
        if (selected) {
          handleSelectMention(selected);
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setInputCaretIndex(-1);
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const activeReplyId = replyTarget && replyTarget.chatMode === mode ? Number(replyTarget.id) : null;

    try {
      setSending(true);
      setError("");
      if (mode === "private" && selectedPrivateUserId) {
        const response = await sendPrivateText({
          receiverId: selectedPrivateUserId,
          content: text,
          replyToMessageId: activeReplyId
        });
        const saved = normalizePrivateMessage(unwrap(response));
        setMessages((prev) => upsertMessage(prev, saved));
        setReplyTarget(null);
      } else if (mode === "group" && selectedGroupId) {
        const response = await sendGroupMessage({
          groupId: selectedGroupId,
          content: text,
          messageType: "TEXT",
          replyToMessageId: activeReplyId
        });
        const saved = normalizeGroupMessage(unwrap(response), auth.user?.id);
        setMessages((prev) => upsertMessage(prev, saved));
        setReplyTarget(null);
      }
      setInput("");
      setInputCaretIndex(0);
      sendTyping(false);
    } catch (err) {
      setError(err.userFriendlyMessage || err?.response?.data?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleUpload = async (file, type, onProgress) => {
    try {
      let uploadResponse;
      const formData = new FormData();
      formData.append("file", file);

      if (type === "image") {
        uploadResponse = await uploadChatImage(formData, (evt) => onProgress(Math.round((evt.loaded * 100) / evt.total)));
      } else {
        uploadResponse = await uploadChatVideo(formData, (evt) => onProgress(Math.round((evt.loaded * 100) / evt.total)));
      }

      const uploadData = unwrap(uploadResponse);
      if (mode === "private" && selectedPrivateUserId) {
        await sendPrivateMedia({
          receiverId: selectedPrivateUserId,
          messageType: type === "image" ? "IMAGE" : "VIDEO",
          mediaUrl: uploadData.fileUrl,
          content: "",
          replyToMessageId: replyTarget && replyTarget.chatMode === "private" ? Number(replyTarget.id) : null
        });
        setReplyTarget(null);
      } else if (mode === "group" && selectedGroupId) {
        await sendGroupMessage({
          groupId: selectedGroupId,
          messageType: type === "image" ? "IMAGE" : "VIDEO",
          mediaUrl: uploadData.fileUrl,
          content: "",
          replyToMessageId: replyTarget && replyTarget.chatMode === "group" ? Number(replyTarget.id) : null
        });
        setReplyTarget(null);
      }
      setToast(type === "image" ? "Image sent." : "Video sent.");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(err.userFriendlyMessage || "Media upload failed.");
    }
  };

  const handleCreateGroup = async (payload) => {
    try {
      let groupImageUrl = "";
      if (payload.groupImageFile) {
        const formData = new FormData();
        formData.append("file", payload.groupImageFile);
        const uploadResponse = await uploadGroupImage(formData, () => {});
        groupImageUrl = unwrap(uploadResponse).fileUrl || "";
      }

      const response = await createGroup({
        groupName: payload.groupName,
        description: payload.description,
        memberIds: payload.memberIds,
        groupImageUrl
      });
      const created = unwrap(response);
      setGroups((prev) => mergeGroups(upsertGroup(prev, created)));
      setMode("group");
      setSelectedGroupId(created.id);
      setShowCreateGroup(false);
      setToast("Group created.");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(err.userFriendlyMessage || "Failed to create group.");
    }
  };

  const hydrateGroupMembers = async (group) => {
    if (!group?.id) return group;
    const existingMembers = Array.isArray(group.members) ? group.members : [];
    if (existingMembers.length > 0) return group;

    const membersResponse = await getGroupMembers(group.id);
    const members = unwrap(membersResponse);
    if (!Array.isArray(members) || members.length === 0) {
      return {
        ...group,
        members: []
      };
    }

    return {
      ...group,
      members,
      memberCount: Math.max(typeof group.memberCount === "number" ? group.memberCount : 0, members.length)
    };
  };

  const refreshGroup = async (groupId) => {
    try {
      const response = await getGroupDetails(groupId);
      const group = await hydrateGroupMembers(unwrap(response));
      setGroups((prev) => mergeGroups(upsertGroup(prev, group)));
      return group;
    } catch (err) {
      const groupsResponse = await getMyGroups();
      const groupsListRaw = unwrap(groupsResponse);
      const groupsList = await Promise.all(
        groupsListRaw.map(async (group) => {
          if (!sameGroupId(group.id, groupId)) return group;
          try {
            return await hydrateGroupMembers(group);
          } catch {
            return group;
          }
        })
      );
      setGroups(mergeGroups(groupsList));
      const fallbackGroup = groupsList.find((item) => sameGroupId(item.id, groupId)) || null;
      if (!fallbackGroup) {
        throw err;
      }
      return fallbackGroup;
    }
  };

  useEffect(() => {
    if (mode !== "group" || !selectedGroupId) return;
    refreshGroup(selectedGroupId).catch(() => {});
  }, [mode, selectedGroupId]);

  const handleAddGroupMembers = async (groupId, userIds) => {
    try {
      await addGroupMembers(groupId, { userIds });
      setGroups((prev) =>
        mergeGroups(prev.map((group) => {
          if (!sameGroupId(group.id, groupId)) return group;

          const currentMembers = membersForGroup(group);
          const memberIds = new Set(currentMembers.map((member) => member.userId));
          const addedMembers = userIds
            .map((userId) => usersRef.current.find((user) => user.id === userId))
            .filter(Boolean)
            .filter((user) => !memberIds.has(user.id))
            .map((user) => ({
              id: `temp-${groupId}-${user.id}`,
              userId: user.id,
              username: user.username,
              displayName: user.displayName || user.username,
              profileImageUrl: user.profileImageUrl || "",
              online: Boolean(user.online),
              lastSeen: user.lastSeen || null,
              role: "MEMBER",
              joinedAt: new Date().toISOString()
            }));

          if (addedMembers.length === 0) return group;
          return {
            ...group,
            members: [...currentMembers, ...addedMembers],
            memberCount: Math.max(memberCountForGroup(group), currentMembers.length) + addedMembers.length
          };
        }))
      );
      await refreshGroup(groupId);
      setToast("Members added.");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(errorMessage(err, "Failed to add members."));
      throw err;
    }
  };

  const handleRemoveGroupMember = async (groupId, userId) => {
    try {
      await removeGroupMember(groupId, userId);
      await refreshGroup(groupId);
      setToast("Member removed.");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(errorMessage(err, "Failed to remove member."));
    }
  };

  const handleUpdateGroupMemberRole = async (groupId, userId, role) => {
    try {
      await updateGroupMemberRole(groupId, userId, role);
      await refreshGroup(groupId);
      setToast("Role updated.");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(errorMessage(err, "Failed to update role."));
    }
  };

  const handleUpdateGroupProfile = async (groupId, payload) => {
    try {
      const requestPayload = {
        groupName: payload?.groupName ?? "",
        description: payload?.description ?? ""
      };

      if (payload?.clearImage) {
        requestPayload.groupImageUrl = "";
      }

      if (payload?.groupImageFile) {
        const formData = new FormData();
        formData.append("file", payload.groupImageFile);
        const uploadResponse = await uploadGroupImage(formData, () => {});
        requestPayload.groupImageUrl = unwrap(uploadResponse).fileUrl || "";
      }

      const response = await updateGroupProfile(groupId, requestPayload);
      const updatedGroup = unwrap(response);
      setGroups((prev) => mergeGroups(upsertGroup(prev, updatedGroup)));
      setToast("Group updated.");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(errorMessage(err, "Failed to update group."));
      throw err;
    }
  };

  const handleCreatePoll = async (payload) => {
    try {
      const response = await createGroupPoll(payload);
      const pollMessage = normalizeGroupMessage(unwrap(response), auth.user?.id);
      setMessages((prev) => upsertMessage(prev, pollMessage));
      setToast("Poll created.");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(errorMessage(err, "Failed to create poll."));
      throw err;
    }
  };

  const updateQuickPollOption = (index, value) => {
    setQuickPollOptions((prev) => prev.map((option, idx) => (idx === index ? value : option)));
  };

  const appendQuickPollOption = () => {
    setQuickPollOptions((prev) => [...prev, ""]);
  };

  const handleCreateQuickPoll = async () => {
    if (!selectedGroupId || creatingQuickPoll) return;
    const normalizedOptions = quickPollOptions.map((option) => option.trim()).filter(Boolean);
    if (!quickPollQuestion.trim() || normalizedOptions.length < 2) {
      setError("Poll requires a question and at least two options.");
      return;
    }

    try {
      setCreatingQuickPoll(true);
      setError("");
      await handleCreatePoll({
        groupId: selectedGroupId,
        question: quickPollQuestion.trim(),
        options: normalizedOptions,
        anonymous: true
      });
      setShowQuickPollComposer(false);
      setQuickPollQuestion("");
      setQuickPollOptions(["", ""]);
    } catch {
      // error state is handled in handleCreatePoll
    } finally {
      setCreatingQuickPoll(false);
    }
  };

  const handleVotePoll = async (groupId, pollId, optionId) => {
    try {
      const response = await voteGroupPoll(groupId, pollId, optionId);
      const updatedPoll = unwrap(response);
      setMessages((prev) =>
        prev.map((item) =>
          item.poll?.id === pollId ? { ...item, poll: updatedPoll, messageType: "POLL" } : item
        )
      );
    } catch (err) {
      setError(errorMessage(err, "Failed to submit vote."));
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      await leaveGroup(groupId);
      setGroups((prev) => prev.filter((group) => !sameGroupId(group.id, groupId)));
      clearGroupRealtimeAlert(groupId);
      if (sameGroupId(selectedGroupId, groupId)) {
        setSelectedGroupId(null);
        setMessages([]);
        setShowGroupInfo(false);
      }
      setToast("You left the group.");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(err.userFriendlyMessage || "Failed to leave group.");
    }
  };

  const handleDeleteOwnGroupMessage = async (message) => {
    const targetGroupId = Number(message?.groupId || selectedGroupId);
    if (!targetGroupId || !message?.id) return;

    try {
      await deleteOwnGroupMessage(targetGroupId, message.id);
      setMessages((prev) => prev.filter((item) => !sameMessageId(item.id, message.id)));
      setReplyTarget((prev) => {
        if (!prev) return prev;
        return sameMessageId(prev.id, message.id) ? null : prev;
      });
      setToast("Message deleted.");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setError(errorMessage(err, "Failed to delete message."));
    }
  };

  const handleDeleteForMe = async (message) => {
    try {
      await deleteMessageForMe(message.id);
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
      setReplyTarget((prev) => {
        if (!prev) return prev;
        return sameMessageId(prev.id, message.id) ? null : prev;
      });
    } catch (err) {
      setError(err.userFriendlyMessage || "Failed to delete message.");
    }
  };

  const handleDeleteForEveryone = async (message) => {
    try {
      await deleteMessageForEveryone(message.id);
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
      setReplyTarget((prev) => {
        if (!prev) return prev;
        return sameMessageId(prev.id, message.id) ? null : prev;
      });
    } catch (err) {
      setError(err.userFriendlyMessage || "Failed to delete message.");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore logout API error and clear local auth state anyway
    }
    dispatch(logout());
    navigate("/login");
  };

  const handleWallpaperChange = (wallpaperId) => {
    setSelectedWallpaperId(wallpaperId);
  };

  const handleOpenMessageSeenInfo = (message) => {
    setMessageSeenInfo(message);
  };

  const handleEnsureGroupMembers = useCallback(async (groupId) => {
    await refreshGroup(groupId);
  }, []);

  const closePrivateChatConfirm = useCallback(() => {
    if (privateChatConfirmTimerRef.current) {
      clearTimeout(privateChatConfirmTimerRef.current);
      privateChatConfirmTimerRef.current = null;
    }
    setPrivateChatConfirmReady(false);
    setPendingPrivateChatMember(null);
  }, []);

  const openPrivateChatFromMember = useCallback((member) => {
    const targetUserId = member?.userId;
    if (!targetUserId || targetUserId === auth.user?.id) return;

    setConversations((prev) => {
      if (prev.some((item) => item.userId === targetUserId)) {
        return prev;
      }
      return [
        {
          userId: targetUserId,
          username: member.username || "",
          displayName: member.displayName || member.username || "User",
          profileImageUrl: member.profileImageUrl || "",
          lastMessage: "",
          lastMessageAt: "",
          unread: false,
          online: Boolean(member.online),
          lastSeen: member.lastSeen || null
        },
        ...prev
      ];
    });

    setMode("private");
    setSelectedPrivateUserId(targetUserId);
    setShowGroupInfo(false);
    setTypingText("");
  }, [auth.user?.id]);

  const handleOpenPrivateFromGroupMember = useCallback((member) => {
    const targetUserId = member?.userId;
    if (!targetUserId || targetUserId === auth.user?.id) return;
    if (privateChatConfirmTimerRef.current) {
      clearTimeout(privateChatConfirmTimerRef.current);
      privateChatConfirmTimerRef.current = null;
    }
    setPendingPrivateChatMember({ ...member });
    setPrivateChatConfirmReady(false);
    privateChatConfirmTimerRef.current = setTimeout(() => {
      setPrivateChatConfirmReady(true);
      privateChatConfirmTimerRef.current = null;
    }, 220);
  }, [auth.user?.id]);

  const handleConfirmPrivateChatFromMember = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!pendingPrivateChatMember || !privateChatConfirmReady) return;
    openPrivateChatFromMember(pendingPrivateChatMember);
    closePrivateChatConfirm();
  }, [pendingPrivateChatMember, privateChatConfirmReady, openPrivateChatFromMember, closePrivateChatConfirm]);

  useEffect(() => {
    if (mode === "group") return;
    if (!pendingPrivateChatMember) return;
    closePrivateChatConfirm();
  }, [mode, pendingPrivateChatMember, closePrivateChatConfirm]);

  const handleReplyToGroupMessage = useCallback((message) => {
    if (!message || mode !== "group") return;
    const senderId = message.senderId;
    const senderMember = senderId != null ? activeGroupMemberById.get(String(senderId)) : null;
    const senderName = message.senderName || senderMember?.displayName || senderMember?.username || "User";
    const mentionPrefix =
      senderMember?.username && senderId !== auth.user?.id
        ? `@${senderMember.username} `
        : "";

    setReplyTarget({
      id: toMessageId(message.id),
      senderId,
      senderName,
      preview: messagePreviewText(message),
      chatMode: "group"
    });
    setInput((prev) => (prev.trim().length === 0 ? mentionPrefix : prev));
    if (mentionPrefix) {
      setInputCaretIndex(mentionPrefix.length);
    }
    setShowQuickPollComposer(false);
    messageInputRef.current?.focus();
  }, [mode, activeGroupMemberById, auth.user?.id]);

  const handleReplyToPrivateMessage = useCallback((message) => {
    if (!message || mode !== "private") return;
    const senderName = message.senderName || (message.mine ? "You" : (activeConversation?.displayName || activeConversation?.username || "User"));
    setReplyTarget({
      id: toMessageId(message.id),
      senderId: message.senderId,
      senderName,
      preview: messagePreviewText(message),
      chatMode: "private"
    });
    setShowQuickPollComposer(false);
    messageInputRef.current?.focus();
  }, [mode, activeConversation]);

  return (
    <div className="chat-shell" style={chatThemeStyle}>
      <ChatSidebar
        mode={mode}
        onModeChange={setMode}
        search={search}
        onSearchChange={setSearch}
        conversations={filteredConversations}
        groups={filteredGroups}
        activePrivateUserId={selectedPrivateUserId}
        activeGroupId={selectedGroupId}
        onSelectPrivate={(userId) => {
          setMode("private");
          setSelectedPrivateUserId(userId);
          setTypingText("");
        }}
        onSelectGroup={(groupId) => {
          setMode("group");
          setSelectedGroupId(groupId);
          clearGroupRealtimeAlert(groupId);
          setTypingText("");
        }}
        onCreateGroup={() => setShowCreateGroup(true)}
      />

        <section className="chat-main">
          <header className="chat-main-header">
            <div
              className={`chat-main-user ${mode === "group" ? "clickable" : ""}`}
              onClick={mode === "group" ? () => setShowGroupInfo(true) : undefined}
              role={mode === "group" ? "button" : undefined}
              tabIndex={mode === "group" ? 0 : undefined}
              onKeyDown={
                mode === "group"
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setShowGroupInfo(true);
                      }
                    }
                  : undefined
              }
            >
              <div className="avatar-badge">
                {headerAvatarUrl ? (
                  <img
                    src={headerAvatarUrl}
                    alt={headerTitle || "Chat"}
                    className="avatar-badge-image"
                  />
                ) : (
                  headerAvatarLabel
                )}
              </div>
              <div>
                <h2>{headerTitle}</h2>
                <p className="chat-sub-status">{headerStatus}</p>
              </div>
            </div>

            <div className="chat-header-actions">
              {mode === "group" ? (
                <button
                  type="button"
                  className="ghost-btn small icon-label-btn"
                  title="Group details"
                  aria-label="Open group details"
                  onClick={() => setShowGroupInfo(true)}
                >
                  <InfoIcon />
                  <span>Group</span>
                </button>
              ) : null}
              <button
                type="button"
                className={`ghost-btn small icon-label-btn wallpaper-label-btn ${showWallpaperPanel ? "active" : ""}`}
                title="Chat wallpaper"
                aria-label="Toggle chat wallpaper panel"
                onClick={() => setShowWallpaperPanel((prev) => !prev)}
              >
                <WallpaperIcon />
                <span>Theme</span>
              </button>
              {mode === "private" ? (
                <button type="button" className="ghost-btn small" onClick={() => navigate("/profile")}>
                  Profile
                </button>
              ) : null}
              {mode === "private" ? (
                <button type="button" className="ghost-btn small" onClick={handleLogout}>
                  Sign out
                </button>
              ) : null}
            </div>
          </header>

        {showWallpaperPanel ? (
          <section className="wallpaper-panel">
            <div className="wallpaper-options">
              {CHAT_WALLPAPERS.map((wallpaper) => (
                <button
                  key={wallpaper.id}
                  type="button"
                  className={`wallpaper-option ${activeWallpaper.id === wallpaper.id ? "active" : ""}`}
                  onClick={() => handleWallpaperChange(wallpaper.id)}
                >
                  <img src={wallpaper.src} alt={wallpaper.name} className="wallpaper-thumb" />
                  <span>{wallpaper.name}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="empty-chat-list">Loading...</div>
        ) : (
          <ChatWindow
            messages={preparedMessages}
            showSender={mode === "group"}
            mentionUsername={mode === "group" ? auth.user?.username || "" : ""}
            emptyLabel={mode === "private" ? "No messages yet." : "No group messages yet."}
            onDeleteForMe={mode === "private" ? handleDeleteForMe : mode === "group" ? handleDeleteOwnGroupMessage : undefined}
            onDeleteForEveryone={mode === "private" ? handleDeleteForEveryone : undefined}
            onVotePoll={mode === "group" ? handleVotePoll : undefined}
            onOpenMessageSeenInfo={mode === "group" ? handleOpenMessageSeenInfo : undefined}
            onReplyToMessage={mode === "group" ? handleReplyToGroupMessage : mode === "private" ? handleReplyToPrivateMessage : undefined}
            wallpaper={activeWallpaper}
          />
        )}

        <div className="chat-input-row">
          <div className="chat-compose-wrap">
            {replyTarget && replyTarget.chatMode === mode ? (
              <div className="reply-composer">
                <div className="reply-composer-body">
                  <p className="reply-composer-label">Replying to {replyTarget.senderName}</p>
                  <p className="reply-composer-preview">{replyTarget.preview}</p>
                </div>
                <button type="button" className="ghost-btn tiny" onClick={() => setReplyTarget(null)}>
                  Cancel
                </button>
              </div>
            ) : null}
            <div className="chat-compose-surface">
              <MediaUpload onUpload={handleUpload} />
              {mode === "group" ? (
                <button
                  type="button"
                  className={`icon-btn compose-action-btn ${showQuickPollComposer ? "active" : ""}`}
                  title="Create poll"
                  aria-label="Create poll"
                  disabled={!selectedGroupId}
                  onClick={() => setShowQuickPollComposer((prev) => !prev)}
                >
                  <PollIcon />
                </button>
              ) : null}
              <input
                ref={messageInputRef}
                className="chat-message-input"
                value={input}
                placeholder={canComposeMessage ? "Type a message" : mode === "group" ? "Select a group first" : "Select a chat first"}
                disabled={!canComposeMessage}
                onChange={(event) => {
                  setInput(event.target.value);
                  setInputCaretIndex(event.target.selectionStart ?? event.target.value.length);
                  sendTyping(event.target.value.trim().length > 0);
                }}
                onClick={(event) => setInputCaretIndex(event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
                onKeyUp={(event) => {
                  if (event.key === "Escape") return;
                  setInputCaretIndex(event.currentTarget.selectionStart ?? event.currentTarget.value.length);
                }}
                onKeyDown={handleMessageInputKeyDown}
              />
            </div>
            {mentionSuggestions.length > 0 ? (
              <div className="mention-suggestions" role="listbox" aria-label="Group members">
                {mentionSuggestions.map((member, index) => (
                  <button
                    key={`${member.userId}-${member.username}`}
                    type="button"
                    role="option"
                    className={`mention-option ${index === mentionFocusIndex ? "active" : ""}`}
                    aria-selected={index === mentionFocusIndex}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelectMention(member);
                    }}
                    onMouseEnter={() => setMentionFocusIndex(index)}
                  >
                    <span className="mention-option-avatar">{avatarLabel(member.displayName)}</span>
                    <span className="mention-option-main">
                      <span className="mention-option-name">{member.displayName}</span>
                      <span className="mention-option-username">@{member.username}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {mode === "group" && showQuickPollComposer ? (
              <div className="quick-poll-panel">
                <input
                  className="chat-search"
                  value={quickPollQuestion}
                  onChange={(event) => setQuickPollQuestion(event.target.value)}
                  placeholder="Poll question"
                />
                <div className="quick-poll-options">
                  {quickPollOptions.map((option, index) => (
                    <input
                      key={index}
                      className="chat-search"
                      value={option}
                      onChange={(event) => updateQuickPollOption(index, event.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="quick-poll-actions">
                  <button type="button" className="ghost-btn tiny" onClick={appendQuickPollOption}>
                    Add option
                  </button>
                  <button type="button" className="ghost-btn tiny" onClick={() => setShowQuickPollComposer(false)}>
                    Cancel
                  </button>
                  <button type="button" className="primary-btn tiny" onClick={handleCreateQuickPoll} disabled={creatingQuickPoll}>
                    {creatingQuickPoll ? "Creating..." : "Send poll"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <button type="button" className="primary-btn" onClick={handleSend} disabled={sending || !canComposeMessage}>
            {sending ? "Sending..." : "Send"}
          </button>
        </div>

        {error ? <p className="form-error chat-error">{error}</p> : null}
        {socketError ? <p className="chat-status">{socketError}</p> : null}
        {toast ? <div className="toast">{toast}</div> : null}
      </section>

      <GroupInfo
        open={mode === "group" && showGroupInfo}
        group={activeGroup}
        users={users}
        currentUserId={auth.user?.id}
        onClose={() => setShowGroupInfo(false)}
        onLeave={handleLeaveGroup}
        onAddMembers={handleAddGroupMembers}
        onRemoveMember={handleRemoveGroupMember}
        onUpdateRole={handleUpdateGroupMemberRole}
        onUpdateProfile={handleUpdateGroupProfile}
        onCreatePoll={handleCreatePoll}
        onEnsureMembers={handleEnsureGroupMembers}
        onOpenPrivateChat={handleOpenPrivateFromGroupMember}
      />

      <CreateGroupModal
        open={showCreateGroup}
        users={users}
        onClose={() => setShowCreateGroup(false)}
        onCreate={handleCreateGroup}
      />

      {pendingPrivateChatMember ? (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            closePrivateChatConfirm();
          }}
        >
          <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <h3>Start private chat?</h3>
            <p className="group-muted">
              Do you want to chat privately with {pendingPrivateChatMember.displayName || pendingPrivateChatMember.username || "this member"}?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closePrivateChatConfirm();
                }}
              >
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleConfirmPrivateChatFromMember} disabled={!privateChatConfirmReady}>
                {privateChatConfirmReady ? "Open Chat" : "Please wait..."}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {messageSeenInfo ? (
        <div className="modal-backdrop" onClick={() => setMessageSeenInfo(null)}>
          <section className="modal-panel message-info-panel" onClick={(event) => event.stopPropagation()}>
            <h3>Seen By</h3>
            <div className="message-info-list">
              {(messageSeenInfo.seenBy || []).length === 0 ? <p className="group-muted">No one has seen this message yet.</p> : null}
              {(messageSeenInfo.seenBy || []).map((entry) => (
                <div key={`${entry.userId}-${entry.seenAt || ""}`} className="message-info-row">
                  <div>
                    <p className="message-info-name">{entry.displayName || entry.username || "User"}</p>
                    <p className="message-info-meta">{entry.username ? `@${entry.username}` : ""}</p>
                  </div>
                  <span className="message-info-time">{entry.seenAt ? new Date(entry.seenAt).toLocaleString() : ""}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setMessageSeenInfo(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizePrivateMessage(message) {
  return {
    ...message,
    id: toMessageId(message.id),
    senderId: message.senderId,
    senderName: message.senderName,
    receiverId: message.receiverId,
    content: message.content,
    mediaUrl: message.mediaUrl,
    messageType: message.messageType,
    replyToMessageId: message.replyToMessageId ? toMessageId(message.replyToMessageId) : "",
    replyToSenderId: message.replyToSenderId,
    replyToSenderName: message.replyToSenderName,
    replyToMessageType: message.replyToMessageType,
    replyToContent: message.replyToContent,
    mine: Boolean(message.mine),
    read: Boolean(message.read),
    createdAt: message.createdAt
  };
}

function normalizeGroupMessage(message, currentUserId) {
  return {
    ...message,
    id: toMessageId(message.id),
    senderId: message.senderId,
    senderName: message.senderName,
    content: message.content,
    mediaUrl: message.mediaUrl,
    messageType: message.messageType,
    replyToMessageId: message.replyToMessageId ? toMessageId(message.replyToMessageId) : "",
    replyToSenderId: message.replyToSenderId,
    replyToSenderName: message.replyToSenderName,
    replyToMessageType: message.replyToMessageType,
    replyToContent: message.replyToContent,
    poll: message.poll || null,
    seenBy: Array.isArray(message.seenBy) ? message.seenBy : [],
    mine: message.senderId === currentUserId,
    read: true,
    createdAt: message.createdAt
  };
}
