package com.minidoodle.controller;

import com.minidoodle.dto.BookMeetingRequest;
import com.minidoodle.dto.MeetingResponse;
import com.minidoodle.dto.PageResponse;
import com.minidoodle.dto.UpdateMeetingRequest;
import com.minidoodle.security.SecurityUtils;
import com.minidoodle.service.MeetingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class MeetingController {

    private final MeetingService meetingService;

    public MeetingController(MeetingService meetingService) {
        this.meetingService = meetingService;
    }

    @PostMapping("/slots/{slotId}/meeting")
    public ResponseEntity<MeetingResponse> bookMeeting(
            @PathVariable UUID slotId,
            @Valid @RequestBody BookMeetingRequest request) {
        MeetingResponse meeting = meetingService.bookMeeting(SecurityUtils.currentUserId(), slotId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(meeting);
    }

    @GetMapping("/meetings")
    public PageResponse<MeetingResponse> listMeetings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return meetingService.listMeetings(SecurityUtils.currentUserId(), page, size);
    }

    @GetMapping("/meetings/{id}")
    public MeetingResponse getMeeting(@PathVariable UUID id) {
        return meetingService.getMeeting(SecurityUtils.currentUserId(), id);
    }

    @PatchMapping("/meetings/{id}")
    public MeetingResponse updateMeeting(@PathVariable UUID id, @Valid @RequestBody UpdateMeetingRequest request) {
        return meetingService.updateMeeting(SecurityUtils.currentUserId(), id, request);
    }

    @DeleteMapping("/meetings/{id}")
    public MeetingResponse cancelMeeting(@PathVariable UUID id) {
        return meetingService.cancelMeeting(SecurityUtils.currentUserId(), id);
    }
}
