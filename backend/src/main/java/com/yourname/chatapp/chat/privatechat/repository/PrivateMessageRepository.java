package com.yourname.chatapp.chat.privatechat.repository;

import com.yourname.chatapp.chat.privatechat.entity.PrivateMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PrivateMessageRepository extends JpaRepository<PrivateMessage, Long> {
    @Query("""
        select m from PrivateMessage m
        where m.deletedForEveryone = false
          and (
            (m.sender.id = :currentUserId and m.receiver.id = :otherUserId and m.senderDeleted = false)
             or
            (m.sender.id = :otherUserId and m.receiver.id = :currentUserId and m.receiverDeleted = false)
          )
        order by m.createdAt asc
        """)
    List<PrivateMessage> findConversation(
        @Param("currentUserId") Long currentUserId,
        @Param("otherUserId") Long otherUserId
    );

    @Query("""
        select m from PrivateMessage m
        where (m.sender.id = :userId or m.receiver.id = :userId)
          and m.deletedForEveryone = false
          and ((m.sender.id = :userId and m.senderDeleted = false) or (m.receiver.id = :userId and m.receiverDeleted = false))
        order by m.createdAt desc
        """)
    List<PrivateMessage> findVisibleMessagesForUser(@Param("userId") Long userId);

    @Query("""
        select m from PrivateMessage m
        where m.id = :messageId
          and (m.sender.id = :userId or m.receiver.id = :userId)
        """)
    Optional<PrivateMessage> findByIdAndParticipant(@Param("messageId") Long messageId, @Param("userId") Long userId);

    boolean existsByMediaUrlAndSenderIdOrMediaUrlAndReceiverId(String mediaUrlForSender, Long senderId, String mediaUrlForReceiver, Long receiverId);

    void deleteAllBySenderIdOrReceiverId(Long senderId, Long receiverId);
}
