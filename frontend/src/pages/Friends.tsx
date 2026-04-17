import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, UserCheck, UserX, Users, Loader2, X, Clock, Inbox, ExternalLink } from "lucide-react";
import { friendsApi, type UserSearchResult } from "@/api/friends";
import { sharesApi } from "@/api/shares";
import { contentTypeConfig } from "@/lib/constants";
import type { ContentType } from "@/data/types";

function UserAvatar({ username, avatarUrl, size = "md" }: { username: string; avatarUrl?: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className={`${dim} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary shrink-0`}>
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

function AddFriendPanel() {
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: results, isLoading } = useQuery({
    queryKey: ["user-search", query],
    queryFn: () => friendsApi.searchUsers(query),
    enabled: query.trim().length >= 2,
  });

  const { mutateAsync: sendRequest } = useMutation({
    mutationFn: (username: string) => friendsApi.sendRequest(username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends-sent"] });
    },
  });

  const handleSend = async (user: UserSearchResult) => {
    await sendRequest(user.username);
    setSent((prev) => new Set(prev).add(user.id));
  };

  return (
    <div className="rounded-lg bg-card border border-border p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <UserPlus size={15} className="text-primary" />
        Add Friends
      </h2>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          className="w-full bg-muted border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={13} />
          </button>
        )}
      </div>

      {query.trim().length >= 2 && (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 justify-center">
              <Loader2 size={13} className="animate-spin" /> Searching...
            </div>
          ) : !results || results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No users found.</p>
          ) : (
            results.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-default">
                <UserAvatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{user.username}</p>
                  {user.bio && <p className="text-xs text-muted-foreground truncate">{user.bio}</p>}
                </div>
                <button
                  onClick={() => handleSend(user)}
                  disabled={sent.has(user.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-default disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sent.has(user.id) ? (
                    <><UserCheck size={12} /> Sent</>
                  ) : (
                    <><UserPlus size={12} /> Add</>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function IncomingRequests() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["friends-incoming"],
    queryFn: () => friendsApi.getIncomingRequests(),
  });

  const { mutate: accept, variables: acceptingId } = useMutation({
    mutationFn: (id: string) => friendsApi.acceptRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friends-incoming"] });
    },
  });

  const { mutate: decline, variables: decliningId } = useMutation({
    mutationFn: (id: string) => friendsApi.declineRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends-incoming"] }),
  });

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-lg bg-card border border-border p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock size={15} className="text-warning" />
        Incoming Requests
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
          {data.length}
        </span>
      </h2>
      <div className="space-y-2">
        {data.map((req) => (
          <div key={req.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
            <UserAvatar username={req.otherUsername} avatarUrl={req.otherAvatarUrl} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{req.otherUsername}</p>
              <p className="text-xs text-muted-foreground">Wants to be your friend</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => accept(req.id)}
                disabled={acceptingId === req.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-default disabled:opacity-50"
              >
                {acceptingId === req.id ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />}
                Accept
              </button>
              <button
                onClick={() => decline(req.id)}
                disabled={decliningId === req.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-default disabled:opacity-50"
              >
                {decliningId === req.id ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />}
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentRequests() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["friends-sent"],
    queryFn: () => friendsApi.getSentRequests(),
  });

  const { mutate: cancel, variables: cancellingId } = useMutation({
    mutationFn: (id: string) => friendsApi.declineRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends-sent"] }),
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className="rounded-lg bg-card border border-border p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock size={15} className="text-muted-foreground" />
        Sent Requests
      </h2>
      <div className="space-y-2">
        {data.map((req) => (
          <div key={req.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
            <UserAvatar username={req.otherUsername} avatarUrl={req.otherAvatarUrl} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{req.otherUsername}</p>
              <p className="text-xs text-muted-foreground">Pending...</p>
            </div>
            <button
              onClick={() => cancel(req.id)}
              disabled={cancellingId === req.id}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-default disabled:opacity-50"
            >
              {cancellingId === req.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FriendsList() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: () => friendsApi.getFriends(),
  });

  const { mutate: remove, variables: removingId } = useMutation({
    mutationFn: (friendId: string) => friendsApi.removeFriend(friendId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });

  return (
    <div className="rounded-lg bg-card border border-border p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Users size={15} className="text-primary" />
        Friends
        {data && data.length > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {data.length}
          </span>
        )}
      </h2>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No friends yet. Search for users to add them!</p>
      ) : (
        <div className="space-y-2">
          {data.map((f) => (
            <div key={f.id} className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-default">
              <UserAvatar username={f.otherUsername} avatarUrl={f.otherAvatarUrl} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{f.otherUsername}</p>
              </div>
              <button
                onClick={() => remove(f.otherUserId)}
                disabled={removingId === f.otherUserId}
                className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-default disabled:opacity-50"
                title="Remove friend"
              >
                {removingId === f.otherUserId ? <Loader2 size={11} className="animate-spin" /> : <UserX size={11} />}
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SharedInbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["shares-inbox"],
    queryFn: () => sharesApi.getInbox(),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => sharesApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shares-inbox"] }),
  });

  if (isLoading || !data || data.length === 0) return null;

  const unread = data.filter((s) => !s.isRead).length;

  return (
    <div className="rounded-lg bg-card border border-border p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Inbox size={15} className="text-secondary" />
        Received Bookmarks
        {unread > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary font-medium">
            {unread} new
          </span>
        )}
      </h2>
      <div className="space-y-2">
        {data.map((share) => {
          const contentType = (share.bookmark.contentType?.toLowerCase() as ContentType) || "blog";
          const typeConfig = contentTypeConfig[contentType];
          const TypeIcon = typeConfig.icon;
          return (
            <div
              key={share.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-default cursor-pointer hover:border-primary/30 ${
                share.isRead ? "bg-muted/30 border-border" : "bg-card border-secondary/30"
              }`}
              onClick={() => {
                if (!share.isRead) markRead(share.id);
                navigate(`/bookmarks/${share.bookmark.id}`);
              }}
            >
              <div className={`mt-0.5 p-1.5 rounded-md bg-muted ${typeConfig.colorClass} shrink-0`}>
                <TypeIcon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {share.bookmark.title || share.bookmark.url}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  from <span className="text-foreground font-medium">{share.senderUsername}</span>
                </p>
              </div>
              {!share.isRead && (
                <span className="shrink-0 w-2 h-2 rounded-full bg-secondary mt-1.5" />
              )}
              <ExternalLink size={13} className="shrink-0 text-muted-foreground mt-0.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Friends() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Friends</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect with other developers</p>
      </div>

      <SharedInbox />
      <AddFriendPanel />
      <IncomingRequests />
      <SentRequests />
      <FriendsList />
    </div>
  );
}
