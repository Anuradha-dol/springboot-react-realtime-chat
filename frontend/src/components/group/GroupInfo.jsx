import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../../config/appConfig";

function memberLabel(member) {
  return member.displayName || member.username || "User";
}

function lastSeenLabel(value) {
  if (!value) return "offline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "offline";
  return `last seen ${date.toLocaleString()}`;
}

function membersCount(group) {
  const membersLength = Array.isArray(group?.members) ? group.members.length : 0;
  if (typeof group?.memberCount === "number") {
    return Math.max(group.memberCount, membersLength);
  }
  return membersLength;
}

function resolveGroupImageUrl(value) {
  if (!value) return "";
  return value.startsWith("http://") || value.startsWith("https://") ? value : `${API_BASE_URL}${value}`;
}

function MembersIcon() {
  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9.2" r="2.2" />
      <circle cx="15.4" cy="10" r="1.8" />
      <path d="M5.2 16.8c0-2.3 2-3.9 4.3-3.9s4.3 1.6 4.3 3.9" />
      <path d="M13.2 16.2c.3-1.6 1.7-2.8 3.4-2.8 1.9 0 3.4 1.4 3.4 3.2" />
    </svg>
  );
}

function AddMemberIcon() {
  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9.5" cy="8.6" r="2.3" />
      <path d="M5.5 15.8c0-2.2 1.9-3.7 4-3.7 1 0 2 .3 2.7.9" />
      <path d="M16.3 9.8v6.5" />
      <path d="M13.1 13h6.4" />
    </svg>
  );
}

function PollIcon() {
  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.2 6.7h13.6" />
      <path d="M5.2 11.8h9.2" />
      <path d="M5.2 16.9h6.2" />
      <circle cx="17.6" cy="16.9" r="2.1" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" />
      <path d="M4.8 13.4v-2.8l2-.6a6.4 6.4 0 0 1 .8-1.8l-1-1.8 2-2 1.8 1a6.4 6.4 0 0 1 1.8-.8l.6-2h2.8l.6 2a6.4 6.4 0 0 1 1.8.8l1.8-1 2 2-1 1.8c.4.6.6 1.2.8 1.8l2 .6v2.8l-2 .6a6.4 6.4 0 0 1-.8 1.8l1 1.8-2 2-1.8-1a6.4 6.4 0 0 1-1.8.8l-.6 2h-2.8l-.6-2a6.4 6.4 0 0 1-1.8-.8l-1.8 1-2-2 1-1.8a6.4 6.4 0 0 1-.8-1.8l-2-.6Z" />
    </svg>
  );
}

export default function GroupInfo({
  open,
  group,
  users = [],
  currentUserId,
  onClose,
  onLeave,
  onAddMembers,
  onRemoveMember,
  onUpdateRole,
  onUpdateProfile,
  onCreatePoll,
  onEnsureMembers,
  onOpenPrivateChat
}) {
  const [addingMembers, setAddingMembers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [activeTab, setActiveTab] = useState("members");
  const [actionError, setActionError] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const membersLoadStartedRef = useRef(false);

  const members = useMemo(() => {
    const list = Array.isArray(group?.members) ? group.members : [];
    return [...list].sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return memberLabel(a).localeCompare(memberLabel(b));
    });
  }, [group?.members]);
  const memberTotal = membersCount(group);
  const onlineTotal = members.filter((member) => member.online).length;

  const memberUserIds = useMemo(() => new Set(members.map((member) => member.userId)), [members]);
  const availableUsers = useMemo(
    () => users.filter((user) => !memberUserIds.has(user.id)),
    [users, memberUserIds]
  );
  const canEditProfile = group?.currentUserAdmin && typeof onUpdateProfile === "function";
  const currentGroupImageUrl = useMemo(
    () => resolveGroupImageUrl(group?.groupImageUrl || ""),
    [group?.groupImageUrl]
  );
  const profileImagePreviewUrl = useMemo(
    () => (profileImageFile ? URL.createObjectURL(profileImageFile) : ""),
    [profileImageFile]
  );

  useEffect(() => {
    return () => {
      if (profileImagePreviewUrl) {
        URL.revokeObjectURL(profileImagePreviewUrl);
      }
    };
  }, [profileImagePreviewUrl]);

  useEffect(() => {
    setSelectedUserIds([]);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setActiveTab("members");
    setActionError("");
    setLoadingMembers(false);
    membersLoadStartedRef.current = false;
    setProfileName(group?.groupName || "");
    setProfileDescription(group?.description || "");
    setProfileImageFile(null);
    setRemoveProfileImage(false);
    setUpdatingProfile(false);
  }, [group?.id, open]);

  useEffect(() => {
    if (!open || !group?.id || typeof onEnsureMembers !== "function") return;
    if (memberTotal <= 0 || members.length > 0 || membersLoadStartedRef.current) return;

    membersLoadStartedRef.current = true;
    setLoadingMembers(true);
    setActionError("");
    onEnsureMembers(group.id)
      .catch((err) => {
        setActionError(err?.userFriendlyMessage || err?.response?.data?.message || "Failed to load members.");
      })
      .finally(() => {
        setLoadingMembers(false);
      });
  }, [open, group?.id, memberTotal, members.length]);

  if (!open || !group) return null;

  const canCreatePoll = Boolean(group.id);

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const submitAddMembers = async () => {
    if (selectedUserIds.length === 0) return;
    setAddingMembers(true);
    setActionError("");
    try {
      await onAddMembers(group.id, selectedUserIds);
      setSelectedUserIds([]);
    } catch (err) {
      setActionError(err?.userFriendlyMessage || err?.response?.data?.message || "Failed to add members.");
    } finally {
      setAddingMembers(false);
    }
  };

  const updatePollOption = (index, value) => {
    setPollOptions((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const appendPollOption = () => {
    setPollOptions((prev) => [...prev, ""]);
  };

  const submitPoll = async () => {
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) return;
    setCreatingPoll(true);
    setActionError("");
    try {
      await onCreatePoll({
        groupId: group.id,
        question: pollQuestion.trim(),
        options,
        anonymous: true
      });
      setPollQuestion("");
      setPollOptions(["", ""]);
      setActiveTab("members");
    } catch (err) {
      setActionError(err?.userFriendlyMessage || err?.response?.data?.message || "Failed to create poll.");
    } finally {
      setCreatingPoll(false);
    }
  };

  const submitProfileUpdate = async () => {
    if (!canEditProfile || !group?.id) return;

    const trimmedName = profileName.trim();
    if (!trimmedName) {
      setActionError("Group name is required.");
      return;
    }

    setUpdatingProfile(true);
    setActionError("");
    try {
      await onUpdateProfile(group.id, {
        groupName: trimmedName,
        description: profileDescription.trim(),
        groupImageFile: profileImageFile,
        clearImage: removeProfileImage
      });
      setProfileImageFile(null);
      setRemoveProfileImage(false);
      setActiveTab("members");
    } catch (err) {
      setActionError(err?.userFriendlyMessage || err?.response?.data?.message || "Failed to update group profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <div className="group-drawer-backdrop" onClick={onClose}>
      <aside className="group-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="group-drawer-header">
          <div className="group-drawer-title">
            <div className="group-info-avatar">
              {currentGroupImageUrl ? (
                <img src={currentGroupImageUrl} alt={group.groupName || "Group"} className="group-info-avatar-img" />
              ) : (
                <span>{(group.groupName || "G").slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h3>{group.groupName}</h3>
              <p>{group.description || "No description"}</p>
            </div>
          </div>
          <button type="button" className="ghost-btn tiny" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="group-drawer-meta">
          <div className="group-drawer-stat-chip">
            <span className="status-dot online" />
            <span>{onlineTotal} online</span>
          </div>
          <div className="group-drawer-stat-chip">
            <span>{memberTotal} members</span>
          </div>
          {group.currentUserAdmin ? <span className="admin-badge">ADMIN</span> : null}
          <button type="button" className="ghost-btn tiny" onClick={() => onLeave(group.id)}>
            Leave
          </button>
        </div>

        <div className="group-drawer-tabs">
          <button type="button" className={`ghost-btn tiny ${activeTab === "members" ? "active" : ""}`} onClick={() => setActiveTab("members")}>
            <MembersIcon />
            Members
          </button>
          {group.currentUserAdmin ? (
            <button type="button" className={`ghost-btn tiny ${activeTab === "add" ? "active" : ""}`} onClick={() => setActiveTab("add")}>
              <AddMemberIcon />
              Add Members
            </button>
          ) : null}
          {canCreatePoll ? (
            <button type="button" className={`ghost-btn tiny ${activeTab === "poll" ? "active" : ""}`} onClick={() => setActiveTab("poll")}>
              <PollIcon />
              Create Poll
            </button>
          ) : null}
          {canEditProfile ? (
            <button type="button" className={`ghost-btn tiny ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
              <SettingsIcon />
              Group Settings
            </button>
          ) : null}
        </div>

        <div className="group-drawer-body">
          {actionError ? <p className="group-action-error">{actionError}</p> : null}
          {activeTab === "members" ? (
            <div className="group-members-list">
              {loadingMembers ? <p className="group-muted">Loading members...</p> : null}
              {!loadingMembers && members.length === 0 ? <p className="group-muted">No members to display yet.</p> : null}
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const canRemove = group.currentUserAdmin && !isSelf && member.userId !== group.createdById;
                const canPromote = group.currentUserAdmin && member.role !== "ADMIN";
                const canDemote =
                  member.role === "ADMIN" &&
                  ((group.createdById === currentUserId && !isSelf) || isSelf);
                const canOpenPrivate = !isSelf && typeof onOpenPrivateChat === "function";

                return (
                  <div key={member.id} className="group-member-row">
                    <button
                      type="button"
                      className="group-member-main group-member-main-btn"
                      disabled={!canOpenPrivate}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onOpenPrivateChat?.(member);
                      }}
                      title={canOpenPrivate ? "Open private chat" : ""}
                    >
                      <span className={`status-dot ${member.online ? "online" : ""}`} />
                      <div className="group-member-text">
                        <span className="group-member-name">{memberLabel(member)}</span>
                        <span className="group-member-username">{member.username ? `@${member.username}` : ""}</span>
                        <span className="group-member-presence">{member.online ? "online" : lastSeenLabel(member.lastSeen)}</span>
                      </div>
                      <span className={`group-member-role ${member.role === "ADMIN" ? "admin" : "member"}`}>{member.role}</span>
                    </button>
                    <div className="group-member-actions">
                      {canOpenPrivate ? (
                        <button
                          type="button"
                          className="ghost-btn tiny"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onOpenPrivateChat?.(member);
                          }}
                        >
                          Message
                        </button>
                      ) : null}
                      {canPromote ? (
                        <button type="button" className="ghost-btn tiny" onClick={() => onUpdateRole(group.id, member.userId, "ADMIN")}>
                          Make admin
                        </button>
                      ) : null}
                      {canDemote ? (
                        <button type="button" className="ghost-btn tiny" onClick={() => onUpdateRole(group.id, member.userId, "MEMBER")}>
                          Remove admin
                        </button>
                      ) : null}
                      {canRemove ? (
                        <button type="button" className="ghost-btn tiny danger" onClick={() => onRemoveMember(group.id, member.userId)}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {activeTab === "add" && group.currentUserAdmin ? (
            <div className="group-add-members">
              <div className="group-add-list">
                {availableUsers.length === 0 ? <p className="group-muted">No more users to add.</p> : null}
                {availableUsers.map((user) => (
                  <label key={user.id} className="group-user-option">
                    <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleUser(user.id)} />
                    <span>{user.displayName || user.username}</span>
                  </label>
                ))}
              </div>
              <button type="button" className="primary-btn small" onClick={submitAddMembers} disabled={addingMembers || selectedUserIds.length === 0}>
                {addingMembers ? "Adding..." : "Add Selected"}
              </button>
            </div>
          ) : null}

          {activeTab === "poll" && canCreatePoll ? (
            <div className="group-poll-creator">
              <input
                value={pollQuestion}
                onChange={(event) => setPollQuestion(event.target.value)}
                placeholder="Poll question"
                className="chat-search"
              />
              <div className="group-poll-options">
                {pollOptions.map((option, index) => (
                  <input
                    key={index}
                    value={option}
                    onChange={(event) => updatePollOption(index, event.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="chat-search"
                  />
                ))}
              </div>
              <div className="group-poll-actions">
                <button type="button" className="ghost-btn tiny" onClick={appendPollOption}>
                  Add option
                </button>
                <button type="button" className="primary-btn tiny" onClick={submitPoll} disabled={creatingPoll}>
                  {creatingPoll ? "Creating..." : "Create Poll"}
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "settings" && canEditProfile ? (
            <div className="group-profile-editor">
              <div className="group-profile-media">
                <div className="group-profile-preview">
                  {profileImagePreviewUrl ? (
                    <img src={profileImagePreviewUrl} alt="Group preview" className="group-profile-preview-img" />
                  ) : removeProfileImage ? (
                    <span>{(profileName || "G").slice(0, 2).toUpperCase()}</span>
                  ) : currentGroupImageUrl ? (
                    <img src={currentGroupImageUrl} alt={group.groupName || "Group"} className="group-profile-preview-img" />
                  ) : (
                    <span>{(profileName || "G").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="group-profile-media-actions">
                  <label className="ghost-btn tiny">
                    {profileImageFile ? "Change photo" : "Upload photo"}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      hidden
                      onChange={(event) => {
                        setProfileImageFile(event.target.files?.[0] || null);
                        setRemoveProfileImage(false);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="ghost-btn tiny"
                    onClick={() => {
                      setProfileImageFile(null);
                      setRemoveProfileImage(true);
                    }}
                  >
                    Remove photo
                  </button>
                </div>
              </div>

              <input
                className="chat-search"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Group name"
                maxLength={100}
              />
              <textarea
                className="chat-search group-profile-description"
                value={profileDescription}
                onChange={(event) => setProfileDescription(event.target.value)}
                placeholder="Group description"
                rows={4}
                maxLength={600}
              />
              <div className="group-poll-actions">
                <button type="button" className="ghost-btn tiny" onClick={() => setActiveTab("members")}>
                  Cancel
                </button>
                <button type="button" className="primary-btn tiny" onClick={submitProfileUpdate} disabled={updatingProfile}>
                  {updatingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
