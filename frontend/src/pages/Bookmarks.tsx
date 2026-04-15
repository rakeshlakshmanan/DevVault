import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, Loader2 } from "lucide-react";
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

const CONTENT_TYPES = ["all", "blog", "repo", "video", "paper", "social"] as const;

export default function Bookmarks() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["bookmarks", "all", typeFilter, page],
    queryFn: () =>
      bookmarksApi.list(page, 20, typeFilter !== "all" ? typeFilter.toUpperCase() : undefined),
    refetchInterval: (query) => {
      const content = query.state.data?.content ?? [];
      const anyProcessing = content.some(
        (b) => b.aiStatus === "PENDING" || b.aiStatus === "PROCESSING"
      );
      return anyProcessing ? 3000 : false;
    },
  });

  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ["bookmarks", "search", search],
    queryFn: () => bookmarksApi.search(search, 0, 20),
    enabled: search.trim().length > 1,
  });

  const { mutate: deleteBookmark } = useMutation({
    mutationFn: (id: string) => bookmarksApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  const source = search.trim().length > 1 ? searchData : data;
  const loading = search.trim().length > 1 ? isSearching : isLoading;

  const bookmarks: (BookmarkType & { rawId: string })[] = (source?.content ?? []).map((b) => ({
    rawId: b.id,
    id: b.id,
    title: b.title || b.url,
    url: b.url,
    domain: (() => { try { return new URL(b.url).hostname; } catch { return b.url; } })(),
    summary: b.aiSummary || b.description || "",
    contentType: (b.contentType?.toLowerCase() as BookmarkType["contentType"]) || "blog",
    tags: (b.tags ?? []).map((t) => ({ id: t.id, name: t.name, color: colorForTag(t.name) })),
    timestamp: b.createdAt ? timeAgo(b.createdAt) : "",
    isFavorite: false,
    isProcessing: b.aiStatus === "PENDING" || b.aiStatus === "PROCESSING",
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Bookmarks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data ? `${data.totalElements} total` : ""}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bookmarks..."
          className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Filter */}
      {!search && (
        <div className="flex gap-2 flex-wrap">
          {CONTENT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading...
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load bookmarks. Is the backend running?</p>
      ) : bookmarks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookmarks found.</p>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((b) => (
            <div key={b.id} className="group relative">
              <BookmarkCard bookmark={b} />
              <button
                onClick={() => deleteBookmark(b.rawId)}
                className="absolute top-3 right-3 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!search && data && data.totalPages > 1 && (
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
