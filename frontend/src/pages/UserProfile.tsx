import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, BookOpen, CalendarDays } from "lucide-react";
import { usersApi } from "@/api/users";
import { contentTypeConfig } from "@/lib/constants";
import type { ContentType } from "@/data/types";
import type { BookmarkResponse } from "@/api/bookmarks";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function PublicBookmarkCard({ bookmark }: { bookmark: BookmarkResponse }) {
  const navigate = useNavigate();
  const contentType = (bookmark.contentType?.toLowerCase() as ContentType) || "blog";
  const typeConfig = contentTypeConfig[contentType];
  const TypeIcon = typeConfig.icon;

  let domain = bookmark.url;
  try { domain = new URL(bookmark.url).hostname; } catch { /* keep raw */ }

  return (
    <div
      onClick={() => navigate(`/bookmarks/${bookmark.id}`)}
      className="group flex gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-default cursor-pointer"
    >
      <div className={`shrink-0 mt-0.5 p-2 rounded-lg bg-muted ${typeConfig.colorClass}`}>
        <TypeIcon size={14} />
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
            <ExternalLink size={10} />
            {domain}
          </span>
          {bookmark.tags.slice(0, 4).map((t) => (
            <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
              {t.name}
            </span>
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
            {timeAgo(bookmark.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const [page, setPage] = useState(0);

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ["user-profile", username],
    queryFn: () => usersApi.getPublicProfile(username!),
    enabled: !!username,
  });

  const { data: bookmarks, isLoading: bookmarksLoading } = useQuery({
    queryKey: ["user-public-bookmarks", username, page],
    queryFn: () => usersApi.getPublicBookmarks(username!, page),
    enabled: !!profile,
  });

  if (profileLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Loading...
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20 space-y-2">
        <p className="text-base font-semibold text-foreground">User not found</p>
        <p className="text-sm text-muted-foreground">This profile is private or doesn't exist.</p>
      </div>
    );
  }

  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.username} className="w-14 h-14 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <h1 className="text-xl font-bold text-foreground">{profile.username}</h1>
          {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays size={11} /> Joined {formatDate(profile.createdAt)}
            </span>
            {bookmarks && (
              <span className="flex items-center gap-1">
                <BookOpen size={11} /> {bookmarks.totalElements} public bookmark{bookmarks.totalElements !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bookmarks */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Public Bookmarks</h2>

        {bookmarksLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Loading...
          </div>
        ) : !bookmarks || bookmarks.content.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public bookmarks yet.</p>
        ) : (
          <div className="space-y-3">
            {bookmarks.content.map((b) => (
              <PublicBookmarkCard key={b.id} bookmark={b} />
            ))}
          </div>
        )}

        {bookmarks && bookmarks.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">{page + 1} / {bookmarks.totalPages}</span>
            <button
              disabled={page + 1 >= bookmarks.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
