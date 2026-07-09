package com.minidoodle.service;

import com.minidoodle.dto.UserResponse;
import com.minidoodle.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponse> searchUsers(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return userRepository
                .findByEmailContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(query, query)
                .stream()
                .map(UserResponse::from)
                .limit(20)
                .toList();
    }
}
