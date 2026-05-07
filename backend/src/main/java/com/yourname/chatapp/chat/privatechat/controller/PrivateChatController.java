package com.yourname.chatapp.chat.privatechat.controller;

import com.yourname.chatapp.chat.privatechat.dto.ConversationSummaryResponse;
import com.yourname.chatapp.chat.privatechat.dto.PrivateMessageResponse;
import com.yourname.chatapp.chat.privatechat.dto.SendPrivateMediaRequest;
import com.yourname.chatapp.chat.privatechat.dto.SendPrivateTextRequest;
import com.yourname.chatapp.chat.privatechat.service.PrivateChatService;
import com.yourname.chatapp.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/private-chats", "/api/chats/private"})
@RequiredArgsConstructor
public class PrivateChatController {
    private final PrivateChatService privateChatService;

    // Returns chat list for the current user.
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationSummaryResponse>>> getConversations() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Conversations loaded.", privateChatService.getMyConversations()));
    }

    // Returns messages between current user and target user.
    @GetMapping("/{userId}/messages")
    public ResponseEntity<ApiResponse<List<PrivateMessageResponse>>> getConversation(@PathVariable Long userId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Messages loaded.", privateChatService.getConversation(userId)));
    }

    // Sends a private text message.
    @PostMapping({"/text", "/messages/text"})
    public ResponseEntity<ApiResponse<PrivateMessageResponse>> sendText(@Valid @RequestBody SendPrivateTextRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Message sent.", privateChatService.sendText(request)));
    }

    // Sends a private media message.
    @PostMapping({"/media", "/messages/media"})
    public ResponseEntity<ApiResponse<PrivateMessageResponse>> sendMedia(@Valid @RequestBody SendPrivateMediaRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Media message sent.", privateChatService.sendMedia(request)));
    }

    // Marks one private message as read.
    @PatchMapping("/{messageId}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long messageId) {
        privateChatService.markAsRead(messageId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Message marked as read.", null));
    }

    // Deletes message only for current user.
    @DeleteMapping("/{messageId}/me")
    public ResponseEntity<ApiResponse<Void>> deleteForMe(@PathVariable Long messageId) {
        privateChatService.deleteForMe(messageId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Message deleted for you.", null));
    }

    // Deletes message for both users.
    @DeleteMapping("/{messageId}/everyone")
    public ResponseEntity<ApiResponse<Void>> deleteForEveryone(@PathVariable Long messageId) {
        privateChatService.deleteForEveryone(messageId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Message deleted for everyone.", null));
    }
}
