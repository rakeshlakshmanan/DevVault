import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppSidebar from "@/components/AppSidebar";
import TopBar from "@/components/TopBar";
import AddBookmarkModal from "@/components/AddBookmarkModal";
import Dashboard from "@/pages/Dashboard";
import Bookmarks from "@/pages/Bookmarks";
import Login from "@/pages/Login";
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

const ComingSoon = ({ title }: { title: string }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    <p className="text-sm text-muted-foreground mt-2">Coming soon.</p>
  </div>
);

const AppLayout = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Dashboard" onAddBookmark={() => setModalOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/collections" element={<ComingSoon title="Collections" />} />
            <Route path="/tags" element={<ComingSoon title="Tags" />} />
            <Route path="/favorites" element={<ComingSoon title="Favorites" />} />
            <Route path="/explore" element={<ComingSoon title="Explore" />} />
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
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
