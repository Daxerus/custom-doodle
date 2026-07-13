package com.minidoodle.controller;

import com.minidoodle.config.MiniDoodleProperties;
import com.minidoodle.dto.AuthResponse;
import com.minidoodle.dto.ChangePasswordRequest;
import com.minidoodle.dto.LoginRequest;
import com.minidoodle.dto.RegisterRequest;
import com.minidoodle.dto.UpdateProfileRequest;
import com.minidoodle.dto.UserResponse;
import com.minidoodle.exception.ApiException;
import com.minidoodle.security.AuthUser;
import com.minidoodle.security.JwtService;
import com.minidoodle.security.SecurityUtils;
import com.minidoodle.service.AuthService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "refreshToken";

    private final AuthService authService;
    private final JwtService jwtService;
    private final MiniDoodleProperties properties;

    public AuthController(AuthService authService, JwtService jwtService, MiniDoodleProperties properties) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.properties = properties;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response) {
        AuthResponse auth = authService.register(request);
        setRefreshCookie(response, authService.generateRefreshToken(auth.user().id()));
        return ResponseEntity.status(HttpStatus.CREATED).body(auth);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        AuthResponse auth = authService.login(request);
        setRefreshCookie(response, authService.generateRefreshToken(auth.user().id()));
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            jakarta.servlet.http.HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = extractRefreshToken(request);
        if (refreshToken == null) {
            throw new ApiException("invalid-token", "Refresh token missing", HttpStatus.UNAUTHORIZED);
        }

        Claims claims = jwtService.parseToken(refreshToken);
        if (!jwtService.isRefreshToken(claims)) {
            throw new ApiException("invalid-token", "Invalid refresh token", HttpStatus.UNAUTHORIZED);
        }

        UUID userId = jwtService.getUserId(claims);
        authService.validateRefreshToken(userId, jwtService.getTokenVersion(claims));
        AuthResponse auth = authService.refresh(userId);
        setRefreshCookie(response, authService.generateRefreshToken(userId));
        return ResponseEntity.ok(auth);
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
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthUser authUser) {
            authService.logout(authUser.getId());
        }
        clearRefreshCookie(response);
        return ResponseEntity.noContent().build();
    }

    private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(properties.isCookieSecure());
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge((int) (jwtService.getRefreshTokenExpirationMs() / 1000));
        response.addCookie(cookie);
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(properties.isCookieSecure());
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private String extractRefreshToken(jakarta.servlet.http.HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> REFRESH_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
