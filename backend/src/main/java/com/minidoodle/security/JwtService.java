package com.minidoodle.security;

import com.minidoodle.config.MiniDoodleProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtService(MiniDoodleProperties properties) {
        String secret = properties.getJwt().getSecret();
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 characters");
        }
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = properties.getJwt().getAccessTokenExpirationMs();
        this.refreshTokenExpirationMs = properties.getJwt().getRefreshTokenExpirationMs();
    }

    public String generateAccessToken(UUID userId, String email, long tokenVersion) {
        return buildToken(userId, email, accessTokenExpirationMs, "access", tokenVersion);
    }

    public String generateRefreshToken(UUID userId, String email, long tokenVersion) {
        return buildToken(userId, email, refreshTokenExpirationMs, "refresh", tokenVersion);
    }

    private String buildToken(UUID userId, String email, long expirationMs, String type, long tokenVersion) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("type", type)
                .claim("tv", tokenVersion)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isAccessToken(Claims claims) {
        return "access".equals(claims.get("type", String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return "refresh".equals(claims.get("type", String.class));
    }

    public UUID getUserId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    public long getTokenVersion(Claims claims) {
        Long version = claims.get("tv", Long.class);
        return version != null ? version : 0L;
    }

    public long getRefreshTokenExpirationMs() {
        return refreshTokenExpirationMs;
    }
}
