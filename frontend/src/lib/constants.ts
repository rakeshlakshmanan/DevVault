import { BookOpen, Github, Play, FileText, MessageCircle } from "lucide-react";
import { ContentType, TagColor } from "@/data/types";

export const contentTypeConfig: Record<ContentType, { icon: typeof BookOpen; colorClass: string; label: string }> = {
  blog: { icon: BookOpen, colorClass: "text-secondary", label: "Blog" },
  repo: { icon: Github, colorClass: "text-success", label: "Repo" },
  video: { icon: Play, colorClass: "text-destructive", label: "Video" },
  paper: { icon: FileText, colorClass: "text-warning", label: "Paper" },
  social: { icon: MessageCircle, colorClass: "text-pink-400", label: "Social" },
};

export const tagColorMap: Record<TagColor, string> = {
  cyan: "border-secondary/30 text-secondary bg-secondary/10",
  purple: "border-primary/30 text-primary bg-primary/10",
  green: "border-success/30 text-success bg-success/10",
  amber: "border-warning/30 text-warning bg-warning/10",
};

export const accentColorMap: Record<string, string> = {
  purple: "border-t-primary",
  cyan: "border-t-secondary",
  green: "border-t-success",
  amber: "border-t-warning",
};

export const iconGlowMap: Record<string, string> = {
  purple: "text-primary",
  cyan: "text-secondary",
  green: "text-success",
  amber: "text-warning",
};
