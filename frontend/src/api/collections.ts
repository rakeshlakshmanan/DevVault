import { api } from '@/lib/api';
import type { PageResponse } from './bookmarks';

export interface CollectionResponse {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  bookmarkCount: number;
  createdAt: string;
  updatedAt: string;
}

export const collectionsApi = {
  list: (page = 0, size = 20) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    return api.get<PageResponse<CollectionResponse>>(`/collections?${params}`);
  },

  create: (name: string, description?: string, isPublic = false) =>
    api.post<CollectionResponse>('/collections', { name, description, isPublic }),

  delete: (id: string) => api.delete<void>(`/collections/${id}`),
};
