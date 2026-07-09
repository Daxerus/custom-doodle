package com.minidoodle.controller;

import com.minidoodle.domain.User;
import com.minidoodle.dto.AuthResponse;
import com.minidoodle.dto.ChangePasswordRequest;
import com.minidoodle.dto.LoginRequest;
import com.minidoodle.dto.RegisterRequest;
import com.minidoodle.dto.UpdateProfileRequest;
import com.minidoodle.dto.UserResponse;
import com.minidoodle.security.SecurityUtils;
import com.minidoodle.security.SessionAuthService;
import com.minidoodle.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final SessionAuthService sessionAuthService;

    public AuthController(AuthService authService, SessionAuthService sessionAuthService) {
        this.authService = authService;
        this.sessionAuthService = sessionAuthService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        User user = authService.register(request);
        sessionAuthService.establishSessionForUser(user, httpRequest, httpResponse);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(UserResponse.from(user)));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        sessionAuthService.authenticate(request.email(), request.password(), httpRequest, httpResponse);
        UserResponse user = authService.getProfileByEmail(request.email());
        return ResponseEntity.ok(new AuthResponse(user));
    }

    @GetMapping("/me")
    public UserResponse me() {
        return authService.getProfile(SecurityUtils.currentUserId());
    }

    @PutMapping("/me")
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(SecurityUtils.currentUserId(), request);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(SecurityUtils.currentUserId(), request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        sessionAuthService.logout(request, response);
        return ResponseEntity.noContent().build();
    }
}
