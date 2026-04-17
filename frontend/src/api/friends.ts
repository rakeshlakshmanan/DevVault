import { api } from '@/lib/api';

export interface FriendshipResponse {
  id: string;
  otherUserId: string;
  otherUsername: string;
  otherAvatarUrl: string | null;
  status: 'PENDING' | 'ACCEPTED';
  isSender: boolean;
  createdAt: string;
}

export interface UserSearchResult {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  publicProfile: boolean;
  createdAt: string;
}

export const friendsApi = {
  getFriends: () => api.get<FriendshipResponse[]>('/friends'),
  getIncomingRequests: () => api.get<FriendshipResponse[]>('/friends/requests'),
  getSentRequests: () => api.get<FriendshipResponse[]>('/friends/sent'),
  sendRequest: (username: string) => api.post<FriendshipResponse>('/friends/request', { username }),
  acceptRequest: (id: string) => api.post<FriendshipResponse>(`/friends/request/${id}/accept`, {}),
  declineRequest: (id: string) => api.delete<void>(`/friends/request/${id}`),
  removeFriend: (friendId: string) => api.delete<void>(`/friends/${friendId}`),
  searchUsers: (q: string) => api.get<UserSearchResult[]>(`/u/search?q=${encodeURIComponent(q)}`),
};
