package com.minidoodle.service;

import com.minidoodle.domain.Meeting;
import com.minidoodle.domain.MeetingParticipant;
import com.minidoodle.domain.MeetingStatus;
import com.minidoodle.domain.SlotStatus;
import com.minidoodle.domain.TimeSlot;
import com.minidoodle.domain.User;
import com.minidoodle.dto.BookMeetingRequest;
import com.minidoodle.dto.MeetingResponse;
import com.minidoodle.dto.ParticipantResponse;
import com.minidoodle.dto.UpdateMeetingRequest;
import com.minidoodle.exception.ApiException;
import com.minidoodle.repository.MeetingParticipantRepository;
import com.minidoodle.repository.MeetingRepository;
import com.minidoodle.repository.TimeSlotRepository;
import com.minidoodle.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MeetingParticipantRepository participantRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final UserRepository userRepository;
    private final SlotService slotService;

    public MeetingService(
            MeetingRepository meetingRepository,
            MeetingParticipantRepository participantRepository,
            TimeSlotRepository timeSlotRepository,
            UserRepository userRepository,
            SlotService slotService) {
        this.meetingRepository = meetingRepository;
        this.participantRepository = participantRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.userRepository = userRepository;
        this.slotService = slotService;
    }

    @Transactional
    public MeetingResponse bookMeeting(UUID userId, UUID slotId, BookMeetingRequest request) {
        TimeSlot slot = slotService.getOwnedSlotEntity(userId, slotId);

        if (slot.getStatus() != SlotStatus.FREE) {
            throw new ApiException("slot-not-free", "Only free slots can be booked", HttpStatus.CONFLICT);
        }

        if (meetingRepository.findByTimeSlotId(slotId).isPresent()) {
            throw new ApiException("slot-already-booked", "Slot already has a meeting", HttpStatus.CONFLICT);
        }

        Meeting meeting = new Meeting(slotId, userId, request.title(), request.description());
        meetingRepository.save(meeting);

        slot.setStatus(SlotStatus.BUSY);
        timeSlotRepository.save(slot);

        saveParticipants(meeting.getId(), request.participantEmails());

        return toResponse(meeting, userId);
    }

    public List<MeetingResponse> listMeetings(UUID userId) {
        return meetingRepository.findAllForUser(userId).stream()
                .map(m -> toResponse(m, userId))
                .toList();
    }

    public MeetingResponse getMeeting(UUID userId, UUID meetingId) {
        Meeting meeting = getAccessibleMeeting(userId, meetingId);
        return toResponse(meeting, userId);
    }

    @Transactional
    public MeetingResponse updateMeeting(UUID userId, UUID meetingId, UpdateMeetingRequest request) {
        Meeting meeting = getOwnedMeeting(userId, meetingId);

        if (meeting.getStatus() == MeetingStatus.CANCELLED) {
            throw new ApiException("meeting-cancelled", "Cannot update a cancelled meeting", HttpStatus.CONFLICT);
        }

        if (request.title() != null) {
            meeting.setTitle(request.title());
        }
        if (request.description() != null) {
            meeting.setDescription(request.description());
        }
        if (request.participantEmails() != null) {
            participantRepository.deleteByMeetingId(meetingId);
            saveParticipants(meetingId, request.participantEmails());
        }

        meetingRepository.save(meeting);
        return toResponse(meeting, userId);
    }

    @Transactional
    public void cancelMeeting(UUID userId, UUID meetingId) {
        Meeting meeting = getOwnedMeeting(userId, meetingId);

        if (meeting.getStatus() == MeetingStatus.CANCELLED) {
            return;
        }

        meeting.setStatus(MeetingStatus.CANCELLED);
        meetingRepository.save(meeting);

        TimeSlot slot = timeSlotRepository.findById(meeting.getTimeSlotId())
                .orElseThrow(() -> new ApiException("slot-not-found", "Time slot not found", HttpStatus.NOT_FOUND));
        slot.setStatus(SlotStatus.FREE);
        timeSlotRepository.save(slot);

        participantRepository.deleteByMeetingId(meetingId);
    }

    private void saveParticipants(UUID meetingId, List<String> emails) {
        if (emails == null) {
            return;
        }
        for (String rawEmail : emails) {
            String email = rawEmail.trim().toLowerCase();
            if (email.isEmpty()) {
                continue;
            }
            UUID participantUserId = userRepository.findByEmail(email).map(User::getId).orElse(null);
            participantRepository.save(new MeetingParticipant(meetingId, participantUserId, email));
        }
    }

    private MeetingResponse toResponse(Meeting meeting, UUID currentUserId) {
        User organizer = userRepository.findById(meeting.getOrganizerId())
                .orElseThrow(() -> new ApiException("user-not-found", "Organizer not found", HttpStatus.NOT_FOUND));

        TimeSlot slot = timeSlotRepository.findById(meeting.getTimeSlotId())
                .orElseThrow(() -> new ApiException("slot-not-found", "Time slot not found", HttpStatus.NOT_FOUND));

        List<ParticipantResponse> participants = participantRepository.findByMeetingId(meeting.getId()).stream()
                .map(p -> {
                    String name = p.getUserId() != null
                            ? userRepository.findById(p.getUserId()).map(User::getDisplayName).orElse(null)
                            : null;
                    return ParticipantResponse.from(p, name);
                })
                .toList();

        String role = meeting.getOrganizerId().equals(currentUserId) ? "ORGANIZER" : "PARTICIPANT";

        return MeetingResponse.from(
                meeting,
                organizer.getDisplayName(),
                slot.getStartAt(),
                slot.getEndAt(),
                participants,
                role);
    }

    private Meeting getOwnedMeeting(UUID userId, UUID meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ApiException("meeting-not-found", "Meeting not found", HttpStatus.NOT_FOUND));

        if (!meeting.getOrganizerId().equals(userId)) {
            throw new ApiException("forbidden", "Only the organizer can perform this action", HttpStatus.FORBIDDEN);
        }
        return meeting;
    }

    private Meeting getAccessibleMeeting(UUID userId, UUID meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ApiException("meeting-not-found", "Meeting not found", HttpStatus.NOT_FOUND));

        boolean isOrganizer = meeting.getOrganizerId().equals(userId);
        boolean isParticipant = participantRepository.findByMeetingId(meetingId).stream()
                .anyMatch(p -> userId.equals(p.getUserId()));

        if (!isOrganizer && !isParticipant) {
            throw new ApiException("forbidden", "You do not have access to this meeting", HttpStatus.FORBIDDEN);
        }
        return meeting;
    }
}
