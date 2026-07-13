package com.minidoodle.service;

import com.minidoodle.domain.Calendar;
import com.minidoodle.domain.User;
import com.minidoodle.dto.AuthResponse;
import com.minidoodle.dto.ChangePasswordRequest;
import com.minidoodle.dto.LoginRequest;
import com.minidoodle.dto.RegisterRequest;
import com.minidoodle.dto.UpdateProfileRequest;
import com.minidoodle.dto.UserResponse;
import com.minidoodle.exception.ApiException;
import com.minidoodle.repository.CalendarRepository;
import com.minidoodle.repository.UserRepository;
import com.minidoodle.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CalendarRepository calendarRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserRepository userRepository,
            CalendarRepository calendarRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.calendarRepository = calendarRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException("email-taken", "Email already registered", HttpStatus.CONFLICT);
        }

        User user = new User(
                request.email().toLowerCase(),
                passwordEncoder.encode(request.password()),
                request.displayName());
        userRepository.save(user);
        calendarRepository.save(new Calendar(user.getId()));

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().toLowerCase(), request.password()));

        User user = userRepository.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> new ApiException("invalid-credentials", "Invalid credentials", HttpStatus.UNAUTHORIZED));

        return buildAuthResponse(user);
    }

    public AuthResponse refresh(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("user-not-found", "User not found", HttpStatus.UNAUTHORIZED));
        return buildAuthResponse(user);
    }

    public UserResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("user-not-found", "User not found", HttpStatus.NOT_FOUND));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("user-not-found", "User not found", HttpStatus.NOT_FOUND));
        user.setDisplayName(request.displayName());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("user-not-found", "User not found", HttpStatus.NOT_FOUND));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException("invalid-password", "Current password is incorrect", HttpStatus.BAD_REQUEST);
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    public String generateRefreshToken(UUID userId, String email) {
        return jwtService.generateRefreshToken(userId, email);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        return new AuthResponse(accessToken, UserResponse.from(user));
    }
}
