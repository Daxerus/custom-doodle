package com.minidoodle.repository;

import com.minidoodle.domain.Meeting;
import com.minidoodle.domain.MeetingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {

    Optional<Meeting> findByTimeSlotIdAndStatus(UUID timeSlotId, MeetingStatus status);

    boolean existsByTimeSlotIdAndStatus(UUID timeSlotId, MeetingStatus status);

    @Query("""
            SELECT m FROM Meeting m
            WHERE m.organizerId = :userId
               OR m.id IN (
                    SELECT mp.meetingId FROM MeetingParticipant mp
                    WHERE mp.userId = :userId
                      AND mp.invitationStatus IN (
                          com.minidoodle.domain.ParticipantInvitationStatus.INVITED,
                          com.minidoodle.domain.ParticipantInvitationStatus.INVITED_BUSY
                      )
               )
            ORDER BY m.createdAt DESC
            """)
    Page<Meeting> findAllForUser(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
            SELECT m FROM Meeting m
            WHERE m.status = com.minidoodle.domain.MeetingStatus.SCHEDULED
              AND m.timeSlotId IN :slotIds
            """)
    List<Meeting> findScheduledByTimeSlotIds(@Param("slotIds") List<UUID> slotIds);
}
