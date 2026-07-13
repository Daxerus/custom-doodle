package com.minidoodle.repository;

import com.minidoodle.domain.MeetingParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, UUID> {

    List<MeetingParticipant> findByMeetingId(UUID meetingId);

    List<MeetingParticipant> findByMeetingIdIn(Collection<UUID> meetingIds);

    void deleteByMeetingId(UUID meetingId);
}
