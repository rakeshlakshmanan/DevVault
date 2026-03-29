import { useState } from "react";
import { X, Link, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookmarksApi } from "@/api/bookmarks";

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddBookmarkModal = ({ isOpen, onClose }: AddBookmarkModalProps) => {
  const [url, setUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [preview, setPreview] = useState<{ domain: string } | null>(null);
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const { mutate: saveBookmark, isPending } = useMutation({
    mutationFn: () => bookmarksApi.create({ url, isPublic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      onClose();
      setUrl("");
      setPreview(null);
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError("");
    if (value.startsWith("http")) {
      try {
        const domain = new URL(value).hostname;
        setPreview({ domain });
      } catch {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  };

  const handleSave = () => {
    if (!url) return;
    saveBookmark();
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
              <h2 className="text-lg font-semibold text-foreground">Add Bookmark</h2>
              <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-default">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Paste a URL..."
                  autoFocus
                  className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-default"
                />
              </div>

              {preview && (
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <p className="text-xs font-mono-code text-muted-foreground">{preview.domain}</p>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-9 h-5 rounded-full transition-default relative ${isPublic ? "bg-primary" : "bg-muted border border-border"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-default ${isPublic ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  Add to public profile
                </label>
              </div>

              <button
                onClick={handleSave}
                disabled={!url || isPending}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm glow-primary hover:brightness-110 transition-default disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                Save Bookmark
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddBookmarkModal;
