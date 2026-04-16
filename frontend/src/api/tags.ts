import { api } from '@/lib/api';
import type { TagResponse } from './bookmarks';

export const tagsApi = {
  list: (bookmarkId: string) =>
    api.get<TagResponse[]>(`/bookmarks/${bookmarkId}/tags`),

  remove: (bookmarkId: string, tagId: string) =>
    api.delete<void>(`/bookmarks/${bookmarkId}/tags/${tagId}`),
};
