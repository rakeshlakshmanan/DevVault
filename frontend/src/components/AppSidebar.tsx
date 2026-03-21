import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Bookmark, FolderOpen, Hash, Star, Compass,
  Brain, ChevronLeft, ChevronRight, ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "All Bookmarks", icon: Bookmark, path: "/bookmarks" },
  { label: "Collections", icon: FolderOpen, path: "/collections" },
  { label: "Tags", icon: Hash, path: "/tags" },
  { label: "Favorites", icon: Star, path: "/favorites" },
  { label: "Explore", icon: Compass, path: "/explore" },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.15 }}
      className="h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 glow-primary-sm">
          <Brain size={18} className="text-primary" />
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-foreground">DevVault</span>
            <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-secondary/20 text-secondary">
              beta
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-default relative ${
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-primary" />
              )}
              <item.icon size={18} className={isActive ? "text-primary" : ""} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-muted border border-border" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-sidebar" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate">developer</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">Saved today: 3</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-5 -right-3 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-default z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
};

export default AppSidebar;
