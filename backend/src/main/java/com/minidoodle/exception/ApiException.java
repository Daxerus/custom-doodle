package com.minidoodle.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final String type;
    private final HttpStatus status;

    public ApiException(String type, String title, HttpStatus status) {
        super(title);
        this.type = type;
        this.status = status;
    }

    public ApiException(String type, String title, String detail, HttpStatus status) {
        super(detail != null ? detail : title);
        this.type = type;
        this.status = status;
    }

    public String getType() {
        return type;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getTitle() {
        return getMessage().contains("overlap") || getMessage().length() < 80
                ? getMessage()
                : getMessage();
    }
}
