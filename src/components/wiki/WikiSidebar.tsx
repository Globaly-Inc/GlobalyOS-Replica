import { Folder, FileText, Plus, BookOpen, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

interface WikiPage {
  id: string;
  folder_id: string | null;
  title: string;
  sort_order: number;
}

interface RecentItem {
  id: string;
  type: "folder" | "page";
  name: string;
  viewedAt: number;
}

interface WikiSidebarProps {
  folders: WikiFolder[];
  pages: WikiPage[];
  selectedPageId: string | null;
  selectedFolderId: string | null;
  showingHome: boolean;
  onSelectPage: (pageId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onSelectHome: () => void;
  onStartCreating: (type: "folder" | "page") => void;
  canEdit: boolean;
  isFavorite: (itemType: "folder" | "page", itemId: string) => boolean;
  onToggleFavorite: (itemType: "folder" | "page", itemId: string) => void;
  recentItems: RecentItem[];
}

export const WikiSidebar = ({
  folders,
  pages,
  selectedPageId,
  selectedFolderId,
  showingHome,
  onSelectPage,
  onSelectFolder,
  onSelectHome,
  onStartCreating,
  canEdit,
  isFavorite,
  onToggleFavorite,
  recentItems
}: WikiSidebarProps) => {
  const favoriteFolders = folders.filter(f => isFavorite("folder", f.id));
  const favoritePages = pages.filter(p => isFavorite("page", p.id));
  const hasFavorites = favoriteFolders.length > 0 || favoritePages.length > 0;
  const hasRecentItems = recentItems.length > 0;

  return (
    <div className="h-full flex flex-col bg-card border-r">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <button 
          onClick={onSelectHome}
          className={cn(
            "flex items-center gap-2 font-semibold text-sm hover:text-primary transition-colors",
            showingHome && !selectedFolderId && !selectedPageId && "text-primary"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Wiki Home
        </button>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStartCreating("folder")}>
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStartCreating("page")}>
                <FileText className="h-4 w-4 mr-2" />
                New Page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Favorites Section */}
        {hasFavorites && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              Favorites
            </div>
            {favoriteFolders.map(folder => (
              <div
                key={folder.id}
                className={cn(
                  "group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer",
                  selectedFolderId === folder.id && "bg-primary/10 text-primary"
                )}
                onClick={() => onSelectFolder(folder.id)}
              >
                <Folder className="h-4 w-4 text-primary" />
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{folder.name}</span>
              </div>
            ))}
            {favoritePages.map(page => (
              <div
                key={page.id}
                className={cn(
                  "group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer",
                  selectedPageId === page.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                )}
                onClick={() => onSelectPage(page.id)}
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{page.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recently Viewed Section */}
        {hasRecentItems && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Clock className="h-3 w-3" />
              Recently Viewed
            </div>
            {recentItems.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                className={cn(
                  "group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer",
                  (item.type === "folder" && selectedFolderId === item.id) || 
                  (item.type === "page" && selectedPageId === item.id)
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => {
                  if (item.type === "folder") {
                    onSelectFolder(item.id);
                  } else {
                    onSelectPage(item.id);
                  }
                }}
              >
                {item.type === "folder" ? (
                  <Folder className="h-4 w-4 text-primary" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm truncate flex-1">{item.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state when no favorites and no recent items */}
        {!hasFavorites && !hasRecentItems && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p>No favorites yet</p>
            <p className="text-xs mt-1">Star folders or pages to access them quickly</p>
          </div>
        )}
      </div>
    </div>
  );
};
