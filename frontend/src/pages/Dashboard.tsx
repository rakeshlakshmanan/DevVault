import { useQuery } from "@tanstack/react-query";
import { Bookmark, Layers, FolderOpen, Sparkles } from "lucide-react";
import StatCard from "@/components/StatCard";
import BookmarkCard from "@/components/BookmarkCard";
import TagPill from "@/components/TagPill";
import CollectionCard from "@/components/CollectionCard";
import { bookmarksApi } from "@/api/bookmarks";
import { collectionsApi } from "@/api/collections";
import type { Bookmark as BookmarkType, TagColor } from "@/data/types";
import { useAuth } from "@/context/AuthContext";

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

const Dashboard = () => {
  const { user } = useAuth();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const { data: bookmarksPage, isLoading: loadingBookmarks, isError: bookmarksError } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => bookmarksApi.list(0, 20),
  });

  const { data: collectionsPage, isLoading: loadingCollections, isError: collectionsError } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsApi.list(0, 20),
  });

  const bookmarks: BookmarkType[] = (bookmarksPage?.content ?? []).map((b) => ({
    id: b.id,
    title: b.title || b.url,
    url: b.url,
    domain: (() => { try { return new URL(b.url).hostname; } catch { return b.url; } })(),
    summary: b.aiSummary || b.description || "",
    contentType: (b.contentType?.toLowerCase() as BookmarkType["contentType"]) || "blog",
    tags: (b.tags ?? []).map((t) => ({ name: t.name, color: colorForTag(t.name) })),
    timestamp: b.createdAt ? timeAgo(b.createdAt) : "",
    isFavorite: false,
    isProcessing: b.aiStatus === "PENDING" || b.aiStatus === "PROCESSING",
  }));

  const tagCounts = bookmarks
    .flatMap((b) => b.tags)
    .reduce<Record<string, { count: number; color: TagColor }>>((acc, t) => {
      if (!acc[t.name]) acc[t.name] = { count: 0, color: t.color };
      acc[t.name].count++;
      return acc;
    }, {});
  const tags = Object.entries(tagCounts)
    .map(([name, { count, color }]) => ({ name, count, color }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const collections = (collectionsPage?.content ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    count: c.bookmarkCount,
    color: "purple",
    favicons: [] as string[],
  }));

  const aiSummariesCount = (bookmarksPage?.content ?? []).filter(
    (b) => b.aiStatus === "COMPLETED"
  ).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {greeting},{" "}
          <span className="text-gradient-hero">{user?.username ?? "developer"}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your personal developer knowledge vault.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Bookmark}
          value={bookmarksPage ? String(bookmarksPage.totalElements) : "—"}
          label="Total Bookmarks"
          color="purple"
        />
        <StatCard
          icon={Layers}
          value={String(bookmarks.length)}
          label="Recent Saves"
          color="cyan"
        />
        <StatCard
          icon={FolderOpen}
          value={collectionsPage ? String(collectionsPage.totalElements) : "—"}
          label="Collections"
          color="green"
        />
        <StatCard
          icon={Sparkles}
          value={String(aiSummariesCount)}
          label="AI Summaries"
          color="amber"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Saves</h2>
          </div>
          {loadingBookmarks ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : bookmarksError ? (
            <p className="text-sm text-destructive">Failed to load bookmarks. Is the backend running?</p>
          ) : bookmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookmarks yet. Save your first one!</p>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((b) => (
                <BookmarkCard key={b.id} bookmark={b} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">Your Tags</h3>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <TagPill key={tag.name} name={tag.name} count={tag.count} color={tag.color} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">Collections</h3>
            {loadingCollections ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : collectionsError ? (
              <p className="text-sm text-destructive">Failed to load collections.</p>
            ) : collections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collections yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {collections.map((col) => (
                  <CollectionCard
                    key={col.id}
                    name={col.name}
                    count={col.count}
                    color={col.color}
                    favicons={col.favicons}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
