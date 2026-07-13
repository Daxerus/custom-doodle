package com.minidoodle.controller;

import com.minidoodle.dto.CreateSlotRequest;
import com.minidoodle.dto.PageResponse;
import com.minidoodle.dto.SlotResponse;
import com.minidoodle.dto.UpdateSlotRequest;
import com.minidoodle.dto.UpdateSlotStatusRequest;
import com.minidoodle.security.SecurityUtils;
import com.minidoodle.service.SlotService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/slots")
public class SlotController {

    private final SlotService slotService;

    public SlotController(SlotService slotService) {
        this.slotService = slotService;
    }

    @GetMapping
    public PageResponse<SlotResponse> listSlots(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return slotService.listSlots(SecurityUtils.currentUserId(), from, to, page, size);
    }

    @PostMapping
    public ResponseEntity<SlotResponse> createSlot(@Valid @RequestBody CreateSlotRequest request) {
        SlotResponse slot = slotService.createSlot(SecurityUtils.currentUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(slot);
    }

    @PatchMapping("/{id}")
    public SlotResponse updateSlot(@PathVariable UUID id, @Valid @RequestBody UpdateSlotRequest request) {
        return slotService.updateSlot(SecurityUtils.currentUserId(), id, request);
    }

    @PatchMapping("/{id}/status")
    public SlotResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateSlotStatusRequest request) {
        return slotService.updateStatus(SecurityUtils.currentUserId(), id, request.status());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSlot(@PathVariable UUID id) {
        slotService.deleteSlot(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
