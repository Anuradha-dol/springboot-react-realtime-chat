package com.yourname.chatapp.chat.privatechat.service;

import com.yourname.chatapp.chat.privatechat.dto.ConversationSummaryResponse;
import com.yourname.chatapp.chat.privatechat.dto.PrivateMessageResponse;
import com.yourname.chatapp.chat.privatechat.dto.SendPrivateMediaRequest;
import com.yourname.chatapp.chat.privatechat.dto.SendPrivateTextRequest;

import java.util.List;

public interface PrivateChatService {
    List<ConversationSummaryResponse> getMyConversations();

    List<PrivateMessageResponse> getConversation(Long otherUserId);

    PrivateMessageResponse sendText(SendPrivateTextRequest request);

    PrivateMessageResponse sendMedia(SendPrivateMediaRequest request);

    void markAsRead(Long messageId);

    void deleteForMe(Long messageId);

    void deleteForEveryone(Long messageId);

    boolean canAccessMediaUrl(Long userId, String mediaUrl);

    void cleanupUserData(Long userId);
}
