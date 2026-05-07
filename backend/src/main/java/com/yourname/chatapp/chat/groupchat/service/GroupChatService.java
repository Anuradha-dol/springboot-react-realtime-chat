package com.yourname.chatapp.chat.groupchat.service;

import com.yourname.chatapp.chat.groupchat.dto.*;

import java.util.List;

public interface GroupChatService {
    GroupResponse createGroup(CreateGroupRequest request);

    GroupResponse updateGroupImage(Long groupId, String groupImageUrl);

    GroupResponse updateGroupProfile(Long groupId, UpdateGroupProfileRequest request);

    void addUsers(Long groupId, AddGroupMembersRequest request);

    void removeUser(Long groupId, Long userId);

    void updateMemberRole(Long groupId, Long userId, UpdateGroupMemberRoleRequest request);

    void leaveGroup(Long groupId);

    List<GroupResponse> getMyGroups();

    GroupResponse getGroupDetails(Long groupId);

    List<GroupMemberResponse> getGroupMembers(Long groupId);

    List<GroupMessageResponse> getGroupMessages(Long groupId);

    GroupMessageResponse sendMessage(GroupMessageRequest request);

    void deleteOwnMessage(Long groupId, Long messageId);

    GroupMessageResponse createPoll(CreateGroupPollRequest request);

    GroupPollResponse votePoll(Long groupId, Long pollId, VoteGroupPollRequest request);

    void markMessagesSeen(Long groupId, MarkGroupMessagesSeenRequest request);

    boolean canAccessMediaUrl(Long userId, String mediaUrl);

    void cleanupUserData(Long userId);
}
