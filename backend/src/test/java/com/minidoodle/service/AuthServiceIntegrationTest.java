package com.minidoodle.service;

import com.minidoodle.dto.LoginRequest;
import com.minidoodle.dto.RegisterRequest;
import com.minidoodle.exception.ApiException;
import com.minidoodle.repository.UserRepository;
import com.minidoodle.security.JwtService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void logout_invalidatesAccessAndRefreshTokens() {
        var registered = authService.register(
                new RegisterRequest("Dax", "logout-test@example.com", "password123"));
        String accessToken = registered.accessToken();
        String refreshToken = authService.generateRefreshToken(registered.user().id());
        Claims accessClaims = jwtService.parseToken(accessToken);
        Claims refreshClaims = jwtService.parseToken(refreshToken);

        authService.logout(registered.user().id());

        var user = userRepository.findById(registered.user().id()).orElseThrow();
        assertThat(user.getTokenVersion()).isEqualTo(1L);
        assertThat(jwtService.getTokenVersion(accessClaims)).isZero();
        assertThat(jwtService.getTokenVersion(refreshClaims)).isZero();

        assertThatThrownBy(() -> authService.validateRefreshToken(
                registered.user().id(), jwtService.getTokenVersion(refreshClaims)))
                .isInstanceOf(ApiException.class);

        var login = authService.login(new LoginRequest("logout-test@example.com", "password123"));
        assertThat(login.accessToken()).isNotEqualTo(accessToken);
    }
}
