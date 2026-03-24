import { accentColorMap } from "@/lib/constants";

interface CollectionCardProps {
  name: string;
  count: number;
  color: string;
  favicons: string[];
}

const CollectionCard = ({ name, count, color, favicons }: CollectionCardProps) => {
  return (
    <div className={`p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-default cursor-pointer border-l-2 ${color === "purple" ? "border-l-primary" : color === "cyan" ? "border-l-secondary" : color === "green" ? "border-l-success" : "border-l-warning"}`}>
      <h4 className="text-sm font-semibold text-foreground mb-1">{name}</h4>
      <p className="text-xs text-muted-foreground mb-3">{count} saves</p>
      <div className="flex -space-x-2">
        {favicons.map((fav, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center"
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${fav}&sz=32`}
              alt={fav}
              className="w-3.5 h-3.5 rounded-full"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionCard;
