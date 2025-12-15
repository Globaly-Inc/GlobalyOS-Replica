import { useState } from "react";
import { Folder, FileText, Plus, BookOpen, Star, Clock, ChevronDown, ChevronRight, Upload, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { WikiFolderTree } from "./WikiFolderTree";
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
  onOpenUploadDialog?: () => void;
  onOpenImportDialog?: () => void;
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
  recentItems,
  onOpenUploadDialog,
  onOpenImportDialog
}: WikiSidebarProps) => {
  const [showFolderTree, setShowFolderTree] = useState(true);
  const [showFavorites, setShowFavorites] = useState(true);
  const [showRecent, setShowRecent] = useState(true);
  const favoriteFolders = folders.filter(f => isFavorite("folder", f.id));
  const favoritePages = pages.filter(p => isFavorite("page", p.id));
  const hasFavorites = favoriteFolders.length > 0 || favoritePages.length > 0;
  const hasRecentItems = recentItems.length > 0;
  return <div className="h-full flex flex-col bg-card border-r">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between pt-[20px] pb-[22px]">
        <button onClick={onSelectHome} className={cn("flex items-center gap-2 font-semibold text-sm hover:text-primary transition-colors", showingHome && !selectedFolderId && !selectedPageId && "text-primary")}>
          <BookOpen className="h-4 w-4" />
          Wiki Home
        </button>
        {canEdit && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Create
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStartCreating("page")}>
                <FileText className="h-4 w-4 mr-2" />
                New Page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStartCreating("folder")}>
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOpenUploadDialog?.()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenImportDialog?.()}>
                <FileDown className="h-4 w-4 mr-2" />
                Import
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Favorites Section */}
          {hasFavorites && <div className="mb-2">
              <button onClick={() => setShowFavorites(!showFavorites)} className="flex items-center gap-1.5 px-2 py-1.5 w-full text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                {showFavorites ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                Favorites
              </button>
              {showFavorites && <div className="mt-1 space-y-0.5">
                  {favoriteFolders.map(folder => <div key={folder.id} className={cn("group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer", selectedFolderId === folder.id && "bg-primary/10 text-primary")} onClick={() => onSelectFolder(folder.id)}>
                      <Folder className="h-4 w-4 text-primary" />
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      <span className="text-sm truncate flex-1">{folder.name}</span>
                    </div>)}
                  {favoritePages.map(page => <div key={page.id} className={cn("group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer", selectedPageId === page.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50")} onClick={() => onSelectPage(page.id)}>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      <span className="text-sm truncate flex-1">{page.title}</span>
                    </div>)}
                </div>}
            </div>}

          {/* Recently Viewed Section */}
          {hasRecentItems && <div className="mb-2 border-t pt-2">
              <button onClick={() => setShowRecent(!showRecent)} className="flex items-center gap-1.5 px-2 py-1.5 w-full text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                {showRecent ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Clock className="h-3 w-3" />
                Recently Viewed
              </button>
              {showRecent && <div className="mt-1 space-y-0.5">
                  {recentItems.map(item => <div key={`${item.type}-${item.id}`} className={cn("group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer min-w-0", selectedPageId === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50")} onClick={() => onSelectPage(item.id)} title={item.name}>
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{item.name}</span>
                    </div>)}
                </div>}
            </div>}

          {/* Empty state when no content */}
          {folders.length === 0 && pages.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>No content yet</p>
              {canEdit && <p className="text-xs mt-1">Create your first folder or page</p>}
            </div>}
        </div>
      </ScrollArea>
    </div>;
};