import { api } from '@/lib/api';

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

  getMe: () => api.get<UserMeResponse>('/profile'),

  updateMe: (data: UserUpdateRequest) => api.patch<UserMeResponse>('/profile', data),
};
