package com.yourname.chatapp.chat.groupchat.dto;

import com.yourname.chatapp.common.enums.GroupRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateGroupMemberRoleRequest {
    @NotNull(message = "Role is required.")
    private GroupRole role;
}
