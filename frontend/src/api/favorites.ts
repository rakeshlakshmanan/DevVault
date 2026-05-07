import { api } from '@/lib/api';
import type { BookmarkResponse, PageResponse } from '@/api/bookmarks';

export const favoritesApi = {
  toggle: (bookmarkId: string) =>
    api.post<{ isFavorited: boolean }>(`/bookmarks/${bookmarkId}/favorite`, {}),

  check: (bookmarkId: string) =>
    api.get<{ isFavorited: boolean }>(`/bookmarks/${bookmarkId}/favorite`),

  listIds: () => api.get<string[]>('/favorites/ids'),

  list: (page = 0, size = 20) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    return api.get<PageResponse<BookmarkResponse>>(`/favorites?${params}`);
  },
};
