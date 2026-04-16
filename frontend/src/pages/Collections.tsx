import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FolderPlus,
  Trash2,
  Loader2,
  Search,
  Plus,
  X,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { collectionsApi, type CollectionResponse } from "@/api/collections";
import { bookmarksApi, type BookmarkResponse } from "@/api/bookmarks";
import CollectionCard from "@/components/CollectionCard";
import BookmarkCard from "@/components/BookmarkCard";
import type { Bookmark as BookmarkType, TagColor } from "@/data/types";

// ─── helpers ────────────────────────────────────────────────────────────────

const TAG_COLORS: TagColor[] = ["purple", "cyan", "green", "amber"];
const CARD_COLORS = ["purple", "cyan", "green", "amber"];

function colorForTag(name: string): TagColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function colorForIndex(i: number): string {
  return CARD_COLORS[i % CARD_COLORS.length];
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

function toBookmarkType(b: BookmarkResponse): BookmarkType & { rawId: string } {
  return {
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
  };
}

function domainFromUrl(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

// ─── create collection modal ─────────────────────────────────────────────────

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateCollectionModal({ isOpen, onClose }: CreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => collectionsApi.create(name.trim(), description.trim() || undefined, isPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      onClose();
      setName("");
      setDescription("");
      setIsPublic(false);
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleClose = () => {
    onClose();
    setName("");
    setDescription("");
    setError("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-[480px] mx-4 bg-card border border-border rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">New Collection</h2>
              <button onClick={handleClose} className="p-1 rounded hover:bg-muted transition-default">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. System Design"
                  autoFocus
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-default"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Description <span className="font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this collection about?"
                  rows={2}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-default resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-9 h-5 rounded-full transition-default relative ${isPublic ? "bg-primary" : "bg-muted border border-border"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-default ${isPublic ? "left-[18px]" : "left-0.5"}`} />
                </button>
                Make collection public
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                onClick={() => create()}
                disabled={!name.trim() || isPending}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm glow-primary hover:brightness-110 transition-default disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                Create Collection
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── add bookmarks modal ─────────────────────────────────────────────────────

interface AddBookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  existingBookmarkIds: Set<string>;
}

function AddBookmarksModal({ isOpen, onClose, collectionId, existingBookmarkIds }: AddBookmarksModalProps) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["bookmarks", "all", "all", 0],
    queryFn: () => bookmarksApi.list(0, 100),
    enabled: isOpen,
  });

  const { mutateAsync: addBookmark } = useMutation({
    mutationFn: (bookmarkId: string) => collectionsApi.addBookmark(collectionId, bookmarkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-bookmarks", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const handleAdd = async (bookmarkId: string) => {
    setAdding((prev) => new Set(prev).add(bookmarkId));
    try {
      await addBookmark(bookmarkId);
    } finally {
      setAdding((prev) => { const next = new Set(prev); next.delete(bookmarkId); return next; });
    }
  };

  const candidates = (data?.content ?? []).filter((b) => {
    if (existingBookmarkIds.has(b.id)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (b.title || b.url).toLowerCase().includes(q);
    }
    return true;
  });

  const handleClose = () => { onClose(); setSearch(""); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-[560px] mx-4 bg-card border border-border rounded-xl p-6 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Add Bookmarks</h2>
              <button onClick={handleClose} className="p-1 rounded hover:bg-muted transition-default">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="relative mb-4 shrink-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your bookmarks..."
                autoFocus
                className="w-full bg-muted border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-default"
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {search ? "No matching bookmarks." : "All bookmarks are already in this collection."}
                </p>
              ) : (
                candidates.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/20 transition-default">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{b.title || b.url}</p>
                      <p className="text-xs text-muted-foreground font-mono-code truncate">{domainFromUrl(b.url)}</p>
                    </div>
                    <button
                      onClick={() => handleAdd(b.id)}
                      disabled={adding.has(b.id)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-default disabled:opacity-50"
                    >
                      {adding.has(b.id) ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={handleClose}
              className="mt-4 w-full py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-default"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── detail view ─────────────────────────────────────────────────────────────

interface DetailViewProps {
  collection: CollectionResponse;
  colorClass: string;
  onBack: () => void;
}

function CollectionDetail({ collection, colorClass, onBack }: DetailViewProps) {
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["collection-bookmarks", collection.id, page],
    queryFn: () => collectionsApi.getBookmarks(collection.id, page, 20),
  });

  const { mutate: removeBookmark } = useMutation({
    mutationFn: (bookmarkId: string) => collectionsApi.removeBookmark(collection.id, bookmarkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-bookmarks", collection.id] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const bookmarks = (data?.content ?? []).map(toBookmarkType);
  const existingIds = new Set(bookmarks.map((b) => b.rawId));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-1 p-1.5 rounded-lg hover:bg-muted transition-default text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
            <h1 className="text-2xl font-bold text-foreground">{collection.name}</h1>
          </div>
          {collection.description && (
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {data?.totalElements ?? collection.bookmarkCount} bookmark{(data?.totalElements ?? collection.bookmarkCount) !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-default"
        >
          <Plus size={14} />
          Add Bookmarks
        </button>
      </div>

      {/* Bookmarks */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load bookmarks.</p>
      ) : bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen size={40} className="text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">This collection is empty</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add Bookmarks" to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((b) => (
            <div key={b.id} className="group relative">
              <BookmarkCard bookmark={b} />
              <button
                onClick={() => removeBookmark(b.rawId)}
                className="absolute top-3 right-3 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                title="Remove from collection"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">{page + 1} / {data.totalPages}</span>
          <button
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      <AddBookmarksModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        collectionId={collection.id}
        existingBookmarkIds={existingIds}
      />
    </div>
  );
}

// ─── list view ───────────────────────────────────────────────────────────────

interface ListViewProps {
  onSelect: (collection: CollectionResponse, colorClass: string) => void;
}

function CollectionList({ onSelect }: ListViewProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsApi.list(0, 50),
  });

  const { mutate: deleteCollection } = useMutation({
    mutationFn: (id: string) => collectionsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collections"] }),
  });

  const collections = data?.content ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {!isLoading && `${collections.length} collection${collections.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-default"
        >
          <FolderPlus size={15} />
          New Collection
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load collections. Is the backend running?</p>
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen size={48} className="text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">No collections yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create one to start organising your bookmarks</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-default"
          >
            <Plus size={14} />
            Create your first collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((c, i) => {
            const color = colorForIndex(i);
            const colorDot =
              color === "purple" ? "bg-primary" :
              color === "cyan"   ? "bg-secondary" :
              color === "green"  ? "bg-success" : "bg-warning";
            return (
              <div key={c.id} className="group relative">
                <div onClick={() => onSelect(c, colorDot)}>
                  <CollectionCard
                    name={c.name}
                    count={c.bookmarkCount}
                    color={color}
                    favicons={[]}
                  />
                </div>
                {c.description && (
                  <p className="text-xs text-muted-foreground mt-1 px-1 truncate">{c.description}</p>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCollection(c.id); }}
                  className="absolute top-3 right-3 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  title="Delete collection"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <CreateCollectionModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

// ─── root ────────────────────────────────────────────────────────────────────

export default function Collections() {
  const [activeCollection, setActiveCollection] = useState<{ data: CollectionResponse; colorClass: string } | null>(null);

  if (activeCollection) {
    return (
      <CollectionDetail
        collection={activeCollection.data}
        colorClass={activeCollection.colorClass}
        onBack={() => setActiveCollection(null)}
      />
    );
  }

  return (
    <CollectionList
      onSelect={(collection, colorClass) => setActiveCollection({ data: collection, colorClass })}
    />
  );
}
