import { useState, useEffect, useRef } from "react";
import { Search, Bell, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { sharesApi } from "@/api/shares";

interface TopBarProps {
  title: string;
  onAddBookmark: () => void;
}

const TopBar = ({ title, onAddBookmark }: TopBarProps) => {
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : "?";

  const { data: unreadData } = useQuery({
    queryKey: ["shares-unread-count"],
    queryFn: () => sharesApi.getUnreadCount(),
    refetchInterval: 60_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Sync TopBar input with the ?q= URL param when on /bookmarks
  useEffect(() => {
    if (location.pathname.startsWith("/bookmarks")) {
      const q = new URLSearchParams(location.search).get("q") ?? "";
      setSearchValue(q);
    } else {
      setSearchValue("");
    }
  }, [location.pathname, location.search]);

  // ⌘K / Ctrl+K focuses the search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const q = searchValue.trim();
      if (q) {
        navigate(`/bookmarks?q=${encodeURIComponent(q)}`);
      } else {
        navigate("/bookmarks");
      }
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setSearchValue("");
      inputRef.current?.blur();
    }
  };

  return (
    <div className="sticky top-0 z-30 flex items-center gap-4 px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border">
      <h2 className="text-sm font-semibold text-foreground shrink-0">{title}</h2>

      <div className="flex-1 max-w-xl mx-auto">
        <div className={`relative transition-default ${searchFocused ? "ring-1 ring-primary/40" : ""} rounded-lg`}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search bookmarks..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-14 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-default"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono-code text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate("/friends")}
          className="relative p-2 rounded-lg hover:bg-muted transition-default"
          title={unreadCount > 0 ? `${unreadCount} unread` : "Notifications"}
        >
          <Bell size={18} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={onAddBookmark}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium glow-primary-sm hover:brightness-110 transition-default"
        >
          <Plus size={16} />
          Add
        </button>
        <button
          onClick={() => navigate("/profile")}
          className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/30 transition-colors"
          title={user?.username}
        >
          <span className="text-xs font-bold text-primary">{initials}</span>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
