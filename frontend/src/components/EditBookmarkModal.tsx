import { useState, KeyboardEvent } from "react";
import { X, Hash, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookmarksApi, type BookmarkResponse } from "@/api/bookmarks";

interface Props {
  bookmark: BookmarkResponse;
  onClose: () => void;
}

export default function EditBookmarkModal({ bookmark, onClose }: Props) {
  const [title, setTitle] = useState(bookmark.title || "");
  const [isPublic, setIsPublic] = useState(bookmark.isPublic);
  const [tags, setTags] = useState<string[]>(bookmark.tags.map((t) => t.name));
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      bookmarksApi.update(bookmark.id, { title: title.trim() || undefined, isPublic, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark", bookmark.id] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const addTag = (raw: string) => {
    const name = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (name && !tags.includes(name)) setTags((prev) => [...prev, name]);
    setTagInput("");
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleSave = () => {
    if (tagInput.trim()) addTag(tagInput);
    save();
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
        className="w-full max-w-[520px] mx-4 bg-card border border-border rounded-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Edit Bookmark</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-default">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={bookmark.url}
              autoFocus
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-default"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Tags <span className="font-normal">(Enter, comma, or space to add)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-muted border border-border rounded-lg focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-default min-h-[42px]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  <Hash size={9} />
                  {t}
                  <button
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                placeholder={tags.length === 0 ? "e.g. javascript, design" : ""}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`w-9 h-5 rounded-full transition-default relative ${isPublic ? "bg-primary" : "bg-muted border border-border"}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-default ${isPublic ? "left-[18px]" : "left-0.5"}`}
                />
              </button>
              Public bookmark
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:text-foreground transition-default"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:brightness-110 transition-default disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}