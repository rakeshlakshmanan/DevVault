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

/**
 * Service handling user authentication and account management.
 *
 * <p>Supports email/password registration and login, JWT token refresh,
 * and Google OAuth sign-in with automatic account creation or linking.</p>
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    /**
     * Registers a new user with an email and password.
     *
     * <p>Validates that neither the email nor the username is already taken before
     * persisting the user with a bcrypt-hashed password.</p>
     *
     * @param request the registration payload containing email, username, and password
     * @return an {@link AuthResponse} with a fresh access and refresh token pair
     * @throws IllegalArgumentException if the email or username is already in use
     */
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

    /**
     * Authenticates a user with their email and password.
     *
     * @param request the login payload containing email and plaintext password
     * @return an {@link AuthResponse} with a fresh access and refresh token pair
     * @throws BadCredentialsException if the email is not found or the password does not match
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        return buildAuthResponse(user);
    }

    /**
     * Issues a new access token (and refresh token) from a valid refresh token.
     *
     * @param refreshToken the refresh token string presented by the client
     * @return an {@link AuthResponse} containing a new token pair
     * @throws BadCredentialsException   if the refresh token is invalid or expired
     * @throws ResourceNotFoundException if the user referenced by the token no longer exists
     */
    public AuthResponse refresh(String refreshToken) {
        if (!jwtProvider.isValidRefreshToken(refreshToken)) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        var userId = jwtProvider.extractUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        return buildAuthResponse(user);
    }

    /**
     * Handles Google OAuth sign-in by finding or creating a local user account.
     *
     * <p>Resolution order:
     * <ol>
     *   <li>If a user with the given {@code googleId} already exists, return tokens for that user.</li>
     *   <li>If a user with the same email exists (registered via password), link the Google ID to
     *       that account and return tokens.</li>
     *   <li>Otherwise, create a new user account with a generated username.</li>
     * </ol>
     * </p>
     *
     * @param googleId  the Google subject identifier from the ID token
     * @param email     the email address from the Google ID token
     * @param name      the display name from the Google ID token (used for username generation)
     * @param avatarUrl the profile picture URL from Google (may be {@code null})
     * @return an {@link AuthResponse} with a fresh access and refresh token pair
     */
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

    /**
     * Generates a unique username derived from a display name or email prefix.
     *
     * <p>Strips non-alphanumeric characters, lowercases the result, truncates to 40 characters,
     * and appends an incrementing numeric suffix if the candidate is already taken.</p>
     *
     * @param name  the display name (may be {@code null}; falls back to the email prefix)
     * @param email the user's email address, used as fallback input
     * @return a unique username string
     */
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

    /**
     * Constructs an {@link AuthResponse} by generating a new JWT access and refresh token pair
     * for the given user.
     *
     * @param user the authenticated or newly created user
     * @return an {@link AuthResponse} populated with user details and tokens
     */
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
