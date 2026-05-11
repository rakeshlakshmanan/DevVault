import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Bookmark, FolderOpen, Calendar, Tag, Pencil, X, Loader2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { bookmarksApi } from "@/api/bookmarks";
import { collectionsApi } from "@/api/collections";
import { usersApi } from "@/api/users";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(false);
  const [error, setError] = useState("");

  const { data: bookmarksPage } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => bookmarksApi.list(0, 20),
  });

  const { data: collectionsPage } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsApi.list(0, 20),
  });

  const { data: me } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => usersApi.getMe(),
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersApi.updateMe({
      username: username.trim() || undefined,
      bio,
      publicProfile,
    }),
    onSuccess: (updated) => {
      updateUser({ username: updated.username });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const startEditing = () => {
    setUsername(me?.username ?? user?.username ?? "");
    setBio(me?.bio ?? "");
    setPublicProfile(me?.publicProfile ?? false);
    setError("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError("");
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : "??";

  const totalTags = (bookmarksPage?.content ?? []).flatMap((b) => b.tags ?? []);
  const uniqueTags = new Set(totalTags.map((t) => t.name)).size;
  const aiSummaries = (bookmarksPage?.content ?? []).filter((b) => b.aiStatus === "COMPLETED").length;

  const stats = [
    { icon: Bookmark, label: "Total Bookmarks", value: bookmarksPage ? bookmarksPage.totalElements : "—" },
    { icon: FolderOpen, label: "Collections", value: collectionsPage ? collectionsPage.totalElements : "—" },
    { icon: Tag, label: "Unique Tags", value: bookmarksPage ? uniqueTags : "—" },
    { icon: User, label: "AI Summaries", value: bookmarksPage ? aiSummaries : "—" },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        {!editing && (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm font-medium text-foreground hover:border-primary/30 hover:bg-muted/80 transition-default"
          >
            <Pencil size={13} />
            Edit profile
          </button>
        )}
      </div>

      {/* Avatar + info */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary">{initials}</span>
        </div>

        {editing ? (
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-default"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Tell people a bit about yourself..."
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-default resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/500</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <button
                type="button"
                onClick={() => setPublicProfile(!publicProfile)}
                className={`w-9 h-5 rounded-full transition-default relative ${publicProfile ? "bg-primary" : "bg-muted border border-border"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-default ${publicProfile ? "left-[18px]" : "left-0.5"}`} />
              </button>
              Public profile
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={cancelEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-default"
              >
                <X size={13} /> Cancel
              </button>
              <button
                onClick={() => save()}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-default disabled:opacity-50"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{me?.username ?? user?.username}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail size={14} />
              <span>{me?.email ?? user?.email}</span>
            </div>
            {me?.bio && (
              <p className="text-sm text-muted-foreground mt-1">{me.bio}</p>
            )}
            {me?.createdAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar size={14} />
                <span>
                  Member since{" "}
                  {new Date(me.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
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
      {!editing && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Account</h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Username</span>
              <span className="text-sm font-medium text-foreground">{me?.username ?? user?.username}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{me?.email ?? user?.email}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Public profile</span>
              <span className={`text-sm font-medium ${me?.publicProfile ? "text-success" : "text-muted-foreground"}`}>
                {me ? (me.publicProfile ? "Enabled" : "Disabled") : "—"}
              </span>
            </div>
            {me?.bio && (
              <div className="flex items-start justify-between px-4 py-3 gap-4">
                <span className="text-sm text-muted-foreground shrink-0">Bio</span>
                <span className="text-sm font-medium text-foreground text-right">{me.bio}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
