import { Folder, FileText, BookOpen, Star, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface WikiPage {
  id: string;
  folder_id: string | null;
  title: string;
}

interface RecentItem {
  id: string;
  type: "folder" | "page";
  name: string;
  viewedAt: number;
}

interface WikiMobileLandingProps {
  folders: WikiFolder[];
  pages: WikiPage[];
  onSelectPage: (pageId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onGoToFolderView: () => void;
  isFavorite: (itemType: "folder" | "page", itemId: string) => boolean;
  recentItems: RecentItem[];
}

export const WikiMobileLanding = ({
  folders,
  pages,
  onSelectPage,
  onSelectFolder,
  onGoToFolderView,
  isFavorite,
  recentItems
}: WikiMobileLandingProps) => {
  const favoriteFolders = folders.filter(f => isFavorite("folder", f.id));
  const favoritePages = pages.filter(p => isFavorite("page", p.id));
  const hasFavorites = favoriteFolders.length > 0 || favoritePages.length > 0;
  const hasRecentItems = recentItems.length > 0;

  return (
    <div className="space-y-4">
      {/* Wiki Home Button - Full Width Card */}
      <button 
        onClick={onGoToFolderView}
        className="w-full flex items-center justify-between p-4 bg-card rounded-lg border hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">Browse All Wiki</span>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Favorites Section */}
      {hasFavorites && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Favorites</span>
          </div>
          <div className="space-y-2">
            {favoriteFolders.map(folder => (
              <button
                key={folder.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                onClick={() => onSelectFolder(folder.id)}
              >
                <Folder className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium flex-1 text-left truncate">{folder.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
            {favoritePages.map(page => (
              <button
                key={page.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                onClick={() => onSelectPage(page.id)}
              >
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium flex-1 text-left truncate">{page.title}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed Section */}
      {hasRecentItems && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recently Viewed</span>
          </div>
          <div className="space-y-2">
            {recentItems.map(item => (
              <button
                key={`${item.type}-${item.id}`}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => item.type === "page" ? onSelectPage(item.id) : onSelectFolder(item.id)}
              >
                {item.type === "folder" ? (
                  <Folder className="h-5 w-5 text-primary" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium flex-1 text-left truncate">{item.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasFavorites && !hasRecentItems && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="h-8 w-8 text-primary/50" />
          </div>
          <p className="text-sm font-medium">No favorites yet</p>
          <p className="text-xs mt-1">Star folders or pages to access them quickly</p>
        </div>
      )}
    </div>
  );
};
