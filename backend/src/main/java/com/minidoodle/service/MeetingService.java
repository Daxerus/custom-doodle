package com.minidoodle.service;

import com.minidoodle.domain.Meeting;
import com.minidoodle.domain.MeetingParticipant;
import com.minidoodle.domain.MeetingStatus;
import com.minidoodle.domain.ParticipantInvitationStatus;
import com.minidoodle.domain.SlotStatus;
import com.minidoodle.domain.TimeSlot;
import com.minidoodle.domain.User;
import com.minidoodle.dto.BookMeetingRequest;
import com.minidoodle.dto.MeetingResponse;
import com.minidoodle.dto.ParticipantResponse;
import com.minidoodle.dto.UnavailableParticipantResponse;
import com.minidoodle.dto.UpdateMeetingRequest;
import com.minidoodle.exception.ApiException;
import com.minidoodle.repository.MeetingParticipantRepository;
import com.minidoodle.repository.MeetingRepository;
import com.minidoodle.repository.TimeSlotRepository;
import com.minidoodle.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MeetingParticipantRepository participantRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final UserRepository userRepository;
    private final SlotService slotService;
    private final ParticipantAvailabilityService participantAvailabilityService;

    public MeetingService(
            MeetingRepository meetingRepository,
            MeetingParticipantRepository participantRepository,
            TimeSlotRepository timeSlotRepository,
            UserRepository userRepository,
            SlotService slotService,
            ParticipantAvailabilityService participantAvailabilityService) {
        this.meetingRepository = meetingRepository;
        this.participantRepository = participantRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.userRepository = userRepository;
        this.slotService = slotService;
        this.participantAvailabilityService = participantAvailabilityService;
    }

    @Transactional
    public MeetingResponse bookMeeting(UUID userId, UUID slotId, BookMeetingRequest request) {
        TimeSlot slot = slotService.getOwnedSlotEntity(userId, slotId);

        if (slot.getStatus() != SlotStatus.FREE) {
            throw new ApiException("slot-not-free", "Only free slots can be booked", HttpStatus.CONFLICT);
        }

        if (meetingRepository.existsByTimeSlotIdAndStatus(slotId, MeetingStatus.SCHEDULED)) {
            throw new ApiException("slot-already-booked", "Slot already has a meeting", HttpStatus.CONFLICT);
        }

        Meeting meeting = new Meeting(slotId, userId, request.title(), request.description());
        meetingRepository.save(meeting);

        slot.setStatus(SlotStatus.BUSY);
        timeSlotRepository.save(slot);

        saveParticipants(meeting.getId(), request.participantEmails(), slot.getStartAt(), slot.getEndAt());

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
            TimeSlot slot = timeSlotRepository.findById(meeting.getTimeSlotId())
                    .orElseThrow(() -> new ApiException("slot-not-found", "Time slot not found", HttpStatus.NOT_FOUND));
            participantRepository.deleteByMeetingId(meetingId);
            saveParticipants(meetingId, request.participantEmails(), slot.getStartAt(), slot.getEndAt());
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

    private void saveParticipants(UUID meetingId, List<String> emails, Instant startAt, Instant endAt) {
        if (emails == null) {
            return;
        }
        for (String rawEmail : emails) {
            String email = rawEmail.trim().toLowerCase();
            if (email.isEmpty()) {
                continue;
            }
            UUID participantUserId = userRepository.findByEmail(email).map(User::getId).orElse(null);
            ParticipantInvitationStatus status = resolveInvitationStatus(participantUserId, startAt, endAt);
            participantRepository.save(new MeetingParticipant(meetingId, participantUserId, email, status));
        }
    }

    private ParticipantInvitationStatus resolveInvitationStatus(UUID userId, Instant startAt, Instant endAt) {
        if (userId == null) {
            return ParticipantInvitationStatus.INVITED;
        }
        return participantAvailabilityService.isAvailableAt(userId, startAt, endAt)
                ? ParticipantInvitationStatus.INVITED
                : ParticipantInvitationStatus.INVITED_BUSY;
    }

    private List<UnavailableParticipantResponse> toUnavailableParticipants(List<ParticipantResponse> participants) {
        return participants.stream()
                .filter(p -> p.invitationStatus() == ParticipantInvitationStatus.INVITED_BUSY)
                .map(p -> new UnavailableParticipantResponse(p.userId(), p.email(), p.displayName()))
                .toList();
    }

    private MeetingResponse toResponse(Meeting meeting, UUID currentUserId) {
        return toResponse(meeting, currentUserId, null);
    }

    private MeetingResponse toResponse(
            Meeting meeting, UUID currentUserId, List<UnavailableParticipantResponse> unavailableParticipants) {
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

        List<UnavailableParticipantResponse> unavailable = unavailableParticipants != null
                ? unavailableParticipants
                : toUnavailableParticipants(participants);

        return MeetingResponse.from(
                meeting,
                organizer.getDisplayName(),
                slot.getStartAt(),
                slot.getEndAt(),
                participants,
                role,
                unavailable);
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
                .anyMatch(p -> userId.equals(p.getUserId())
                        && p.getInvitationStatus() == ParticipantInvitationStatus.INVITED);

        if (!isOrganizer && !isParticipant) {
            throw new ApiException("forbidden", "You do not have access to this meeting", HttpStatus.FORBIDDEN);
        }
        return meeting;
    }
}
