package com.minidoodle.controller;

import com.minidoodle.domain.SlotStatus;
import com.minidoodle.domain.User;
import com.minidoodle.dto.PageResponse;
import com.minidoodle.dto.SlotResponse;
import com.minidoodle.security.AuthUser;
import com.minidoodle.security.CustomUserDetailsService;
import com.minidoodle.security.JwtAuthenticationFilter;
import com.minidoodle.security.SecurityConfig;
import com.minidoodle.service.SlotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = SlotController.class,
        excludeFilters = {
                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = SecurityConfig.class),
                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtAuthenticationFilter.class),
                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = CustomUserDetailsService.class)
        })
@AutoConfigureMockMvc(addFilters = false)
class SlotControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SlotService slotService;

    @BeforeEach
    void setUp() {
        User user = new User("slot-test@example.com", "hash", "Slot Tester");
        AuthUser authUser = new AuthUser(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(authUser, null, authUser.getAuthorities()));
    }

    @Test
    void listSlots_returnsPaginatedResponse() throws Exception {
        UUID slotId = UUID.randomUUID();
        SlotResponse slot = new SlotResponse(
                slotId,
                Instant.parse("2026-07-15T10:00:00Z"),
                Instant.parse("2026-07-15T11:00:00Z"),
                60,
                SlotStatus.FREE,
                null);

        when(slotService.listSlots(any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResponse<>(List.of(slot), 0, 50, 1, 1, true));

        mockMvc.perform(get("/api/v1/slots")
                        .param("from", "2026-07-15T00:00:00Z")
                        .param("to", "2026-07-16T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(slotId.toString()))
                .andExpect(jsonPath("$.totalElements").value(1));
    }
}
