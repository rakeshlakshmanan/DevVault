import { api } from '@/lib/api';
import type { BookmarkResponse } from './bookmarks';

export interface SharedBookmarkResponse {
  id: string;
  senderUserId: string;
  senderUsername: string;
  senderAvatarUrl: string | null;
  bookmark: BookmarkResponse;
  isRead: boolean;
  createdAt: string;
}

export const sharesApi = {
  share: (bookmarkId: string, receiverUserId: string) =>
    api.post<SharedBookmarkResponse>('/shares', { bookmarkId, receiverUserId }),

  getInbox: () => api.get<SharedBookmarkResponse[]>('/shares/inbox'),

  getUnreadCount: () => api.get<{ count: number }>('/shares/unread-count'),

  markRead: (id: string) => api.patch<void>(`/shares/${id}/read`, {}),
};
