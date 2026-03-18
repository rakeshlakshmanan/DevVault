package com.devvault.mapper;

import com.devvault.dto.response.BookmarkResponse;
import com.devvault.dto.response.TagResponse;
import com.devvault.entity.Bookmark;
import com.devvault.entity.BookmarkTag;
import com.devvault.entity.Tag;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface BookmarkMapper {

    @Mapping(target = "tags", ignore = true)
    @Mapping(target = "isPublic", source = "public")
    BookmarkResponse toResponse(Bookmark bookmark);

    default BookmarkResponse toResponse(Bookmark bookmark, List<BookmarkTag> bookmarkTags) {
        BookmarkResponse response = toResponse(bookmark);
        response.setTags(bookmarkTags.stream()
                .map(bt -> toTagResponse(bt.getTag()))
                .toList());
        return response;
    }

    TagResponse toTagResponse(Tag tag);
}
