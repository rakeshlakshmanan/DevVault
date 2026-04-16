import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Hash, Loader2, X, Search, ExternalLink } from "lucide-react";
import { bookmarksApi, type BookmarkResponse, type TagResponse } from "@/api/bookmarks";
import { tagsApi } from "@/api/tags";
import { tagColorMap } from "@/lib/constants";
import type { TagColor } from "@/data/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

const TAG_COLORS: TagColor[] = ["purple", "cyan", "green", "amber"];

function colorForTag(name: string): TagColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface TagWithMeta extends TagResponse {
  color: TagColor;
  bookmarkCount: number;
}

interface BookmarkWithTag {
  bookmark: BookmarkResponse;
  tag: TagResponse;
}

// ─── tag pill with remove ─────────────────────────────────────────────────────

interface RemovableTagPillProps {
  tag: TagResponse;
  bookmarkId: string;
  color: TagColor;
}

function RemovableTagPill({ tag, bookmarkId, color }: RemovableTagPillProps) {
  const queryClient = useQueryClient();

  const { mutate: remove, isPending } = useMutation({
    mutationFn: () => tagsApi.remove(bookmarkId, tag.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${tagColorMap[color]}`}
    >
      {tag.name}
      <button
        onClick={() => remove()}
        disabled={isPending}
        className="ml-0.5 rounded-full hover:opacity-70 transition-opacity disabled:opacity-40"
        title="Remove tag"
      >
        {isPending ? (
          <Loader2 size={9} className="animate-spin" />
        ) : (
          <X size={9} />
        )}
      </button>
    </span>
  );
}

// ─── tag detail panel ─────────────────────────────────────────────────────────

interface TagDetailProps {
  tag: TagWithMeta;
  entries: BookmarkWithTag[];
  onBack: () => void;
}

function TagDetail({ tag, entries, onBack }: TagDetailProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All tags
        </button>
        <span className="text-muted-foreground">/</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tagColorMap[tag.color]}`}>
          #{tag.name}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        {entries.length} bookmark{entries.length !== 1 ? "s" : ""} tagged <strong className="text-foreground">#{tag.name}</strong>
      </p>

      <div className="space-y-2">
        {entries.map(({ bookmark, tag: t }) => (
          <div
            key={bookmark.id}
            className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/20 transition-default"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-foreground truncate">{bookmark.title || bookmark.url}</p>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
              {bookmark.aiSummary && (
                <p className="text-xs text-muted-foreground line-clamp-1">{bookmark.aiSummary}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {(bookmark.tags ?? []).map((bt) => (
                  <RemovableTagPill
                    key={bt.id}
                    tag={bt}
                    bookmarkId={bookmark.id}
                    color={colorForTag(bt.name)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Tags() {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<TagWithMeta | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["bookmarks", "all", "all", 0],
    queryFn: () => bookmarksApi.list(0, 200),
  });

  // Build a de-duped tag list with bookmark counts from the loaded bookmarks
  const { tagMap, bookmarksByTag } = useMemo(() => {
    const tagMap = new Map<string, TagWithMeta>();
    const bookmarksByTag = new Map<string, BookmarkWithTag[]>();

    for (const bookmark of data?.content ?? []) {
      for (const tag of bookmark.tags ?? []) {
        if (!tagMap.has(tag.name)) {
          tagMap.set(tag.name, {
            ...tag,
            color: colorForTag(tag.name),
            bookmarkCount: 0,
          });
          bookmarksByTag.set(tag.name, []);
        }
        tagMap.get(tag.name)!.bookmarkCount++;
        bookmarksByTag.get(tag.name)!.push({ bookmark, tag });
      }
    }

    return { tagMap, bookmarksByTag };
  }, [data]);

  const allTags = Array.from(tagMap.values()).sort((a, b) => b.bookmarkCount - a.bookmarkCount);

  const filtered = search.trim()
    ? allTags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : allTags;

  if (activeTag) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <TagDetail
          tag={activeTag}
          entries={bookmarksByTag.get(activeTag.name) ?? []}
          onBack={() => setActiveTag(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tags</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {!isLoading && `${allTags.length} tag${allTags.length !== 1 ? "s" : ""} across your bookmarks`}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tags..."
          className="w-full bg-muted border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-default"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load tags. Is the backend running?</p>
      ) : allTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Hash size={48} className="text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">No tags yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tags appear here automatically once your bookmarks are processed by AI
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tags match "{search}".</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {filtered.map((tag) => (
            <button
              key={tag.name}
              onClick={() => setActiveTag(tag)}
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium transition-all hover:scale-105 hover:shadow-sm ${tagColorMap[tag.color]}`}
            >
              <Hash size={11} />
              {tag.name}
              <span className="ml-1 text-[10px] opacity-70 font-normal">
                {tag.bookmarkCount}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
