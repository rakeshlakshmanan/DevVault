import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { favoritesApi } from "@/api/favorites";
import { bookmarksApi } from "@/api/bookmarks";
import BookmarkCard from "@/components/BookmarkCard";
import type { Bookmark as BookmarkType, TagColor } from "@/data/types";

const TAG_COLORS: TagColor[] = ["purple", "cyan", "green", "amber"];

function colorForTag(name: string): TagColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

export default function Favorites() {
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["favorites", "list", page],
    queryFn: () => favoritesApi.list(page, 20),
  });

  const { mutate: deleteBookmark } = useMutation({
    mutationFn: (id: string) => bookmarksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const bookmarks: (BookmarkType & { rawId: string })[] = (data?.content ?? []).map((b) => ({
    rawId: b.id,
    id: b.id,
    title: b.title || b.url,
    url: b.url,
    domain: (() => { try { return new URL(b.url).hostname; } catch { return b.url; } })(),
    summary: b.aiSummary || b.description || "",
    contentType: (b.contentType?.toLowerCase() as BookmarkType["contentType"]) || "blog",
    tags: (b.tags ?? []).map((t) => ({ id: t.id, name: t.name, color: colorForTag(t.name) })),
    timestamp: b.createdAt ? timeAgo(b.createdAt) : "",
    isFavorite: true,
    isProcessing: b.aiStatus === "PENDING" || b.aiStatus === "PROCESSING",
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star size={22} className="fill-warning text-warning" />
          Favorites
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data ? `${data.totalElements} saved` : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load favorites.</p>
      ) : bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Star size={40} className="text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">No favorites yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click the star on any bookmark to save it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((b) => (
            <BookmarkCard key={b.id} bookmark={b} onDelete={() => deleteBookmark(b.rawId)} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {data.totalPages}
          </span>
          <button
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
