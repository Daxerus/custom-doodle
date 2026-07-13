package com.minidoodle.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "minidoodle")
public class MiniDoodleProperties {

    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();

    public Jwt getJwt() {
        return jwt;
    }

    public void setJwt(Jwt jwt) {
        this.jwt = jwt;
    }

    public Cors getCors() {
        return cors;
    }

    public void setCors(Cors cors) {
        this.cors = cors;
    }

    public static class Jwt {
        private String secret;
        private long accessTokenExpirationMs = 900_000;
        private long refreshTokenExpirationMs = 604_800_000;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getAccessTokenExpirationMs() {
            return accessTokenExpirationMs;
        }

        public void setAccessTokenExpirationMs(long accessTokenExpirationMs) {
            this.accessTokenExpirationMs = accessTokenExpirationMs;
        }

        public long getRefreshTokenExpirationMs() {
            return refreshTokenExpirationMs;
        }

        public void setRefreshTokenExpirationMs(long refreshTokenExpirationMs) {
            this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        }
    }

    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:5173");

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }
}
