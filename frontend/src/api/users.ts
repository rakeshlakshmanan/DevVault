import { api } from '@/lib/api';

export interface UserProfileResponse {
  id: string;
  username: string;
  avatarUrl: string;
  bio: string;
  publicProfile: boolean;
  createdAt: string;
}

export const usersApi = {
  getPublicProfile: (username: string) =>
    api.get<UserProfileResponse>(`/u/${username}`),
};
