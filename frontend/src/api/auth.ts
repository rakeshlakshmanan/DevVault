import { api } from '@/lib/api';

export interface AuthResponse {
  userId: string;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  register: (email: string, username: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, username, password }),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refreshToken }),
};
