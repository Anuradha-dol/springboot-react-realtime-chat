import api from "../api/axios";

// Group chat endpoints now use cleaner /chats/groups aliases.
export const createGroup = (payload) => api.post("/chats/groups", payload);
export const getMyGroups = () => api.get("/chats/groups/my");
export const getGroupDetails = (groupId) => api.get(`/chats/groups/${groupId}`);
export const getGroupMembers = (groupId) => api.get(`/chats/groups/${groupId}/members`);
export const getGroupMessages = (groupId) => api.get(`/chats/groups/${groupId}/messages`);
export const sendGroupMessage = (payload) => api.post("/chats/groups/group-messages", payload);
export const deleteOwnGroupMessage = (groupId, messageId) => api.delete(`/chats/groups/${groupId}/messages/${messageId}`);
export const addGroupMembers = (groupId, payload) => api.post(`/chats/groups/${groupId}/members`, payload);
export const removeGroupMember = (groupId, userId) => api.delete(`/chats/groups/${groupId}/members/${userId}`);
export const updateGroupMemberRole = (groupId, userId, role) =>
  api.patch(`/chats/groups/${groupId}/members/${userId}/role`, { role });
export const leaveGroup = (groupId) => api.post(`/chats/groups/${groupId}/leave`);
export const updateGroupImage = (groupId, groupImageUrl) => api.patch(`/chats/groups/${groupId}/image`, { groupImageUrl });
export const updateGroupProfile = (groupId, payload) => api.patch(`/chats/groups/${groupId}/profile`, payload);
export const markGroupMessagesSeen = (groupId, messageIds) => api.post(`/chats/groups/${groupId}/messages/seen`, { messageIds });
export const createGroupPoll = (payload) => api.post("/chats/groups/group-polls", payload);
export const voteGroupPoll = (groupId, pollId, optionId) => api.post(`/chats/groups/${groupId}/polls/${pollId}/vote`, { optionId });

export const uploadGroupImage = (formData, onUploadProgress) =>
  api.post("/uploads/group/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress
  });
