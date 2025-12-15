import { useState } from "react";
import { Folder, FileText, Plus, BookOpen, Star, Clock, ChevronDown, ChevronRight, Upload, FileDown, Image, FileSpreadsheet, Presentation, FileCode, Archive, Music, Video, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { WikiFolderTree } from "./WikiFolderTree";

// Get icon component based on file type/extension
const getFileIcon = (title?: string, fileType?: string, fileUrl?: string) => {
  const titleExt = title?.split('.').pop()?.toLowerCase() || '';
  const urlExt = fileUrl?.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
  const ext = titleExt.length <= 5 && titleExt !== title?.toLowerCase() ? titleExt : urlExt;

  if (fileType === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return <Image className="h-4 w-4 text-blue-500" />;
  }
  if (fileType === 'pdf' || ext === 'pdf') {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (fileType === 'document' || ['doc', 'docx'].includes(ext)) {
    return <FileText className="h-4 w-4 text-blue-600" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return <Presentation className="h-4 w-4 text-orange-500" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'html', 'css', 'json', 'xml', 'txt', 'md', 'rtf'].includes(ext)) {
    return <FileCode className="h-4 w-4 text-purple-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="h-4 w-4 text-amber-600" />;
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return <Music className="h-4 w-4 text-pink-500" />;
  }
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
    return <Video className="h-4 w-4 text-indigo-500" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

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
  is_file?: boolean;
  file_type?: string;
  file_url?: string;
}
interface RecentItem {
  id: string;
  type: "folder" | "page";
  name: string;
  viewedAt: number;
  is_file?: boolean;
  file_type?: string;
  file_url?: string;
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
      <div className="p-3 border-b flex items-center justify-between pt-[21px] pb-[21px]">
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
                      <span className="text-sm truncate flex-1">{folder.name}</span>
                    </div>)}
                  {favoritePages.map(page => <div key={page.id} className={cn("group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer", selectedPageId === page.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50")} onClick={() => onSelectPage(page.id)}>
                      {page.is_file ? getFileIcon(page.title, page.file_type, page.file_url) : <FileText className="h-4 w-4 text-muted-foreground" />}
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
                      {item.type === "folder" ? <Folder className="h-4 w-4 flex-shrink-0 text-primary" /> : item.is_file ? getFileIcon(item.name, item.file_type, item.file_url) : <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
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