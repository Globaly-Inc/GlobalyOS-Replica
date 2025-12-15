import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronRight, ArrowUpDown, ArrowDownAZ, Clock, CalendarPlus, X, Check, ArrowLeft, Folder, FileText, LayoutGrid, List } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WikiEmptyState } from "./WikiEmptyState";
import { WikiItemCard } from "./WikiItemCard";
import { WikiBulkActionsBar } from "./WikiBulkActionsBar";
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
import { WikiShareDialog } from "./WikiShareDialog";
import { WikiMoveDialog } from "./WikiMoveDialog";
import { useWikiItemPermissions } from "@/hooks/useWikiPermissions";

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  access_scope?: string;
  permission_level?: string;
  created_by?: string;
}

interface WikiPage {
  id: string;
  folder_id: string | null;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_file?: boolean;
  file_type?: 'image' | 'pdf' | 'document';
  file_url?: string;
  thumbnail_url?: string;
  access_scope?: string;
  permission_level?: string;
  created_by?: string;
}

interface SelectedItem {
  type: 'folder' | 'page';
  id: string;
}

type SortOption = "name" | "created" | "modified";
type SortDirection = "asc" | "desc";
type ViewMode = "grid" | "list";

interface WikiFolderViewProps {
  folders: WikiFolder[];
  pages: WikiPage[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  canEditCurrentFolder?: boolean;
  hasGlobalEditAccess?: boolean;
  currentEmployeeId?: string;
  organizationId?: string;
  onCreateFolder?: (name: string, parentId: string | null) => void;
  onCreatePage?: (title: string, folderId: string | null) => void;
  onRenameFolder?: (folderId: string, name: string) => void;
  onRenamePage?: (pageId: string, title: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onDeletePage?: (pageId: string) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null) => void;
  onMovePage?: (pageId: string, newFolderId: string | null) => void;
  onDuplicatePage?: (pageId: string) => void;
  isFavorite?: (itemType: "folder" | "page", itemId: string) => boolean;
  onToggleFavorite?: (itemType: "folder" | "page", itemId: string) => void;
  creatingItem?: { type: "folder" | "page" } | null;
  onCreatingItemComplete?: () => void;
  onBack?: () => void;
}

export const WikiFolderView = ({
  folders,
  pages,
  currentFolderId,
  onSelectFolder,
  onSelectPage,
  canEditCurrentFolder = false,
  hasGlobalEditAccess = false,
  currentEmployeeId,
  organizationId,
  onCreateFolder,
  onCreatePage,
  onRenameFolder,
  onRenamePage,
  onDeleteFolder,
  onDeletePage,
  onMoveFolder,
  onMovePage,
  onDuplicatePage,
  isFavorite,
  onToggleFavorite,
  creatingItem,
  onCreatingItemComplete,
  onBack,
}: WikiFolderViewProps) => {
  const isMobile = useIsMobile();
  const [creatingName, setCreatingName] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [editingItem, setEditingItem] = useState<{ type: "folder" | "page"; id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const isSelectionMode = selectedItems.length > 0;

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ type: "folder" | "page"; id: string; name: string } | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState<{ type: "folder" | "page"; parentFolderId: string } | null>(null);
  const [createDialogName, setCreateDialogName] = useState("");
  const createDialogInputRef = useRef<HTMLInputElement>(null);
  
  // Share dialog state
  const [shareDialog, setShareDialog] = useState<{ type: "folder" | "page"; id: string; name: string } | null>(null);
  
  // Move dialog state
  const [moveDialog, setMoveDialog] = useState<{ type: "folder" | "page"; id: string; name: string; currentParentId: string | null } | null>(null);
  const [bulkMoveDialog, setBulkMoveDialog] = useState(false);

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

  const totalItems = childFolders.length + childPages.length;

  // Prepare items for permission check
  const itemsForPermissionCheck = useMemo(() => {
    return [
      ...childFolders.map(f => ({ type: 'folder' as const, id: f.id, created_by: f.created_by })),
      ...childPages.map(p => ({ type: 'page' as const, id: p.id, created_by: p.created_by })),
    ];
  }, [childFolders, childPages]);

  // Use the batch permission hook
  const { getItemPermissions } = useWikiItemPermissions(itemsForPermissionCheck);

  // Clear selection when folder changes
  useEffect(() => {
    setSelectedItems([]);
  }, [currentFolderId]);

  // Focus input when creating item
  useEffect(() => {
    if (creatingItem) {
      setCreatingName(creatingItem.type === "folder" ? "New Folder" : "New Page");
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

  // Selection handlers
  const toggleItemSelection = (type: 'folder' | 'page', id: string) => {
    setSelectedItems(prev => {
      const exists = prev.some(item => item.type === type && item.id === id);
      if (exists) {
        return prev.filter(item => !(item.type === type && item.id === id));
      }
      return [...prev, { type, id }];
    });
  };

  const selectAll = () => {
    const allItems: SelectedItem[] = [
      ...childFolders.map(f => ({ type: 'folder' as const, id: f.id })),
      ...childPages.map(p => ({ type: 'page' as const, id: p.id })),
    ];
    setSelectedItems(allItems);
  };

  const deselectAll = () => {
    setSelectedItems([]);
  };

  const isItemSelected = (type: 'folder' | 'page', id: string) => {
    return selectedItems.some(item => item.type === type && item.id === id);
  };

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

  // Bulk delete handler
  const handleBulkDelete = () => {
    selectedItems.forEach(item => {
      if (item.type === 'folder') {
        onDeleteFolder?.(item.id);
      } else {
        onDeletePage?.(item.id);
      }
    });
    setSelectedItems([]);
    setBulkDeleteDialog(false);
    toast.success(`Deleted ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}`);
  };

  // Bulk favorite handler
  const handleBulkFavorite = () => {
    selectedItems.forEach(item => {
      onToggleFavorite?.(item.type, item.id);
    });
    toast.success(`Updated favorites for ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}`);
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
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "Home" }];
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
      {/* Header with breadcrumb navigation and controls */}
      <div className={cn("border-b bg-card", isMobile ? "px-4 py-3" : "px-6 py-4")}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 text-sm min-w-0 flex-1">
            {/* Mobile back button */}
            {isMobile && onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mr-1 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {/* Breadcrumbs - simplified on mobile */}
            {isMobile ? (
              <span className="font-semibold truncate">
                {breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].name : "Wiki Home"}
              </span>
            ) : (
              breadcrumbs.map((crumb, index) => (
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
              ))
            )}
          </div>
          
          {/* View toggle and sort controls - hide on mobile */}
          {!isMobile && (
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

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
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn("flex-1 overflow-y-auto", isMobile ? "p-4" : "p-6")}>
        {childFolders.length === 0 && childPages.length === 0 && !creatingItem ? (
          <WikiEmptyState
            type={currentFolderId ? "folder" : "wiki"}
            canEdit={canEditCurrentFolder}
            onCreateFolder={() => onCreateFolder?.("New Folder", currentFolderId)}
            onCreatePage={() => onCreatePage?.("New Page", currentFolderId)}
          />
        ) : (
          <div className="space-y-6">
            {/* Folders Section */}
            {(childFolders.length > 0 || (creatingItem?.type === "folder")) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Folders
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {childFolders.length}
                  </span>
                </h3>
                <div className={cn(
                  "grid gap-4",
                  viewMode === "grid" 
                    ? isMobile 
                      ? "grid-cols-2" 
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    : "grid-cols-1"
                )}>
                  {/* Creating new folder card */}
                  {creatingItem?.type === "folder" && (
                    <div className="group relative flex flex-col items-center p-4 rounded-xl border-2 border-primary bg-card shadow-md h-40">
                      <button
                        onClick={handleCreateCancel}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                        title="Cancel"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      
                      <div className="relative mb-2 mt-1">
                        <Folder className="h-14 w-14 text-amber-500 fill-amber-100" />
                      </div>
                      <Input
                        ref={inputRef}
                        value={creatingName}
                        onChange={(e) => setCreatingName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="text-sm font-medium text-center h-8 px-2"
                        placeholder="Folder name"
                      />
                      <Button
                        size="sm"
                        className="mt-2 h-7 px-3"
                        onClick={handleCreateConfirm}
                        disabled={!creatingName.trim()}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}

                  {childFolders.map((folder) => {
                    const folderPageCount = pages.filter((p) => p.folder_id === folder.id).length;
                    const subfolderCount = folders.filter((f) => f.parent_id === folder.id).length;
                    const isFav = isFavorite?.("folder", folder.id) ?? false;
                    const isEditing = editingItem?.type === "folder" && editingItem.id === folder.id;
                    const itemPerms = getItemPermissions("folder", folder.id);
                    
                    return (
                      <WikiItemCard
                        key={folder.id}
                        type="folder"
                        item={folder}
                        isSelected={isItemSelected('folder', folder.id)}
                        isSelectionMode={isSelectionMode}
                        isFavorite={isFav}
                        isEditing={isEditing}
                        editValue={isEditing ? editingItem.name : ''}
                        canEdit={itemPerms.canEdit}
                        canDelete={itemPerms.isOwner}
                        canMove={itemPerms.isOwner}
                        isMobile={isMobile}
                        folderStats={{ subfolderCount, pageCount: folderPageCount }}
                        onSelect={() => onSelectFolder(folder.id)}
                        onToggleSelect={() => toggleItemSelection('folder', folder.id)}
                        onStartEditing={() => startEditing("folder", folder.id, folder.name)}
                        onEditChange={(value) => setEditingItem(prev => prev ? { ...prev, name: value } : null)}
                        onEditConfirm={handleEditConfirm}
                        onEditCancel={handleEditCancel}
                        onToggleFavorite={() => onToggleFavorite?.("folder", folder.id)}
                        onShare={() => setShareDialog({ type: "folder", id: folder.id, name: folder.name })}
                        onMove={() => setMoveDialog({ type: "folder", id: folder.id, name: folder.name, currentParentId: folder.parent_id })}
                        onDelete={() => setDeleteDialog({ type: "folder", id: folder.id, name: folder.name })}
                        onCreatePage={() => setCreateDialog({ type: "page", parentFolderId: folder.id })}
                        onCreateFolder={() => setCreateDialog({ type: "folder", parentFolderId: folder.id })}
                        editInputRef={editInputRef}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files Section */}
            {(childPages.length > 0 || (creatingItem?.type === "page")) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Files
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {childPages.length}
                  </span>
                </h3>
                <div className={cn(
                  "grid gap-4",
                  viewMode === "grid" 
                    ? isMobile 
                      ? "grid-cols-2" 
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    : "grid-cols-1"
                )}>
                  {/* Creating new page card */}
                  {creatingItem?.type === "page" && (
                    <div className="group relative flex flex-col items-center p-4 rounded-xl border-2 border-primary bg-card shadow-md h-40">
                      <button
                        onClick={handleCreateCancel}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                        title="Cancel"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      
                      <div className="relative mb-2 mt-1">
                        <FileText className="h-14 w-14 text-primary" />
                      </div>
                      <Input
                        ref={inputRef}
                        value={creatingName}
                        onChange={(e) => setCreatingName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="text-sm font-medium text-center h-8 px-2"
                        placeholder="Page title"
                      />
                      <Button
                        size="sm"
                        className="mt-2 h-7 px-3"
                        onClick={handleCreateConfirm}
                        disabled={!creatingName.trim()}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}

                  {childPages.map((page) => {
                    const isFav = isFavorite?.("page", page.id) ?? false;
                    const isEditing = editingItem?.type === "page" && editingItem.id === page.id;
                    const itemPerms = getItemPermissions("page", page.id);
                    
                    return (
                      <WikiItemCard
                        key={page.id}
                        type="page"
                        item={page}
                        isSelected={isItemSelected('page', page.id)}
                        isSelectionMode={isSelectionMode}
                        isFavorite={isFav}
                        isEditing={isEditing}
                        editValue={isEditing ? editingItem.name : ''}
                        canEdit={itemPerms.canEdit}
                        canDelete={itemPerms.isOwner}
                        canMove={itemPerms.isOwner}
                        isMobile={isMobile}
                        onSelect={() => onSelectPage(page.id)}
                        onToggleSelect={() => toggleItemSelection('page', page.id)}
                        onStartEditing={() => startEditing("page", page.id, page.title)}
                        onEditChange={(value) => setEditingItem(prev => prev ? { ...prev, name: value } : null)}
                        onEditConfirm={handleEditConfirm}
                        onEditCancel={handleEditCancel}
                        onToggleFavorite={() => onToggleFavorite?.("page", page.id)}
                        onShare={() => setShareDialog({ type: "page", id: page.id, name: page.title })}
                        onMove={() => setMoveDialog({ type: "page", id: page.id, name: page.title, currentParentId: page.folder_id })}
                        onDelete={() => setDeleteDialog({ type: "page", id: page.id, name: page.title })}
                        onDuplicate={() => onDuplicatePage?.(page.id)}
                        editInputRef={editInputRef}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {isSelectionMode && (
        <WikiBulkActionsBar
          selectedItems={selectedItems}
          totalItems={totalItems}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onDelete={() => setBulkDeleteDialog(true)}
          onMove={() => setBulkMoveDialog(true)}
          onFavorite={handleBulkFavorite}
        />
      )}

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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.length} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
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

      {/* Share Dialog */}
      {shareDialog && organizationId && (
        <WikiShareDialog
          open={!!shareDialog}
          onOpenChange={(open) => !open && setShareDialog(null)}
          itemType={shareDialog.type}
          itemId={shareDialog.id}
          itemName={shareDialog.name}
          organizationId={organizationId}
        />
      )}

      {/* Move Dialog */}
      {moveDialog && (
        <WikiMoveDialog
          open={!!moveDialog}
          onOpenChange={(open) => !open && setMoveDialog(null)}
          itemType={moveDialog.type}
          itemId={moveDialog.id}
          itemName={moveDialog.name}
          currentParentId={moveDialog.currentParentId}
          folders={folders}
          onMove={(newParentId) => {
            if (moveDialog.type === "folder") {
              onMoveFolder?.(moveDialog.id, newParentId);
            } else {
              onMovePage?.(moveDialog.id, newParentId);
            }
            setMoveDialog(null);
          }}
        />
      )}

      {/* Bulk Move Dialog */}
      {bulkMoveDialog && (
        <WikiMoveDialog
          open={bulkMoveDialog}
          onOpenChange={setBulkMoveDialog}
          itemType="page"
          itemId="bulk"
          itemName={`${selectedItems.length} items`}
          currentParentId={currentFolderId}
          folders={folders}
          onMove={(newParentId) => {
            selectedItems.forEach(item => {
              if (item.type === 'folder') {
                onMoveFolder?.(item.id, newParentId);
              } else {
                onMovePage?.(item.id, newParentId);
              }
            });
            setSelectedItems([]);
            setBulkMoveDialog(false);
            toast.success(`Moved ${selectedItems.length} items`);
          }}
        />
      )}
    </div>
  );
};
