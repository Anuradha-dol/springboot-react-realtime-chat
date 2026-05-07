package com.yourname.chatapp.user.repository;

import com.yourname.chatapp.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);
    // Active user lookups treat null deleted flags as false for older rows.
    @Query("""
        select u from User u
        where lower(u.username) = lower(:username)
          and coalesce(u.deleted, false) = false
        """)
    Optional<User> findByUsernameIgnoreCaseAndDeletedFalse(@Param("username") String username);

    @Query("""
        select u from User u
        where lower(u.email) = lower(:email)
          and coalesce(u.deleted, false) = false
        """)
    Optional<User> findByEmailIgnoreCaseAndDeletedFalse(@Param("email") String email);

    @Query("""
        select u from User u
        where u.id = :id
          and coalesce(u.deleted, false) = false
        """)
    Optional<User> findByIdAndDeletedFalse(@Param("id") Long id);

    @Query("""
        select case when count(u) > 0 then true else false end
        from User u
        where lower(u.username) = lower(:username)
          and coalesce(u.deleted, false) = false
        """)
    boolean existsByUsernameIgnoreCaseAndDeletedFalse(@Param("username") String username);

    @Query("""
        select case when count(u) > 0 then true else false end
        from User u
        where lower(u.email) = lower(:email)
          and coalesce(u.deleted, false) = false
        """)
    boolean existsByEmailIgnoreCaseAndDeletedFalse(@Param("email") String email);

    @Query("""
        select u from User u
        where coalesce(u.deleted, false) = false
          and (
               lower(u.username) like lower(concat('%', :query, '%'))
           or lower(coalesce(u.displayName, '')) like lower(concat('%', :query, '%'))
           or lower(coalesce(u.firstName, '')) like lower(concat('%', :query, '%'))
           or lower(coalesce(u.lastName, '')) like lower(concat('%', :query, '%'))
          )
        order by u.username asc
        """)
    List<User> searchUsers(String query);
}
