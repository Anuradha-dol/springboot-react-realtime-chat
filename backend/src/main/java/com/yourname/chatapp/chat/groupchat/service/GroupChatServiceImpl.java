package com.yourname.chatapp.chat.groupchat.service;

import com.yourname.chatapp.chat.groupchat.dto.*;
import com.yourname.chatapp.chat.groupchat.entity.*;
import com.yourname.chatapp.chat.groupchat.repository.*;
import com.yourname.chatapp.common.enums.GroupRole;
import com.yourname.chatapp.common.enums.MessageType;
import com.yourname.chatapp.security.CurrentUserService;
import com.yourname.chatapp.user.entity.User;
import com.yourname.chatapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupChatServiceImpl implements GroupChatService {
    private static final Pattern USER_MENTION_PATTERN = Pattern.compile("(?<![A-Za-z0-9_])@([A-Za-z0-9_]{1,50})");

    private final GroupChatRepository groupChatRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final GroupMessageSeenRepository groupMessageSeenRepository;
    private final GroupPollRepository groupPollRepository;
    private final GroupPollOptionRepository groupPollOptionRepository;
    private final GroupPollVoteRepository groupPollVoteRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final SimpMessagingTemplate messagingTemplate;
    private final TransactionTemplate transactionTemplate;

    @Override
    @Transactional
    public GroupResponse createGroup(CreateGroupRequest request) {
        User me = currentUserService.getCurrentUser();
        GroupChat groupChat = GroupChat.builder()
            .groupName(request.getGroupName().trim())
            .description(request.getDescription() == null ? "" : request.getDescription().trim())
            .groupImageUrl(request.getGroupImageUrl())
            .createdBy(me)
            .build();
        GroupChat saved = groupChatRepository.save(groupChat);

        GroupMember adminMember = GroupMember.builder()
            .groupChat(saved)
            .user(me)
            .role(GroupRole.ADMIN)
            .build();
        groupMemberRepository.save(adminMember);

        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            addMembers(saved.getId(), request.getMemberIds(), me.getId());
        }

        broadcastGroupState(saved.getId(), "GROUP_ADDED", me.getId(), null, "You were added to a group.");
        return toGroupResponse(saved, me.getId());
    }

    @Override
    @Transactional
    public GroupResponse updateGroupImage(Long groupId, String groupImageUrl) {
        UpdateGroupProfileRequest request = new UpdateGroupProfileRequest();
        request.setGroupImageUrl(groupImageUrl);
        return updateGroupProfile(groupId, request);
    }

    @Override
    @Transactional
    public GroupResponse updateGroupProfile(Long groupId, UpdateGroupProfileRequest request) {
        User me = currentUserService.getCurrentUser();
        assertAdmin(groupId, me.getId());
        GroupChat groupChat = getGroup(groupId);
        boolean changed = false;

        if (request != null && request.getGroupName() != null) {
            String nextName = request.getGroupName().trim();
            if (nextName.isBlank()) {
                throw new IllegalArgumentException("Group name cannot be empty.");
            }
            if (!Objects.equals(groupChat.getGroupName(), nextName)) {
                groupChat.setGroupName(nextName);
                changed = true;
            }
        }

        if (request != null && request.getDescription() != null) {
            String nextDescription = request.getDescription().trim();
            if (!Objects.equals(groupChat.getDescription(), nextDescription)) {
                groupChat.setDescription(nextDescription);
                changed = true;
            }
        }

        if (request != null && request.getGroupImageUrl() != null) {
            String nextImageUrl = normalizeImageUrl(request.getGroupImageUrl());
            if (!Objects.equals(groupChat.getGroupImageUrl(), nextImageUrl)) {
                groupChat.setGroupImageUrl(nextImageUrl);
                changed = true;
            }
        }

        if (!changed) {
            return toGroupResponse(groupChat, me.getId());
        }

        GroupChat updated = groupChatRepository.save(groupChat);
        broadcastGroupState(groupId, "GROUP_UPDATED", me.getId(), null, "Group was updated.");
        return toGroupResponse(updated, me.getId());
    }

    @Override
    @Transactional
    public void addUsers(Long groupId, AddGroupMembersRequest request) {
        User me = currentUserService.getCurrentUser();
        assertAdmin(groupId, me.getId());
        List<User> addedUsers = addMembers(groupId, request.getUserIds(), me.getId());
        List<Long> addedUserIds = addedUsers.stream().map(User::getId).toList();
        Long actorUserId = me.getId();
        String actorName = resolveDisplayName(me);

        runAfterCommitOrNow(() -> transactionTemplate.executeWithoutResult(status -> {
            GroupChat groupChat = getGroup(groupId);
            if (!addedUserIds.isEmpty()) {
                List<User> freshAddedUsers = userRepository.findAllById(addedUserIds);
                sendGroupAddedEvents(groupChat, freshAddedUsers, actorUserId, actorName);
            }
            broadcastGroupState(groupId, "GROUP_UPDATED", actorUserId, null, "Group members updated.");
        }));
    }

    @Override
    @Transactional
    public void removeUser(Long groupId, Long userId) {
        User me = currentUserService.getCurrentUser();
        assertAdmin(groupId, me.getId());
        if (userId.equals(me.getId())) {
            throw new IllegalArgumentException("Use leave group API to remove yourself.");
        }

        GroupChat groupChat = getGroup(groupId);
        if (groupChat.getCreatedBy().getId().equals(userId) && !groupChat.getCreatedBy().getId().equals(me.getId())) {
            throw new IllegalArgumentException("Only group creator can remove the creator account from group ownership.");
        }

        GroupMember membership = groupMemberRepository.findByGroupChatIdAndUserId(groupId, userId)
            .orElseThrow(() -> new IllegalArgumentException("User is not a group member."));
        groupMemberRepository.delete(membership);
        ensureAtLeastOneAdmin(groupId);

        sendGroupRemovedEvent(membership.getUser(), groupId, me.getId(), userId, "You were removed from this group.");
        broadcastGroupState(groupId, "GROUP_UPDATED", me.getId(), userId, "Group members updated.");
    }

    @Override
    @Transactional
    public void updateMemberRole(Long groupId, Long userId, UpdateGroupMemberRoleRequest request) {
        User me = currentUserService.getCurrentUser();
        GroupChat groupChat = getGroup(groupId);
        GroupMember actor = groupMemberRepository.findByGroupChatIdAndUserId(groupId, me.getId())
            .orElseThrow(() -> new IllegalArgumentException("You are not a group member."));
        GroupMember target = groupMemberRepository.findByGroupChatIdAndUserId(groupId, userId)
            .orElseThrow(() -> new IllegalArgumentException("Target user is not a group member."));

        GroupRole nextRole = request.getRole();
        if (nextRole == null) {
            throw new IllegalArgumentException("Role is required.");
        }
        if (target.getRole() == nextRole) {
            return;
        }

        boolean actorIsCreator = groupChat.getCreatedBy().getId().equals(me.getId());
        boolean actorIsAdmin = actor.getRole() == GroupRole.ADMIN;

        if (nextRole == GroupRole.ADMIN) {
            if (!actorIsAdmin) {
                throw new IllegalArgumentException("Only admins can promote members to admin.");
            }
        } else {
            if (target.getRole() == GroupRole.ADMIN) {
                boolean selfDemotion = target.getUser().getId().equals(me.getId());
                if (!selfDemotion && !actorIsCreator) {
                    throw new IllegalArgumentException("Only group creator can remove admin role from other users.");
                }
                if (groupMemberRepository.countByGroupChatIdAndRole(groupId, GroupRole.ADMIN) <= 1) {
                    throw new IllegalArgumentException("At least one admin must remain in the group.");
                }
            }
        }

        target.setRole(nextRole);
        groupMemberRepository.save(target);
        broadcastGroupState(groupId, "GROUP_UPDATED", me.getId(), userId, "Group member role updated.");
    }

    @Override
    @Transactional
    public void leaveGroup(Long groupId) {
        User me = currentUserService.getCurrentUser();
        GroupMember membership = groupMemberRepository.findByGroupChatIdAndUserId(groupId, me.getId())
            .orElseThrow(() -> new IllegalArgumentException("You are not a group member."));
        GroupChat group = membership.getGroupChat();

        groupMemberRepository.delete(membership);
        sendGroupRemovedEvent(me, groupId, me.getId(), me.getId(), "You left this group.");

        List<GroupMember> remainingMembers = groupMemberRepository.findAllByGroupChatId(groupId);
        if (remainingMembers.isEmpty()) {
            deleteGroupCascade(group);
            return;
        }

        if (group.getCreatedBy().getId().equals(me.getId())) {
            GroupMember nextOwner = remainingMembers.stream()
                .min(Comparator.comparing(GroupMember::getJoinedAt))
                .orElse(remainingMembers.get(0));
            group.setCreatedBy(nextOwner.getUser());
            groupChatRepository.save(group);
        }

        ensureAtLeastOneAdmin(groupId);
        broadcastGroupState(groupId, "GROUP_UPDATED", me.getId(), me.getId(), "Group members updated.");
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupResponse> getMyGroups() {
        User me = currentUserService.getCurrentUser();
        List<GroupMember> memberships = groupMemberRepository.findAllByUserId(me.getId());
        return memberships.stream()
            .map(GroupMember::getGroupChat)
            .distinct()
            .map(group -> toGroupResponse(group, me.getId()))
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GroupResponse getGroupDetails(Long groupId) {
        User me = currentUserService.getCurrentUser();
        assertMember(groupId, me.getId());
        return toGroupResponse(getGroup(groupId), me.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupMemberResponse> getGroupMembers(Long groupId) {
        User me = currentUserService.getCurrentUser();
        assertMember(groupId, me.getId());
        return groupMemberRepository.findAllByGroupChatId(groupId)
            .stream()
            .sorted(Comparator.comparing(GroupMember::getJoinedAt))
            .map(this::toGroupMemberResponse)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupMessageResponse> getGroupMessages(Long groupId) {
        User me = currentUserService.getCurrentUser();
        // Client can briefly send a stale groupId after auth/account switch.
        // Returning an empty message list avoids hard-failing the chat screen.
        if (!groupMemberRepository.existsByGroupChatIdAndUserId(groupId, me.getId())) {
            return List.of();
        }
        return groupMessageRepository.findByGroupChatIdOrderByCreatedAtAsc(groupId)
            .stream()
            .map(message -> toMessageResponse(message, me.getId()))
            .toList();
    }

    @Override
    @Transactional
    public GroupMessageResponse sendMessage(GroupMessageRequest request) {
        User me = currentUserService.getCurrentUser();
        assertMember(request.getGroupId(), me.getId());
        GroupChat groupChat = getGroup(request.getGroupId());
        GroupMessage replyToMessage = resolveReplyToMessage(request.getReplyToMessageId(), request.getGroupId());

        MessageType type = request.getMessageType() == null ? MessageType.TEXT : request.getMessageType();
        if (type == MessageType.POLL) {
            throw new IllegalArgumentException("Use poll API to create poll messages.");
        }
        if (type == MessageType.TEXT && (request.getContent() == null || request.getContent().isBlank())) {
            throw new IllegalArgumentException("Text message content is required.");
        }
        if (type != MessageType.TEXT && type != MessageType.POLL && (request.getMediaUrl() == null || request.getMediaUrl().isBlank())) {
            throw new IllegalArgumentException("Media URL is required for non-text messages.");
        }

        GroupMessage message = GroupMessage.builder()
            .groupChat(groupChat)
            .sender(me)
            .replyToMessage(replyToMessage)
            .content(request.getContent() == null ? "" : request.getContent().trim())
            .messageType(type)
            .mediaUrl(request.getMediaUrl())
            .build();
        GroupMessage saved = groupMessageRepository.save(message);
        markMessageSeen(saved, me);

        GroupMessageResponse response = toMessageResponse(saved, me.getId());
        messagingTemplate.convertAndSend("/topic/group/" + request.getGroupId(), response);
        notifyMentionedMembers(groupChat, saved, me);
        return response;
    }

    @Override
    @Transactional
    public void deleteOwnMessage(Long groupId, Long messageId) {
        User me = currentUserService.getCurrentUser();
        assertMember(groupId, me.getId());

        GroupMessage message = groupMessageRepository.findByIdAndGroupChatId(messageId, groupId)
            .orElseThrow(() -> new IllegalArgumentException("Group message not found."));
        if (!message.getSender().getId().equals(me.getId())) {
            throw new IllegalArgumentException("You can delete only your own group messages.");
        }

        List<GroupMessage> replies = groupMessageRepository.findByReplyToMessageIdIn(List.of(message.getId()));
        if (!replies.isEmpty()) {
            for (GroupMessage reply : replies) {
                reply.setReplyToMessage(null);
            }
            groupMessageRepository.saveAll(replies);
        }

        groupMessageSeenRepository.deleteAllByMessageId(message.getId());

        GroupPoll poll = message.getPoll();
        if (poll == null) {
            poll = groupPollRepository.findByMessageId(message.getId()).orElse(null);
        }
        if (poll != null) {
            groupPollRepository.delete(poll);
        }

        groupMessageRepository.delete(message);
        groupMessageRepository.flush();

        GroupMessageDeletedEventResponse event = new GroupMessageDeletedEventResponse();
        event.setGroupId(groupId);
        event.setMessageId(messageId);
        event.setDeletedByUserId(me.getId());
        messagingTemplate.convertAndSend("/topic/group/" + groupId + "/message-deleted", event);
    }

    @Override
    @Transactional
    public GroupMessageResponse createPoll(CreateGroupPollRequest request) {
        User me = currentUserService.getCurrentUser();
        assertMember(request.getGroupId(), me.getId());
        GroupChat groupChat = getGroup(request.getGroupId());

        String question = request.getQuestion() == null ? "" : request.getQuestion().trim();
        if (question.isBlank()) {
            throw new IllegalArgumentException("Poll question is required.");
        }

        List<String> sanitizedOptions = sanitizePollOptions(request.getOptions());
        if (sanitizedOptions.size() < 2) {
            throw new IllegalArgumentException("Poll requires at least two unique options.");
        }

        GroupMessage message = GroupMessage.builder()
            .groupChat(groupChat)
            .sender(me)
            .content(question)
            .messageType(MessageType.POLL)
            .mediaUrl(null)
            .build();
        GroupMessage savedMessage = groupMessageRepository.save(message);
        markMessageSeen(savedMessage, me);

        GroupPoll poll = GroupPoll.builder()
            .groupChat(groupChat)
            .message(savedMessage)
            .createdBy(me)
            .question(question)
            .anonymous(request.isAnonymous())
            .build();
        List<GroupPollOption> options = sanitizedOptions.stream()
            .map(option -> GroupPollOption.builder().poll(poll).optionText(option).build())
            .toList();
        poll.getOptions().addAll(options);
        groupPollRepository.save(poll);

        GroupMessageResponse response = toMessageResponse(savedMessage, me.getId());
        messagingTemplate.convertAndSend("/topic/group/" + request.getGroupId(), response);
        return response;
    }

    @Override
    @Transactional
    public GroupPollResponse votePoll(Long groupId, Long pollId, VoteGroupPollRequest request) {
        User me = currentUserService.getCurrentUser();
        assertMember(groupId, me.getId());

        GroupPoll poll = groupPollRepository.findByIdAndGroupChatId(pollId, groupId)
            .orElseThrow(() -> new IllegalArgumentException("Poll not found."));
        GroupPollOption option = groupPollOptionRepository.findByIdAndPollId(request.getOptionId(), pollId)
            .orElseThrow(() -> new IllegalArgumentException("Poll option not found."));

        GroupPollVote existingVote = groupPollVoteRepository.findByPollIdAndUserId(pollId, me.getId()).orElse(null);
        if (existingVote == null) {
            GroupPollVote newVote = GroupPollVote.builder()
                .poll(poll)
                .option(option)
                .user(me)
                .build();
            groupPollVoteRepository.save(newVote);
        } else {
            existingVote.setOption(option);
            groupPollVoteRepository.save(existingVote);
        }

        GroupPollResponse response = toPollResponse(poll, me.getId());

        GroupPollUpdatedEventResponse event = new GroupPollUpdatedEventResponse();
        event.setGroupId(groupId);
        event.setMessageId(poll.getMessage().getId());
        event.setPoll(response);
        messagingTemplate.convertAndSend("/topic/group/" + groupId + "/polls", event);

        return response;
    }

    @Override
    @Transactional
    public void markMessagesSeen(Long groupId, MarkGroupMessagesSeenRequest request) {
        User me = currentUserService.getCurrentUser();
        assertMember(groupId, me.getId());
        if (request.getMessageIds() == null || request.getMessageIds().isEmpty()) {
            return;
        }

        List<Long> messageIds = request.getMessageIds().stream()
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (messageIds.isEmpty()) {
            return;
        }

        List<GroupMessage> messages = groupMessageRepository.findAllById(messageIds);
        for (GroupMessage message : messages) {
            if (!message.getGroupChat().getId().equals(groupId)) {
                continue;
            }
            if (message.getSender().getId().equals(me.getId())) {
                continue;
            }
            GroupMessageSeen seen = markMessageSeen(message, me);
            if (seen == null) {
                continue;
            }
            GroupMessageSeenEventResponse event = new GroupMessageSeenEventResponse();
            event.setGroupId(groupId);
            event.setMessageId(message.getId());
            event.setSeenBy(toSeenByResponse(seen));
            messagingTemplate.convertAndSend("/topic/group/" + groupId + "/message-seen", event);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canAccessMediaUrl(Long userId, String mediaUrl) {
        List<Long> groupIds = groupMemberRepository.findAllByUserId(userId)
            .stream()
            .map(member -> member.getGroupChat().getId())
            .distinct()
            .toList();
        if (groupIds.isEmpty()) {
            return false;
        }
        return groupMessageRepository.existsByMediaUrlAndGroupChatIdIn(mediaUrl, groupIds);
    }

    @Override
    @Transactional
    public void cleanupUserData(Long userId) {
        List<GroupChat> createdGroups = groupChatRepository.findAllByCreatedById(userId);
        for (GroupChat group : createdGroups) {
            List<GroupMember> members = groupMemberRepository.findAllByGroupChatId(group.getId())
                .stream()
                .filter(member -> !member.getUser().getId().equals(userId))
                .toList();

            if (members.isEmpty()) {
                deleteGroupCascade(group);
                continue;
            }

            GroupMember replacement = members.stream()
                .min(Comparator.comparing(GroupMember::getJoinedAt))
                .orElse(members.get(0));
            group.setCreatedBy(replacement.getUser());
            groupChatRepository.save(group);
        }

        groupPollVoteRepository.deleteAllByUserId(userId);
        groupMessageSeenRepository.deleteAllByUserId(userId);

        List<GroupMessage> sentMessages = groupMessageRepository.findBySenderId(userId);
        if (!sentMessages.isEmpty()) {
            List<Long> sentMessageIds = sentMessages.stream()
                .map(GroupMessage::getId)
                .toList();

            List<GroupMessage> replies = groupMessageRepository.findByReplyToMessageIdIn(sentMessageIds);
            if (!replies.isEmpty()) {
                for (GroupMessage reply : replies) {
                    reply.setReplyToMessage(null);
                }
                groupMessageRepository.saveAll(replies);
            }

            groupMessageRepository.deleteAll(sentMessages);
        }

        groupMemberRepository.deleteAllByUserId(userId);
        groupPollVoteRepository.flush();
        groupMessageSeenRepository.flush();
        groupMessageRepository.flush();
        groupMemberRepository.flush();
    }

    private List<User> addMembers(Long groupId, List<Long> memberIds, Long actorId) {
        if (memberIds == null || memberIds.isEmpty()) {
            return List.of();
        }

        GroupChat groupChat = getGroup(groupId);
        Set<Long> ids = new HashSet<>(memberIds);
        ids.remove(actorId);
        if (ids.isEmpty()) {
            return List.of();
        }

        List<User> users = userRepository.findAllById(ids);
        if (users.size() != ids.size()) {
            throw new IllegalArgumentException("One or more users do not exist.");
        }

        List<User> addedUsers = new ArrayList<>();
        for (User user : users) {
            if (groupMemberRepository.existsByGroupChatIdAndUserId(groupId, user.getId())) {
                continue;
            }
            GroupMember member = GroupMember.builder()
                .groupChat(groupChat)
                .user(user)
                .role(GroupRole.MEMBER)
                .build();
            groupMemberRepository.save(member);
            addedUsers.add(user);
        }
        return addedUsers;
    }

    private void assertMember(Long groupId, Long userId) {
        if (!groupMemberRepository.existsByGroupChatIdAndUserId(groupId, userId)) {
            throw new IllegalArgumentException("You are not a member of this group.");
        }
    }

    private void assertAdmin(Long groupId, Long userId) {
        GroupMember member = groupMemberRepository.findByGroupChatIdAndUserId(groupId, userId)
            .orElseThrow(() -> new IllegalArgumentException("You are not a group member."));
        if (member.getRole() != GroupRole.ADMIN) {
            throw new IllegalArgumentException("Only group admins can perform this action.");
        }
    }

    private GroupChat getGroup(Long groupId) {
        return groupChatRepository.findById(groupId)
            .orElseThrow(() -> new IllegalArgumentException("Group not found."));
    }

    private void ensureAtLeastOneAdmin(Long groupId) {
        if (groupMemberRepository.countByGroupChatIdAndRole(groupId, GroupRole.ADMIN) > 0) {
            return;
        }
        groupMemberRepository.findFirstByGroupChatIdOrderByJoinedAtAsc(groupId).ifPresent(member -> {
            member.setRole(GroupRole.ADMIN);
            groupMemberRepository.save(member);
        });
    }

    private void deleteGroupCascade(GroupChat group) {
        List<GroupMessage> messages = groupMessageRepository.findByGroupChatIdOrderByCreatedAtAsc(group.getId());
        groupMessageRepository.deleteAll(messages);
        groupMemberRepository.deleteAllByGroupChatId(group.getId());
        groupChatRepository.delete(group);
    }

    private GroupMessageSeen markMessageSeen(GroupMessage message, User user) {
        if (groupMessageSeenRepository.existsByMessageIdAndUserId(message.getId(), user.getId())) {
            return null;
        }
        GroupMessageSeen seen = GroupMessageSeen.builder()
            .message(message)
            .user(user)
            .build();
        return groupMessageSeenRepository.save(seen);
    }

    private GroupResponse toGroupResponse(GroupChat groupChat, Long currentUserId) {
        List<GroupMember> members = groupMemberRepository.findAllByGroupChatId(groupChat.getId());
        Map<Long, GroupMember> memberByUserId = members.stream()
            .collect(Collectors.toMap(member -> member.getUser().getId(), Function.identity()));
        GroupMember currentUserMembership = memberByUserId.get(currentUserId);
        GroupMessage latestMessage = groupMessageRepository.findTopByGroupChatIdOrderByCreatedAtDesc(groupChat.getId()).orElse(null);

        GroupResponse response = new GroupResponse();
        response.setId(groupChat.getId());
        response.setGroupName(groupChat.getGroupName());
        response.setGroupImageUrl(groupChat.getGroupImageUrl());
        response.setDescription(groupChat.getDescription());
        response.setCreatedById(groupChat.getCreatedBy().getId());
        response.setCreatedByName(resolveDisplayName(groupChat.getCreatedBy()));
        response.setCreatedByProfileImageUrl(groupChat.getCreatedBy().getProfileImageUrl());
        response.setMemberCount(members.size());
        response.setCurrentUserAdmin(currentUserMembership != null && currentUserMembership.getRole() == GroupRole.ADMIN);
        response.setCurrentUserRole(currentUserMembership == null ? null : currentUserMembership.getRole().name());
        response.setLastMessage(latestMessage == null ? "" : buildGroupListPreview(latestMessage));
        response.setLastMessageAt(latestMessage == null ? null : latestMessage.getCreatedAt());
        response.setMessageCount(groupMessageRepository.countByGroupChatId(groupChat.getId()));
        response.setUnreadCount(groupMessageRepository.countUnreadForUser(groupChat.getId(), currentUserId));
        response.setMembers(
            members.stream()
                .sorted(Comparator.comparing(GroupMember::getJoinedAt))
                .map(this::toGroupMemberResponse)
                .toList()
        );
        response.setCreatedAt(groupChat.getCreatedAt());
        return response;
    }

    private GroupMemberResponse toGroupMemberResponse(GroupMember member) {
        GroupMemberResponse response = new GroupMemberResponse();
        response.setId(member.getId());
        response.setUserId(member.getUser().getId());
        response.setUsername(member.getUser().getUsername());
        response.setDisplayName(resolveDisplayName(member.getUser()));
        response.setProfileImageUrl(member.getUser().getProfileImageUrl());
        response.setOnline(Boolean.TRUE.equals(member.getUser().getOnline()));
        response.setLastSeen(member.getUser().getLastSeen());
        response.setRole(member.getRole().name());
        response.setJoinedAt(member.getJoinedAt());
        return response;
    }

    private GroupMessageResponse toMessageResponse(GroupMessage message, Long currentUserId) {
        GroupMessageResponse response = new GroupMessageResponse();
        response.setId(message.getId());
        response.setGroupId(message.getGroupChat().getId());
        response.setSenderId(message.getSender().getId());
        response.setSenderName(resolveDisplayName(message.getSender()));
        response.setContent(message.getContent());
        response.setMessageType(message.getMessageType());
        response.setMediaUrl(message.getMediaUrl());
        GroupMessage replyToMessage = message.getReplyToMessage();
        if (replyToMessage != null) {
            response.setReplyToMessageId(replyToMessage.getId());
            response.setReplyToSenderId(replyToMessage.getSender().getId());
            response.setReplyToSenderName(resolveDisplayName(replyToMessage.getSender()));
            response.setReplyToMessageType(replyToMessage.getMessageType());
            response.setReplyToContent(buildReplyPreview(replyToMessage));
        }
        response.setSeenBy(
            groupMessageSeenRepository.findByMessageId(message.getId()).stream()
                .sorted(Comparator.comparing(GroupMessageSeen::getSeenAt))
                .map(this::toSeenByResponse)
                .toList()
        );

        GroupPoll poll = message.getPoll();
        if (poll == null && message.getMessageType() == MessageType.POLL) {
            poll = groupPollRepository.findByMessageId(message.getId()).orElse(null);
        }
        if (poll != null) {
            response.setPoll(toPollResponse(poll, currentUserId));
        }

        response.setCreatedAt(message.getCreatedAt());
        return response;
    }

    private GroupMessageSeenByResponse toSeenByResponse(GroupMessageSeen seen) {
        GroupMessageSeenByResponse response = new GroupMessageSeenByResponse();
        response.setUserId(seen.getUser().getId());
        response.setUsername(seen.getUser().getUsername());
        response.setDisplayName(resolveDisplayName(seen.getUser()));
        response.setProfileImageUrl(seen.getUser().getProfileImageUrl());
        response.setSeenAt(seen.getSeenAt());
        return response;
    }

    private GroupPollResponse toPollResponse(GroupPoll poll, Long currentUserId) {
        List<GroupPollVote> votes = groupPollVoteRepository.findByPollId(poll.getId());
        Map<Long, Long> voteCountByOptionId = votes.stream()
            .collect(Collectors.groupingBy(vote -> vote.getOption().getId(), Collectors.counting()));
        Set<Long> currentUserVotes = votes.stream()
            .filter(vote -> vote.getUser().getId().equals(currentUserId))
            .map(vote -> vote.getOption().getId())
            .collect(Collectors.toSet());

        GroupPollResponse response = new GroupPollResponse();
        response.setId(poll.getId());
        response.setGroupId(poll.getGroupChat().getId());
        response.setMessageId(poll.getMessage().getId());
        response.setQuestion(poll.getQuestion());
        response.setAnonymous(poll.isAnonymous());
        response.setCreatedById(poll.getCreatedBy().getId());
        response.setCreatedByName(resolveDisplayName(poll.getCreatedBy()));
        response.setCreatedAt(poll.getCreatedAt());

        List<GroupPollOptionResponse> options = poll.getOptions().stream()
            .map(option -> {
                GroupPollOptionResponse optionResponse = new GroupPollOptionResponse();
                optionResponse.setId(option.getId());
                optionResponse.setOptionText(option.getOptionText());
                optionResponse.setVoteCount(voteCountByOptionId.getOrDefault(option.getId(), 0L));
                optionResponse.setVotedByCurrentUser(currentUserVotes.contains(option.getId()));
                return optionResponse;
            })
            .toList();
        response.setOptions(options);
        response.setTotalVotes(votes.size());
        return response;
    }

    private List<String> sanitizePollOptions(List<String> options) {
        if (options == null) {
            return List.of();
        }
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String option : options) {
            if (option == null) {
                continue;
            }
            String normalized = option.trim();
            if (!normalized.isBlank()) {
                unique.add(normalized);
            }
        }
        return new ArrayList<>(unique);
    }

    private GroupMessage resolveReplyToMessage(Long replyToMessageId, Long groupId) {
        if (replyToMessageId == null) {
            return null;
        }
        GroupMessage replyToMessage = groupMessageRepository.findById(replyToMessageId)
            .orElseThrow(() -> new IllegalArgumentException("Reply message not found."));
        if (!Objects.equals(replyToMessage.getGroupChat().getId(), groupId)) {
            throw new IllegalArgumentException("Reply message does not belong to this group.");
        }
        return replyToMessage;
    }

    private String buildReplyPreview(GroupMessage message) {
        if (message == null) {
            return "";
        }
        String content = message.getContent() == null ? "" : message.getContent().trim();
        if (!content.isBlank()) {
            return content;
        }
        return switch (message.getMessageType()) {
            case IMAGE -> "Photo";
            case VIDEO -> "Video";
            case FILE -> "File";
            case POLL -> "Poll";
            case TEXT -> "Message";
        };
    }

    private String buildGroupListPreview(GroupMessage message) {
        if (message == null) {
            return "";
        }

        String senderName = resolveDisplayName(message.getSender());
        String content = message.getContent() == null ? "" : message.getContent().trim();
        String preview = switch (message.getMessageType()) {
            case TEXT -> content;
            case IMAGE -> "Photo";
            case VIDEO -> "Video";
            case FILE -> "File";
            case POLL -> content.isBlank() ? "Poll" : "Poll: " + content;
        };
        if (preview == null || preview.isBlank()) {
            preview = "Message";
        }
        return senderName + ": " + preview;
    }

    private String normalizeImageUrl(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private void broadcastGroupState(Long groupId, String type, Long actorUserId, Long targetUserId, String message) {
        GroupChat groupChat = getGroup(groupId);
        List<GroupMember> members = groupMemberRepository.findAllByGroupChatId(groupId);
        for (GroupMember member : members) {
            GroupRealtimeEventResponse event = new GroupRealtimeEventResponse();
            event.setType(type);
            event.setGroupId(groupId);
            event.setGroup(toGroupResponse(groupChat, member.getUser().getId()));
            event.setActorUserId(actorUserId);
            event.setTargetUserId(targetUserId);
            event.setMessage(message);
            messagingTemplate.convertAndSendToUser(member.getUser().getUsername(), "/queue/group-events", event);
        }
    }

    private void sendGroupRemovedEvent(User user, Long groupId, Long actorUserId, Long targetUserId, String message) {
        GroupRealtimeEventResponse event = new GroupRealtimeEventResponse();
        event.setType("GROUP_REMOVED");
        event.setGroupId(groupId);
        event.setActorUserId(actorUserId);
        event.setTargetUserId(targetUserId);
        event.setMessage(message);
        messagingTemplate.convertAndSendToUser(user.getUsername(), "/queue/group-events", event);
    }

    private void sendGroupAddedEvents(GroupChat groupChat, List<User> addedUsers, Long actorUserId, String actorName) {
        if (groupChat == null || addedUsers == null || addedUsers.isEmpty() || actorUserId == null) {
            return;
        }

        String displayActorName = actorName == null || actorName.isBlank() ? "Someone" : actorName;
        String groupName = groupChat.getGroupName() == null || groupChat.getGroupName().isBlank()
            ? "group chat"
            : groupChat.getGroupName();

        for (User addedUser : addedUsers) {
            if (addedUser == null || addedUser.getUsername() == null || addedUser.getUsername().isBlank()) {
                continue;
            }
            GroupRealtimeEventResponse event = new GroupRealtimeEventResponse();
            event.setType("GROUP_ADDED");
            event.setGroupId(groupChat.getId());
            event.setGroup(toGroupResponse(groupChat, addedUser.getId()));
            event.setActorUserId(actorUserId);
            event.setTargetUserId(addedUser.getId());
            event.setMessage(displayActorName + " added you to " + groupName + ".");
            messagingTemplate.convertAndSendToUser(addedUser.getUsername(), "/queue/group-events", event);
        }
    }

    private void runAfterCommitOrNow(Runnable action) {
        if (action == null) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()
            && TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
            return;
        }
        action.run();
    }

    private void notifyMentionedMembers(GroupChat groupChat, GroupMessage message, User actor) {
        if (groupChat == null || message == null || actor == null) {
            return;
        }

        List<GroupMember> members = groupMemberRepository.findAllByGroupChatId(groupChat.getId());
        if (members.isEmpty()) {
            return;
        }

        Map<String, GroupMember> membersByUsername = new HashMap<>();
        for (GroupMember member : members) {
            String username = member.getUser().getUsername();
            if (username == null || username.isBlank()) {
                continue;
            }
            membersByUsername.put(username.toLowerCase(Locale.ROOT), member);
        }

        LinkedHashSet<Long> mentionTargetUserIds = new LinkedHashSet<>();
        String content = message.getContent() == null ? "" : message.getContent();
        Matcher matcher = USER_MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            String username = matcher.group(1);
            if (username == null || username.isBlank()) {
                continue;
            }
            GroupMember member = membersByUsername.get(username.toLowerCase(Locale.ROOT));
            if (member == null || member.getUser().getId().equals(actor.getId())) {
                continue;
            }
            mentionTargetUserIds.add(member.getUser().getId());
        }

        Long replyTargetUserId = null;
        GroupMessage replyToMessage = message.getReplyToMessage();
        if (replyToMessage != null && replyToMessage.getSender() != null) {
            Long candidate = replyToMessage.getSender().getId();
            if (!candidate.equals(actor.getId())) {
                replyTargetUserId = candidate;
            }
        }

        if (mentionTargetUserIds.isEmpty() && replyTargetUserId == null) {
            return;
        }

        String actorName = resolveDisplayName(actor);
        String groupName = groupChat.getGroupName() == null || groupChat.getGroupName().isBlank()
            ? "group chat"
            : groupChat.getGroupName();
        if (replyTargetUserId != null) {
            final Long replyTargetUserIdFinal = replyTargetUserId;
            GroupMember replyTargetMember = members.stream()
                .filter(member -> member.getUser().getId().equals(replyTargetUserIdFinal))
                .findFirst()
                .orElse(null);
            if (replyTargetMember != null) {
                GroupRealtimeEventResponse event = new GroupRealtimeEventResponse();
                event.setType("REPLY");
                event.setGroupId(groupChat.getId());
                event.setActorUserId(actor.getId());
                event.setTargetUserId(replyTargetUserIdFinal);
                event.setMessage(actorName + " replied to your message in " + groupName + ".");
                messagingTemplate.convertAndSendToUser(replyTargetMember.getUser().getUsername(), "/queue/group-events", event);
            }
            mentionTargetUserIds.remove(replyTargetUserIdFinal);
        }

        for (Long targetUserId : mentionTargetUserIds) {
            GroupMember targetMember = members.stream()
                .filter(member -> member.getUser().getId().equals(targetUserId))
                .findFirst()
                .orElse(null);
            if (targetMember == null) {
                continue;
            }
            GroupRealtimeEventResponse event = new GroupRealtimeEventResponse();
            event.setType("MENTION");
            event.setGroupId(groupChat.getId());
            event.setActorUserId(actor.getId());
            event.setTargetUserId(targetUserId);
            event.setMessage(actorName + " mentioned you in " + groupName + ".");
            messagingTemplate.convertAndSendToUser(targetMember.getUser().getUsername(), "/queue/group-events", event);
        }
    }

    private String resolveDisplayName(User user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName();
        }
        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String full = (first + " " + last).trim();
        return full.isBlank() ? user.getUsername() : full;
    }
}
