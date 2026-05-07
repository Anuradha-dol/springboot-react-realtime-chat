package com.yourname.chatapp.upload.enums;

public enum UploadCategory {
    PROFILE("profile", true),
    COVER("cover", true),
    CHAT_IMAGE("chat/images", false),
    CHAT_VIDEO("chat/videos", false),
    GROUP("group", true);

    private final String folder;
    private final boolean publicAccess;

    UploadCategory(String folder, boolean publicAccess) {
        this.folder = folder;
        this.publicAccess = publicAccess;
    }

    public String getFolder() {
        return folder;
    }

    public boolean isPublicAccess() {
        return publicAccess;
    }
}
