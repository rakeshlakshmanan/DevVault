import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppSidebar from "@/components/AppSidebar";
import TopBar from "@/components/TopBar";
import AddBookmarkModal from "@/components/AddBookmarkModal";
import Dashboard from "@/pages/Dashboard";
import Bookmarks from "@/pages/Bookmarks";
import Collections from "@/pages/Collections";
import Tags from "@/pages/Tags";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import OAuth2Callback from "@/pages/OAuth2Callback";
import BookmarkDetail from "@/pages/BookmarkDetail";
import Friends from "@/pages/Friends";
import Favorites from "@/pages/Favorites";
import Explore from "@/pages/Explore";
import UserProfile from "@/pages/UserProfile";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "@/context/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/bookmarks": "Bookmarks",
  "/collections": "Collections",
  "/tags": "Tags",
  "/favorites": "Favorites",
  "/explore": "Explore",
  "/friends": "Friends",
  "/profile": "Profile",
};

function usePageTitle(): string {
  const { pathname } = useLocation();
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith("/bookmarks/")) return "Bookmark";
  if (pathname.startsWith("/u/")) return pathname.slice(3);
  return "DevVault";
}

const AppLayout = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const title = usePageTitle();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} onAddBookmark={() => setModalOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/bookmarks/:id" element={<BookmarkDetail />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/u/:username" element={<UserProfile />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <AddBookmarkModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/oauth2/callback" element={<OAuth2Callback />} />
            <Route path="/u/:username" element={<UserProfile />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
