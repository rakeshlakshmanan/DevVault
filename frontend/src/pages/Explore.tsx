import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Compass, ExternalLink, Loader2, User } from "lucide-react";
import { bookmarksApi, type BookmarkResponse } from "@/api/bookmarks";
import { contentTypeConfig } from "@/lib/constants";
import type { ContentType } from "@/data/types";

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

function ExploreCard({ bookmark }: { bookmark: BookmarkResponse }) {
  const navigate = useNavigate();
  const contentType = (bookmark.contentType?.toLowerCase() as ContentType) || "blog";
  const typeConfig = contentTypeConfig[contentType];
  const TypeIcon = typeConfig.icon;

  let domain = bookmark.url;
  try { domain = new URL(bookmark.url).hostname; } catch { /* keep raw url */ }

  return (
    <div
      onClick={() => navigate(`/bookmarks/${bookmark.id}`)}
      className="group flex gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-default cursor-pointer"
    >
      <div className={`shrink-0 mt-0.5 p-2 rounded-lg bg-muted ${typeConfig.colorClass}`}>
        <TypeIcon size={16} />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {bookmark.title || bookmark.url}
        </p>

        {bookmark.aiSummary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{bookmark.aiSummary}</p>
        )}

        <div className="flex items-center gap-3 pt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink size={11} />
            {domain}
          </span>

          <span className="flex items-center gap-1 text-xs text-primary/80 font-medium">
            <User size={11} />
            {bookmark.authorUsername}
          </span>

          {bookmark.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {bookmark.tags.slice(0, 4).map((t) => (
                <span
                  key={t.id}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
            {timeAgo(bookmark.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Explore() {
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["explore", page],
    queryFn: () => bookmarksApi.explore(page, 20),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Compass size={22} className="text-primary" />
          Explore
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Public bookmarks shared by the community
          {data ? ` — ${data.totalElements} total` : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load. Is the backend running?</p>
      ) : !data || data.content.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Compass size={40} className="text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Nothing to explore yet</p>
          <p className="text-xs text-muted-foreground">
            When other users mark bookmarks as public, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.content.map((b) => (
            <ExploreCard key={b.id} bookmark={b} />
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
