import { accentColorMap, iconGlowMap } from "@/lib/constants";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  color: string;
}

const StatCard = ({ icon: Icon, value, label, color }: StatCardProps) => {
  return (
    <div className={`p-5 rounded-lg bg-card border border-border border-top-accent ${accentColorMap[color]} transition-default hover:bg-surface-hover`}>
      <div className={`mb-3 ${iconGlowMap[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

export default StatCard;
