import { useState, useRef, useEffect } from "react";
import { Folder, FileText, ChevronRight, MoreHorizontal, Star, Pencil, Trash2, FilePlus, FolderPlus, ArrowUpDown, ArrowDownAZ, Clock, CalendarPlus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface WikiPage {
  id: string;
  folder_id: string | null;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type SortOption = "name" | "created" | "modified";
type SortDirection = "asc" | "desc";

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
  creatingItem?: { type: "folder" | "page" } | null;
  onCreatingItemComplete?: () => void;
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
  creatingItem,
  onCreatingItemComplete,
}: WikiFolderViewProps) => {
  const [creatingName, setCreatingName] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editingItem, setEditingItem] = useState<{ type: "folder" | "page"; id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ type: "folder" | "page"; id: string; name: string } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ type: "folder" | "page"; parentFolderId: string } | null>(null);
  const [createDialogName, setCreateDialogName] = useState("");
  const createDialogInputRef = useRef<HTMLInputElement>(null);

  // Focus input when creating item
  useEffect(() => {
    if (creatingItem) {
      setCreatingName(creatingItem.type === "folder" ? "New Folder" : "New Page");
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [creatingItem]);

  // Focus input when editing item
  useEffect(() => {
    if (editingItem) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 50);
    }
  }, [editingItem]);

  // Focus create dialog input when opened
  useEffect(() => {
    if (createDialog) {
      setCreateDialogName(createDialog.type === "folder" ? "New Folder" : "New Page");
      setTimeout(() => {
        createDialogInputRef.current?.focus();
        createDialogInputRef.current?.select();
      }, 50);
    }
  }, [createDialog]);

  // Check for duplicate names
  const isDuplicateFolderName = (name: string, parentId: string | null, excludeId?: string) => {
    return folders.filter((f) => f.parent_id === parentId).some(
      (f) => f.name.toLowerCase() === name.toLowerCase() && f.id !== excludeId
    );
  };

  const isDuplicatePageName = (title: string, folderId: string | null, excludeId?: string) => {
    return pages.filter((p) => p.folder_id === folderId).some(
      (p) => p.title.toLowerCase() === title.toLowerCase() && p.id !== excludeId
    );
  };

  // Get child folders and pages for current view
  const childFolders = sortItems(
    folders.filter((f) => f.parent_id === currentFolderId),
    sortBy,
    sortDirection
  );
  
  const childPages = sortItems(
    pages.filter((p) => p.folder_id === currentFolderId),
    sortBy,
    sortDirection
  );

  const handleCreateConfirm = () => {
    if (creatingName.trim() && creatingItem) {
      const trimmedName = creatingName.trim();
      
      if (creatingItem.type === "folder") {
        if (isDuplicateFolderName(trimmedName, currentFolderId)) {
          toast.error("A folder with this name already exists");
          return;
        }
        onCreateFolder?.(trimmedName, currentFolderId);
      } else {
        if (isDuplicatePageName(trimmedName, currentFolderId)) {
          toast.error("A page with this name already exists in this folder");
          return;
        }
        onCreatePage?.(trimmedName, currentFolderId);
      }
    }
    onCreatingItemComplete?.();
    setCreatingName("");
  };

  const handleCreateCancel = () => {
    onCreatingItemComplete?.();
    setCreatingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCreateCancel();
    }
  };

  // Editing handlers
  const handleEditConfirm = () => {
    if (editingItem && editingItem.name.trim()) {
      const trimmedName = editingItem.name.trim();
      
      if (editingItem.type === "folder") {
        const folder = folders.find(f => f.id === editingItem.id);
        if (isDuplicateFolderName(trimmedName, folder?.parent_id ?? null, editingItem.id)) {
          toast.error("A folder with this name already exists");
          return;
        }
        onRenameFolder?.(editingItem.id, trimmedName);
      } else {
        const page = pages.find(p => p.id === editingItem.id);
        if (isDuplicatePageName(trimmedName, page?.folder_id ?? null, editingItem.id)) {
          toast.error("A page with this name already exists in this folder");
          return;
        }
        onRenamePage?.(editingItem.id, trimmedName);
      }
    }
    setEditingItem(null);
  };

  const handleEditCancel = () => {
    setEditingItem(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const startEditing = (type: "folder" | "page", id: string, currentName: string) => {
    setEditingItem({ type, id, name: currentName });
  };

  // Delete handlers
  const handleDeleteConfirm = () => {
    if (deleteDialog) {
      if (deleteDialog.type === "folder") {
        onDeleteFolder?.(deleteDialog.id);
      } else {
        onDeletePage?.(deleteDialog.id);
      }
      setDeleteDialog(null);
    }
  };

  // Create dialog handlers
  const handleCreateDialogConfirm = () => {
    if (createDialog && createDialogName.trim()) {
      const trimmedName = createDialogName.trim();
      
      if (createDialog.type === "folder") {
        if (isDuplicateFolderName(trimmedName, createDialog.parentFolderId)) {
          toast.error("A folder with this name already exists");
          return;
        }
        onCreateFolder?.(trimmedName, createDialog.parentFolderId);
      } else {
        if (isDuplicatePageName(trimmedName, createDialog.parentFolderId)) {
          toast.error("A page with this name already exists in this folder");
          return;
        }
        onCreatePage?.(trimmedName, createDialog.parentFolderId);
      }
      setCreateDialog(null);
      setCreateDialogName("");
    }
  };

  const handleCreateDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateDialogConfirm();
    }
  };

  // Sort function
  function sortItems<T extends { name?: string; title?: string; created_at: string; updated_at: string }>(
    items: T[],
    sortBy: SortOption,
    direction: SortDirection
  ): T[] {
    return [...items].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          const nameA = (a.name || a.title || "").toLowerCase();
          const nameB = (b.name || b.title || "").toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case "created":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "modified":
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      
      return direction === "asc" ? comparison : -comparison;
    });
  }

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

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Breadcrumb navigation and sort controls */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
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
          
          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">
                  <div className="flex items-center gap-2">
                    <ArrowDownAZ className="h-3 w-3" />
                    Name
                  </div>
                </SelectItem>
                <SelectItem value="created">
                  <div className="flex items-center gap-2">
                    <CalendarPlus className="h-3 w-3" />
                    Created
                  </div>
                </SelectItem>
                <SelectItem value="modified">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Modified
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSortDirection}
              title={sortDirection === "asc" ? "Ascending" : "Descending"}
            >
              <ArrowUpDown className={cn("h-4 w-4", sortDirection === "desc" && "rotate-180")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {childFolders.length === 0 && childPages.length === 0 && !creatingItem ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Folder className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg">This folder is empty</p>
            <p className="text-sm mt-1">Create a new folder or page from the sidebar</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Creating new item card - always at top front */}
            {creatingItem && (
              <div className="group relative flex flex-col items-center p-4 rounded-xl border-2 border-primary bg-card shadow-md">
                {/* Cancel button */}
                <button
                  onClick={handleCreateCancel}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
                
                <div className="relative mb-3 mt-2">
                  {creatingItem.type === "folder" ? (
                    <Folder className="h-12 w-12 text-primary fill-primary/10" />
                  ) : (
                    <FileText className="h-12 w-12 text-primary" />
                  )}
                </div>
                <Input
                  ref={inputRef}
                  value={creatingName}
                  onChange={(e) => setCreatingName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-sm font-medium text-center h-8 px-2"
                  placeholder={creatingItem.type === "folder" ? "Folder name" : "Page title"}
                />
                {/* Save button */}
                <Button
                  size="sm"
                  className="mt-3 h-7 px-3"
                  onClick={handleCreateConfirm}
                  disabled={!creatingName.trim()}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            )}

            {/* Folders */}
            {childFolders.map((folder) => {
              const folderPageCount = pages.filter((p) => p.folder_id === folder.id).length;
              const subfolderCount = folders.filter((f) => f.parent_id === folder.id).length;
              const isFav = isFavorite?.("folder", folder.id) ?? false;
              const isEditing = editingItem?.type === "folder" && editingItem.id === folder.id;
              
              return (
                <div
                  key={folder.id}
                  className={cn(
                    "group relative flex flex-col items-center p-4 rounded-xl border bg-card transition-all cursor-pointer",
                    isEditing 
                      ? "border-2 border-primary shadow-md" 
                      : "hover:bg-muted/50 hover:border-primary/30 hover:shadow-md"
                  )}
                  onClick={() => !isEditing && onSelectFolder(folder.id)}
                >
                  {/* Three-dot menu */}
                  {canEdit && !isEditing && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => startEditing("folder", folder.id, folder.name)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleFavorite?.("folder", folder.id)}>
                            <Star className={cn("h-4 w-4 mr-2", isFav && "fill-yellow-400 text-yellow-400")} />
                            {isFav ? "Remove from Favorites" : "Add to Favorites"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setCreateDialog({ type: "page", parentFolderId: folder.id })}>
                            <FilePlus className="h-4 w-4 mr-2" />
                            New Page
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setCreateDialog({ type: "folder", parentFolderId: folder.id })}>
                            <FolderPlus className="h-4 w-4 mr-2" />
                            New Subfolder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteDialog({ type: "folder", id: folder.id, name: folder.name })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  {/* Favorite indicator */}
                  {isFav && !isEditing && (
                    <div className="absolute top-2 left-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}
                  
                  <div className="relative mb-3">
                    <Folder className="h-12 w-12 text-primary fill-primary/10 group-hover:scale-105 transition-transform" />
                  </div>
                  {isEditing ? (
                    <Input
                      ref={editInputRef}
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleEditConfirm}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-center h-8 px-2"
                      placeholder="Folder name"
                    />
                  ) : (
                    <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">
                      {folder.name}
                    </span>
                  )}
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
              const isEditing = editingItem?.type === "page" && editingItem.id === page.id;
              
              return (
                <div
                  key={page.id}
                  className={cn(
                    "group relative flex flex-col items-center p-4 rounded-xl border bg-card transition-all cursor-pointer",
                    isEditing 
                      ? "border-2 border-primary shadow-md" 
                      : "hover:bg-muted/50 hover:border-primary/30 hover:shadow-md"
                  )}
                  onClick={() => !isEditing && onSelectPage(page.id)}
                >
                  {/* Three-dot menu */}
                  {canEdit && !isEditing && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => startEditing("page", page.id, page.title)}>
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
                            onClick={() => setDeleteDialog({ type: "page", id: page.id, name: page.title })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  {/* Favorite indicator */}
                  {isFav && !isEditing && (
                    <div className="absolute top-2 left-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}
                  
                  <div className="relative mb-3">
                    <FileText className="h-12 w-12 text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all" />
                  </div>
                  {isEditing ? (
                    <Input
                      ref={editInputRef}
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleEditConfirm}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-center h-8 px-2"
                      placeholder="Page title"
                    />
                  ) : (
                    <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">
                      {page.title}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground mt-1">Page</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteDialog?.type === "folder" ? "Folder" : "Page"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === "folder" 
                ? `Are you sure you want to delete "${deleteDialog?.name}" and all its contents? This action cannot be undone.`
                : `Are you sure you want to delete "${deleteDialog?.name}"? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create New Item Dialog */}
      <Dialog open={!!createDialog} onOpenChange={(open) => !open && setCreateDialog(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {createDialog?.type === "folder" ? "New Subfolder" : "New Page"}
            </DialogTitle>
            <DialogDescription>
              Enter a name for the new {createDialog?.type === "folder" ? "folder" : "page"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                {createDialog?.type === "folder" ? "Folder Name" : "Page Title"}
              </Label>
              <Input
                id="name"
                ref={createDialogInputRef}
                value={createDialogName}
                onChange={(e) => setCreateDialogName(e.target.value)}
                onKeyDown={handleCreateDialogKeyDown}
                placeholder={createDialog?.type === "folder" ? "Enter folder name" : "Enter page title"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDialogConfirm} disabled={!createDialogName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
