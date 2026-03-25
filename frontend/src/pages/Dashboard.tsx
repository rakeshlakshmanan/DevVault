import { useState } from "react";
import { Bookmark, Layers, FolderOpen, Sparkles } from "lucide-react";
import StatCard from "@/components/StatCard";
import BookmarkCard from "@/components/BookmarkCard";
import TagPill from "@/components/TagPill";
import CollectionCard from "@/components/CollectionCard";
import { mockBookmarks, mockTags, mockCollections } from "@/data/mockData";

const Dashboard = () => {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Hero greeting */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {greeting}, <span className="text-gradient-hero">developer</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          You've saved 12 bookmarks this week. Your brain is growing.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bookmark} value="247" label="Total Bookmarks" color="purple" />
        <StatCard icon={Layers} value="+12" label="This Week" color="cyan" />
        <StatCard icon={FolderOpen} value="8" label="Collections" color="green" />
        <StatCard icon={Sparkles} value="231" label="AI Summaries Generated" color="amber" />
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Recent saves */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Saves</h2>
            <button className="text-xs text-primary hover:underline transition-default">View All</button>
          </div>
          <div className="space-y-2">
            {mockBookmarks.map((b) => (
              <BookmarkCard key={b.id} bookmark={b} />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Tags */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">Your Tags</h3>
            <div className="flex flex-wrap gap-2">
              {mockTags.map((tag) => (
                <TagPill key={tag.name} name={tag.name} count={tag.count} color={tag.color} />
              ))}
            </div>
            <button className="text-xs text-primary hover:underline mt-3 transition-default">
              View all 34 tags →
            </button>
          </div>

          {/* Collections */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">Collections</h3>
            <div className="grid grid-cols-2 gap-3">
              {mockCollections.map((col) => (
                <CollectionCard
                  key={col.id}
                  name={col.name}
                  count={col.count}
                  color={col.color}
                  favicons={col.favicons}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
