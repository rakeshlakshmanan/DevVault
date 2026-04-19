import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  FolderOpen,
  Calendar,
  Globe,
  Send,
  Trash2,
  X,
  UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { bookmarksApi } from "@/api/bookmarks";
import { friendsApi } from "@/api/friends";
import { sharesApi } from "@/api/shares";
import { contentTypeConfig, tagColorMap } from "@/lib/constants";
import type { ContentType, TagColor } from "@/data/types";

const TAG_COLORS: TagColor[] = ["purple", "cyan", "green", "amber"];

function colorForTag(name: string): TagColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SendToFriendModal({ bookmarkId, onClose }: { bookmarkId: string; onClose: () => void }) {
  const [sent, setSent] = useState<Set<string>>(new Set());

  const { data: friends, isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: () => friendsApi.getFriends(),
  });

  const { mutateAsync: share, isPending } = useMutation({
    mutationFn: (receiverUserId: string) => sharesApi.share(bookmarkId, receiverUserId),
  });

  const handleSend = async (friendId: string) => {
    await share(friendId);
    setSent((prev) => new Set(prev).add(friendId));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-sm mx-4 bg-card border border-border rounded-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Send to Friend</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-default">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Loading friends...
          </div>
        ) : !friends || friends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            You have no friends yet. Add some from the Friends page!
          </p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-default">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {f.otherUsername.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{f.otherUsername}</span>
                <button
                  onClick={() => handleSend(f.otherUserId)}
                  disabled={sent.has(f.otherUserId) || isPending}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-default disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sent.has(f.otherUserId) ? (
                    <><UserCheck size={12} /> Sent</>
                  ) : (
                    <><Send size={12} /> Send</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function BookmarkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);

  const { mutate: deleteBookmark, isPending: isDeleting } = useMutation({
    mutationFn: () => bookmarksApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      navigate("/bookmarks");
    },
  });

  const { data: bookmark, isLoading, isError } = useQuery({
    queryKey: ["bookmark", id],
    queryFn: () => bookmarksApi.getById(id!),
    enabled: !!id,
  });

  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ["bookmark-collections", id],
    queryFn: () => bookmarksApi.getCollections(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !bookmark) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-default"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <p className="text-sm text-destructive">Bookmark not found.</p>
      </div>
    );
  }

  const contentType = (bookmark.contentType?.toLowerCase() as ContentType) || "blog";
  const typeConfig = contentTypeConfig[contentType];
  const TypeIcon = typeConfig.icon;

  let domain = bookmark.url;
  try { domain = new URL(bookmark.url).hostname; } catch { /* keep url */ }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-default"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={`mt-1 p-2 rounded-lg bg-muted ${typeConfig.colorClass} shrink-0`}>
            <TypeIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-snug">
              {bookmark.title || bookmark.url}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono-code">
                <Globe size={11} />
                {domain}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                tagColorMap[colorForTag(typeConfig.label)]
              }`}>
                {typeConfig.label}
              </span>
              {bookmark.createdAt && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar size={11} />
                  {formatDate(bookmark.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-default"
          >
            <ExternalLink size={14} />
            Open link
          </a>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border text-sm font-medium text-foreground hover:border-primary/30 hover:bg-muted/80 transition-default"
          >
            <Send size={14} />
            Send to Friend
          </button>
          <button
            onClick={() => deleteBookmark()}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm font-medium text-destructive hover:bg-destructive/20 transition-default disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>

      {/* Summary */}
      {(bookmark.aiSummary || bookmark.description) && (
        <div className="rounded-lg bg-card border border-border p-4 space-y-1.5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Summary
          </h2>
          <p className="text-sm text-foreground leading-relaxed">
            {bookmark.aiSummary || bookmark.description}
          </p>
        </div>
      )}

      {/* Tags */}
      {bookmark.tags && bookmark.tags.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {bookmark.tags.map((tag) => (
              <span
                key={tag.id}
                className={`text-xs px-3 py-1 rounded-full border ${tagColorMap[colorForTag(tag.name)]}`}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Collections */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Collections
        </h2>
        {collectionsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={13} className="animate-spin" /> Loading...
          </div>
        ) : !collections || collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not in any collection.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => navigate("/collections")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border hover:border-primary/30 text-sm text-foreground transition-default"
              >
                <FolderOpen size={13} className="text-muted-foreground" />
                {col.name}
                <span className="text-xs text-muted-foreground">({col.bookmarkCount})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {shareOpen && (
          <SendToFriendModal bookmarkId={id!} onClose={() => setShareOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
