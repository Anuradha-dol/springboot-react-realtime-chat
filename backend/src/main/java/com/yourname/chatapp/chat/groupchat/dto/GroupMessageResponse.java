package com.yourname.chatapp.chat.groupchat.dto;

import com.yourname.chatapp.common.enums.MessageType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class GroupMessageResponse {
    private Long id;
    private Long groupId;
    private Long senderId;
    private String senderName;
    private String content;
    private MessageType messageType;
    private String mediaUrl;
    private Long replyToMessageId;
    private Long replyToSenderId;
    private String replyToSenderName;
    private MessageType replyToMessageType;
    private String replyToContent;
    private GroupPollResponse poll;
    private List<GroupMessageSeenByResponse> seenBy;
    private LocalDateTime createdAt;
}
