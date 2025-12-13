import { Folder, FileText, ChevronRight, MoreHorizontal, Star, Pencil, Trash2, FilePlus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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

interface WikiFolderViewProps {
  folders: WikiFolder[];
  pages: WikiPage[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  canEdit?: boolean;
  onCreateFolder?: (name: string, parentId: string | null) => void;
  onCreatePage?: (title: string, folderId: string | null) => void;
  onRenameFolder?: (folderId: string, name: string) => void;
  onRenamePage?: (pageId: string, title: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onDeletePage?: (pageId: string) => void;
  isFavorite?: (itemType: "folder" | "page", itemId: string) => boolean;
  onToggleFavorite?: (itemType: "folder" | "page", itemId: string) => void;
}

export const WikiFolderView = ({
  folders,
  pages,
  currentFolderId,
  onSelectFolder,
  onSelectPage,
  canEdit = false,
  onCreateFolder,
  onCreatePage,
  onRenameFolder,
  onRenamePage,
  onDeleteFolder,
  onDeletePage,
  isFavorite,
  onToggleFavorite,
}: WikiFolderViewProps) => {
  // Get child folders and pages for current view
  const childFolders = folders
    .filter((f) => f.parent_id === currentFolderId)
    .sort((a, b) => a.sort_order - b.sort_order);
  
  const childPages = pages
    .filter((p) => p.folder_id === currentFolderId)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Get breadcrumb path
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "Wiki Home" }];
    if (currentFolderId) {
      let current = folders.find((f) => f.id === currentFolderId);
      const path: WikiFolder[] = [];
      while (current) {
        path.unshift(current);
        current = folders.find((f) => f.id === current?.parent_id);
      }
      path.forEach((f) => crumbs.push({ id: f.id, name: f.name }));
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Breadcrumb navigation */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id ?? "home"} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
              <button
                onClick={() => onSelectFolder(crumb.id)}
                className={cn(
                  "hover:text-primary transition-colors",
                  index === breadcrumbs.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:underline"
                )}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {childFolders.length === 0 && childPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Folder className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg">This folder is empty</p>
            <p className="text-sm mt-1">Create a new folder or page from the sidebar</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Folders */}
            {childFolders.map((folder) => {
              const folderPageCount = pages.filter((p) => p.folder_id === folder.id).length;
              const subfolderCount = folders.filter((f) => f.parent_id === folder.id).length;
              const isFav = isFavorite?.("folder", folder.id) ?? false;
              
              return (
                <div
                  key={folder.id}
                  className="group relative flex flex-col items-center p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer"
                  onClick={() => onSelectFolder(folder.id)}
                >
                  {/* Three-dot menu */}
                  {canEdit && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => {
                            const name = prompt("Rename folder:", folder.name);
                            if (name?.trim() && name !== folder.name) {
                              onRenameFolder?.(folder.id, name.trim());
                            }
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleFavorite?.("folder", folder.id)}>
                            <Star className={cn("h-4 w-4 mr-2", isFav && "fill-yellow-400 text-yellow-400")} />
                            {isFav ? "Remove from Favorites" : "Add to Favorites"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            const title = prompt("Enter page title:");
                            if (title?.trim()) {
                              onCreatePage?.(title.trim(), folder.id);
                            }
                          }}>
                            <FilePlus className="h-4 w-4 mr-2" />
                            New Page
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const name = prompt("Enter folder name:");
                            if (name?.trim()) {
                              onCreateFolder?.(name.trim(), folder.id);
                            }
                          }}>
                            <FolderPlus className="h-4 w-4 mr-2" />
                            New Subfolder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm("Delete this folder and all its contents?")) {
                                onDeleteFolder?.(folder.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  {/* Favorite indicator */}
                  {isFav && (
                    <div className="absolute top-2 left-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}
                  
                  <div className="relative mb-3">
                    <Folder className="h-12 w-12 text-primary fill-primary/10 group-hover:scale-105 transition-transform" />
                  </div>
                  <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">
                    {folder.name}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {subfolderCount > 0 && `${subfolderCount} folder${subfolderCount > 1 ? "s" : ""}`}
                    {subfolderCount > 0 && folderPageCount > 0 && ", "}
                    {folderPageCount > 0 && `${folderPageCount} page${folderPageCount > 1 ? "s" : ""}`}
                    {subfolderCount === 0 && folderPageCount === 0 && "Empty"}
                  </span>
                </div>
              );
            })}

            {/* Pages */}
            {childPages.map((page) => {
              const isFav = isFavorite?.("page", page.id) ?? false;
              
              return (
                <div
                  key={page.id}
                  className="group relative flex flex-col items-center p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all hover:shadow-md cursor-pointer"
                  onClick={() => onSelectPage(page.id)}
                >
                  {/* Three-dot menu */}
                  {canEdit && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => {
                            const title = prompt("Rename page:", page.title);
                            if (title?.trim() && title !== page.title) {
                              onRenamePage?.(page.id, title.trim());
                            }
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleFavorite?.("page", page.id)}>
                            <Star className={cn("h-4 w-4 mr-2", isFav && "fill-yellow-400 text-yellow-400")} />
                            {isFav ? "Remove from Favorites" : "Add to Favorites"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm("Delete this page?")) {
                                onDeletePage?.(page.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  {/* Favorite indicator */}
                  {isFav && (
                    <div className="absolute top-2 left-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}
                  
                  <div className="relative mb-3">
                    <FileText className="h-12 w-12 text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all" />
                  </div>
                  <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">
                    {page.title}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">Page</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
