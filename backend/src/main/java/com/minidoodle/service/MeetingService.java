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
import com.minidoodle.dto.PageResponse;
import com.minidoodle.dto.ParticipantResponse;
import com.minidoodle.dto.UnavailableParticipantResponse;
import com.minidoodle.dto.UpdateMeetingRequest;
import com.minidoodle.exception.ApiException;
import com.minidoodle.repository.MeetingParticipantRepository;
import com.minidoodle.repository.MeetingRepository;
import com.minidoodle.repository.TimeSlotRepository;
import com.minidoodle.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MeetingService {

    private static final int MAX_PAGE_SIZE = 100;

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

    public PageResponse<MeetingResponse> listMeetings(UUID userId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<Meeting> meetingPage = meetingRepository.findAllForUser(userId, PageRequest.of(Math.max(page, 0), safeSize));
        List<MeetingResponse> content = toResponses(meetingPage.getContent(), userId);
        return PageResponse.from(meetingPage, content);
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
    public MeetingResponse cancelMeeting(UUID userId, UUID meetingId) {
        Meeting meeting = getOwnedMeeting(userId, meetingId);

        if (meeting.getStatus() == MeetingStatus.CANCELLED) {
            return toResponse(meeting, userId);
        }

        meeting.setStatus(MeetingStatus.CANCELLED);
        meetingRepository.save(meeting);

        TimeSlot slot = timeSlotRepository.findById(meeting.getTimeSlotId())
                .orElseThrow(() -> new ApiException("slot-not-found", "Time slot not found", HttpStatus.NOT_FOUND));
        slot.setStatus(SlotStatus.FREE);
        timeSlotRepository.save(slot);

        MeetingResponse response = toResponse(meeting, userId);
        participantRepository.deleteByMeetingId(meetingId);
        return response;
    }

    private void saveParticipants(UUID meetingId, List<String> emails, Instant startAt, Instant endAt) {
        if (emails == null) {
            return;
        }
        Set<String> seen = new HashSet<>();
        for (String rawEmail : emails) {
            String email = rawEmail.trim().toLowerCase();
            if (email.isEmpty() || !seen.add(email)) {
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

    private List<MeetingResponse> toResponses(List<Meeting> meetings, UUID currentUserId) {
        if (meetings.isEmpty()) {
            return List.of();
        }

        List<UUID> meetingIds = meetings.stream().map(Meeting::getId).toList();
        List<UUID> slotIds = meetings.stream().map(Meeting::getTimeSlotId).distinct().toList();
        Set<UUID> organizerIds = meetings.stream().map(Meeting::getOrganizerId).collect(Collectors.toSet());

        Map<UUID, TimeSlot> slotsById = timeSlotRepository.findAllById(slotIds).stream()
                .collect(Collectors.toMap(TimeSlot::getId, Function.identity()));

        List<MeetingParticipant> allParticipants = participantRepository.findByMeetingIdIn(meetingIds);
        Map<UUID, List<MeetingParticipant>> participantsByMeeting = allParticipants.stream()
                .collect(Collectors.groupingBy(MeetingParticipant::getMeetingId));

        Set<UUID> participantUserIds = allParticipants.stream()
                .map(MeetingParticipant::getUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Set<UUID> allUserIds = new HashSet<>(organizerIds);
        allUserIds.addAll(participantUserIds);

        Map<UUID, User> usersById = userRepository.findAllById(allUserIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<MeetingResponse> responses = new ArrayList<>();
        for (Meeting meeting : meetings) {
            responses.add(buildResponse(
                    meeting,
                    currentUserId,
                    usersById,
                    slotsById,
                    participantsByMeeting.getOrDefault(meeting.getId(), List.of())));
        }
        return responses;
    }

    private MeetingResponse toResponse(Meeting meeting, UUID currentUserId) {
        return toResponses(List.of(meeting), currentUserId).getFirst();
    }

    private MeetingResponse buildResponse(
            Meeting meeting,
            UUID currentUserId,
            Map<UUID, User> usersById,
            Map<UUID, TimeSlot> slotsById,
            List<MeetingParticipant> participants) {
        User organizer = usersById.get(meeting.getOrganizerId());
        if (organizer == null) {
            throw new ApiException("user-not-found", "Organizer not found", HttpStatus.NOT_FOUND);
        }

        TimeSlot slot = slotsById.get(meeting.getTimeSlotId());
        if (slot == null) {
            throw new ApiException("slot-not-found", "Time slot not found", HttpStatus.NOT_FOUND);
        }

        List<ParticipantResponse> participantResponses = participants.stream()
                .map(p -> {
                    String name = p.getUserId() != null
                            ? usersById.getOrDefault(p.getUserId(), null) != null
                                    ? usersById.get(p.getUserId()).getDisplayName()
                                    : null
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
                participantResponses,
                role,
                toUnavailableParticipants(participantResponses));
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
                        && (p.getInvitationStatus() == ParticipantInvitationStatus.INVITED
                                || p.getInvitationStatus() == ParticipantInvitationStatus.INVITED_BUSY));

        if (!isOrganizer && !isParticipant) {
            throw new ApiException("forbidden", "You do not have access to this meeting", HttpStatus.FORBIDDEN);
        }
        return meeting;
    }
}
