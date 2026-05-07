package com.yourname.chatapp.chat.groupchat.controller;

import com.yourname.chatapp.chat.groupchat.dto.*;
import com.yourname.chatapp.chat.groupchat.service.GroupChatService;
import com.yourname.chatapp.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/groups", "/api/chats/groups"})
@RequiredArgsConstructor
public class GroupChatController {
    private final GroupChatService groupChatService;

    // Creates a new group.
    @PostMapping
    public ResponseEntity<ApiResponse<GroupResponse>> createGroup(@Valid @RequestBody CreateGroupRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Group created.", groupChatService.createGroup(request)));
    }

    @PatchMapping("/{groupId}/image")
    public ResponseEntity<ApiResponse<GroupResponse>> updateGroupImage(
        @PathVariable Long groupId,
        @RequestBody Map<String, String> payload
    ) {
        String groupImageUrl = payload.get("groupImageUrl");
        return ResponseEntity.ok(new ApiResponse<>(true, "Group image updated.", groupChatService.updateGroupImage(groupId, groupImageUrl)));
    }

    @PatchMapping("/{groupId}/profile")
    public ResponseEntity<ApiResponse<GroupResponse>> updateGroupProfile(
        @PathVariable Long groupId,
        @RequestBody UpdateGroupProfileRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Group profile updated.", groupChatService.updateGroupProfile(groupId, request)));
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<Void>> addUsers(@PathVariable Long groupId, @Valid @RequestBody AddGroupMembersRequest request) {
        groupChatService.addUsers(groupId, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Users added to group.", null));
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeUser(@PathVariable Long groupId, @PathVariable Long userId) {
        groupChatService.removeUser(groupId, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "User removed from group.", null));
    }

    @PatchMapping("/{groupId}/members/{userId}/role")
    public ResponseEntity<ApiResponse<Void>> updateMemberRole(
        @PathVariable Long groupId,
        @PathVariable Long userId,
        @Valid @RequestBody UpdateGroupMemberRoleRequest request
    ) {
        groupChatService.updateMemberRole(groupId, userId, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Member role updated.", null));
    }

    @PostMapping("/{groupId}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(@PathVariable Long groupId) {
        groupChatService.leaveGroup(groupId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Left group.", null));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<GroupResponse>>> getMyGroups() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Groups loaded.", groupChatService.getMyGroups()));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupResponse>> getGroupDetails(@PathVariable Long groupId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Group details loaded.", groupChatService.getGroupDetails(groupId)));
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<List<GroupMemberResponse>>> getGroupMembers(@PathVariable Long groupId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Group members loaded.", groupChatService.getGroupMembers(groupId)));
    }

    @GetMapping("/{groupId}/messages")
    public ResponseEntity<ApiResponse<List<GroupMessageResponse>>> getGroupMessages(@PathVariable Long groupId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Group messages loaded.", groupChatService.getGroupMessages(groupId)));
    }

    // Sends a group message.
    @PostMapping({"/messages", "/group-messages"})
    public ResponseEntity<ApiResponse<GroupMessageResponse>> sendGroupMessage(@Valid @RequestBody GroupMessageRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Group message sent.", groupChatService.sendMessage(request)));
    }

    @DeleteMapping("/{groupId}/messages/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteOwnGroupMessage(
        @PathVariable Long groupId,
        @PathVariable Long messageId
    ) {
        groupChatService.deleteOwnMessage(groupId, messageId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Group message deleted.", null));
    }

    @PostMapping("/{groupId}/messages/seen")
    public ResponseEntity<ApiResponse<Void>> markMessagesSeen(
        @PathVariable Long groupId,
        @Valid @RequestBody MarkGroupMessagesSeenRequest request
    ) {
        groupChatService.markMessagesSeen(groupId, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Group message seen state updated.", null));
    }

    // Creates a poll in a group.
    @PostMapping({"/polls", "/group-polls"})
    public ResponseEntity<ApiResponse<GroupMessageResponse>> createPoll(@Valid @RequestBody CreateGroupPollRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Poll created.", groupChatService.createPoll(request)));
    }

    @PostMapping("/{groupId}/polls/{pollId}/vote")
    public ResponseEntity<ApiResponse<GroupPollResponse>> votePoll(
        @PathVariable Long groupId,
        @PathVariable Long pollId,
        @Valid @RequestBody VoteGroupPollRequest request
    ) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Poll vote updated.", groupChatService.votePoll(groupId, pollId, request)));
    }
}
