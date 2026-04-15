import { Star, MoreHorizontal, X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "@/data/types";
import { contentTypeConfig, tagColorMap } from "@/lib/constants";
import { tagsApi } from "@/api/tags";

interface BookmarkCardProps {
  bookmark: Bookmark & { rawId?: string };
}

const BookmarkCard = ({ bookmark }: BookmarkCardProps) => {
  const typeConfig = contentTypeConfig[bookmark.contentType];
  const TypeIcon = typeConfig.icon;
  const bookmarkId = bookmark.rawId ?? bookmark.id;

  const queryClient = useQueryClient();

  const { mutate: removeTag, variables: removingTagId } = useMutation({
    mutationFn: (tagId: string) => tagsApi.remove(bookmarkId, tagId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  return (
    <div className="group flex items-start gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/30 hover:bg-surface-hover transition-default cursor-pointer">
      <div className={`mt-1 p-1.5 rounded-md bg-muted ${typeConfig.colorClass}`}>
        <TypeIcon size={14} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {bookmark.title}
          </h3>
          {bookmark.isProcessing && (
            <span className="flex items-center gap-1 text-xs text-secondary shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse-glow" />
              AI processing...
            </span>
          )}
          <span className="font-mono-code text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
            {bookmark.domain}
          </span>
        </div>

        {!bookmark.isProcessing && bookmark.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {bookmark.summary}
          </p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {bookmark.tags.map((tag) => (
            <span
              key={tag.name}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${tagColorMap[tag.color]}`}
            >
              {tag.name}
              {(tag as any).id && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeTag((tag as any).id); }}
                  className="ml-0.5 rounded-full opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  title="Remove tag"
                >
                  {removingTagId === (tag as any).id ? (
                    <Loader2 size={9} className="animate-spin" />
                  ) : (
                    <X size={9} />
                  )}
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-[11px] text-muted-foreground">{bookmark.timestamp}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-default">
          <button className="p-1 rounded hover:bg-muted transition-default">
            <Star
              size={14}
              className={bookmark.isFavorite ? "fill-warning text-warning" : "text-muted-foreground"}
            />
          </button>
          <button className="p-1 rounded hover:bg-muted transition-default">
            <MoreHorizontal size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookmarkCard;
