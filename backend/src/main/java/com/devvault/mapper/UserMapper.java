package com.devvault.mapper;

import com.devvault.dto.response.UserMeResponse;
import com.devvault.dto.response.UserProfileResponse;
import com.devvault.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserProfileResponse toProfileResponse(User user);

    UserMeResponse toMeResponse(User user);
}
