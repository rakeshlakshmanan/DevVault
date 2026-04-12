import { useQuery } from "@tanstack/react-query";
import { User, Mail, Bookmark, FolderOpen, Calendar, Tag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { bookmarksApi } from "@/api/bookmarks";
import { collectionsApi } from "@/api/collections";
import { usersApi } from "@/api/users";

export default function Profile() {
  const { user } = useAuth();

  const { data: bookmarksPage } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => bookmarksApi.list(0, 20),
  });

  const { data: collectionsPage } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsApi.list(0, 20),
  });

  const { data: publicProfile } = useQuery({
    queryKey: ["profile", user?.username],
    queryFn: () => usersApi.getPublicProfile(user!.username),
    enabled: !!user?.username,
    retry: false,
  });

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  const totalTags = (bookmarksPage?.content ?? []).flatMap((b) => b.tags ?? []);
  const uniqueTags = new Set(totalTags.map((t) => t.name)).size;

  const aiSummaries = (bookmarksPage?.content ?? []).filter(
    (b) => b.aiStatus === "COMPLETED"
  ).length;

  const stats = [
    {
      icon: Bookmark,
      label: "Total Bookmarks",
      value: bookmarksPage ? bookmarksPage.totalElements : "—",
    },
    {
      icon: FolderOpen,
      label: "Collections",
      value: collectionsPage ? collectionsPage.totalElements : "—",
    },
    {
      icon: Tag,
      label: "Unique Tags",
      value: bookmarksPage ? uniqueTags : "—",
    },
    {
      icon: User,
      label: "AI Summaries",
      value: bookmarksPage ? aiSummaries : "—",
    },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Profile</h1>

      {/* Avatar + info */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary">{initials}</span>
        </div>
        <div className="space-y-1.5 min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{user?.username}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail size={14} />
            <span>{user?.email}</span>
          </div>
          {publicProfile?.createdAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>
                Member since{" "}
                {new Date(publicProfile.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Stats
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account info */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Account
        </h3>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Username</span>
            <span className="text-sm font-medium text-foreground">{user?.username}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium text-foreground">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Public profile</span>
            <span className="text-sm font-medium text-foreground">
              {publicProfile ? (publicProfile.publicProfile ? "Yes" : "No") : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
