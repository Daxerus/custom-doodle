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

    public String getType() {
        return type;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
