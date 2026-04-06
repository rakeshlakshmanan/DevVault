package com.devvault.service;

import com.devvault.dto.request.LoginRequest;
import com.devvault.dto.request.RegisterRequest;
import com.devvault.dto.response.AuthResponse;
import com.devvault.entity.User;
import com.devvault.exception.ResourceNotFoundException;
import com.devvault.repository.UserRepository;
import com.devvault.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already in use");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken");
        }

        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        user = userRepository.save(user);
        return buildAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        return buildAuthResponse(user);
    }

    public AuthResponse refresh(String refreshToken) {
        if (!jwtProvider.isValidRefreshToken(refreshToken)) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        var userId = jwtProvider.extractUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse findOrCreateGoogleUser(String googleId, String email, String name, String avatarUrl) {
        var byGoogleId = userRepository.findByGoogleId(googleId);
        if (byGoogleId.isPresent()) {
            return buildAuthResponse(byGoogleId.get());
        }

        var byEmail = userRepository.findByEmail(email);
        if (byEmail.isPresent()) {
            User user = byEmail.get();
            user.setGoogleId(googleId);
            if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
            return buildAuthResponse(userRepository.save(user));
        }

        String username = generateUniqueUsername(name, email);
        User user = User.builder()
                .email(email)
                .username(username)
                .googleId(googleId)
                .avatarUrl(avatarUrl)
                .build();
        return buildAuthResponse(userRepository.save(user));
    }

    private String generateUniqueUsername(String name, String email) {
        String base = (name != null ? name : email.split("@")[0])
                .replaceAll("[^a-zA-Z0-9_-]", "").toLowerCase();
        if (base.length() < 3) base = "user" + base;
        base = base.substring(0, Math.min(base.length(), 40));
        String candidate = base;
        int i = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + i++;
        }
        return candidate;
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtProvider.generateRefreshToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }
}
