import { api } from '@/lib/api';
import type { BookmarkResponse, PageResponse } from './bookmarks';

export interface UserProfileResponse {
  id: string;
  username: string;
  avatarUrl: string;
  bio: string;
  publicProfile: boolean;
  createdAt: string;
}

export interface UserMeResponse {
  id: string;
  username: string;
  email: string;
  bio: string;
  publicProfile: boolean;
  createdAt: string;
}

export interface UserUpdateRequest {
  username?: string;
  bio?: string;
  publicProfile?: boolean;
}

export const usersApi = {
  getPublicProfile: (username: string) =>
    api.get<UserProfileResponse>(`/u/${username}`),

  getPublicBookmarks: (username: string, page = 0, size = 20) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    return api.get<PageResponse<BookmarkResponse>>(`/u/${username}/bookmarks?${params}`);
  },

  getMe: () => api.get<UserMeResponse>('/profile'),

  updateMe: (data: UserUpdateRequest) => api.patch<UserMeResponse>('/profile', data),
};
