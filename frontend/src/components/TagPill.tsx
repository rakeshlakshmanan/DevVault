import { tagColorMap } from "@/lib/constants";
import { TagColor } from "@/data/types";

interface TagPillProps {
  name: string;
  count: number;
  color: TagColor;
}

const TagPill = ({ name, count, color }: TagPillProps) => {
  return (
    <button className={`text-xs px-3 py-1.5 rounded-full border transition-default hover:brightness-125 ${tagColorMap[color]}`}>
      {name} · {count}
    </button>
  );
};

export default TagPill;
