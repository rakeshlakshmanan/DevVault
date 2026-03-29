import { api } from '@/lib/api';

export interface TagResponse {
  id: string;
  name: string;
  source: string;
}

export interface BookmarkResponse {
  id: string;
  url: string;
  title: string;
  description: string;
  faviconUrl: string;
  contentType: string;
  aiStatus: string;
  aiSummary: string;
  isPublic: boolean;
  tags: TagResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const bookmarksApi = {
  list: (page = 0, size = 20, type?: string) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (type) params.set('type', type);
    return api.get<PageResponse<BookmarkResponse>>(`/bookmarks?${params}`);
  },

  create: (data: {
    url: string;
    title?: string;
    contentType?: string;
    isPublic?: boolean;
    tags?: string[];
  }) => api.post<BookmarkResponse>('/bookmarks', data),

  update: (id: string, data: Partial<{ title: string; isPublic: boolean; tags: string[] }>) =>
    api.patch<BookmarkResponse>(`/bookmarks/${id}`, data),

  delete: (id: string) => api.delete<void>(`/bookmarks/${id}`),

  search: (q: string, page = 0, size = 20) => {
    const params = new URLSearchParams({ q, page: String(page), size: String(size) });
    return api.get<PageResponse<BookmarkResponse>>(`/bookmarks/search?${params}`);
  },
};
