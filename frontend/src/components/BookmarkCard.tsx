import { Star, MoreHorizontal } from "lucide-react";
import { Bookmark } from "@/data/types";
import { contentTypeConfig, tagColorMap } from "@/lib/constants";

interface BookmarkCardProps {
  bookmark: Bookmark;
}

const BookmarkCard = ({ bookmark }: BookmarkCardProps) => {
  const typeConfig = contentTypeConfig[bookmark.contentType];
  const TypeIcon = typeConfig.icon;

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
              className={`text-[11px] px-2 py-0.5 rounded-full border ${tagColorMap[tag.color]}`}
            >
              {tag.name}
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
