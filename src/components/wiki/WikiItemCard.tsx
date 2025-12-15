import { Folder, FileText, Clock, Star, MoreHorizontal, Pencil, Trash2, Share2, Move, Copy, FilePlus, FolderPlus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRelativeTime } from "@/hooks/useRelativeTime";

// File type icons with colors based on extension
const getFileTypeIcon = (fileType?: string, title?: string, fileUrl?: string) => {
  // Try to get extension from title first, then from file URL
  const titleExt = title?.split('.').pop()?.toLowerCase() || '';
  const urlExt = fileUrl?.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
  const ext = titleExt.length <= 5 && titleExt !== title?.toLowerCase() ? titleExt : urlExt;

  // Helpers: keep all colors theme-safe via semantic tokens
  const badge = (icon: string, cls: string) => ({ icon, badgeClass: cls });

  if (fileType === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    const displayExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)
      ? ext.toUpperCase().slice(0, 4)
      : 'IMG';
    return badge(displayExt, 'bg-primary text-primary-foreground');
  }

  if (fileType === 'pdf' || ext === 'pdf') {
    return badge('PDF', 'bg-destructive text-destructive-foreground');
  }

  if (fileType === 'document' || ['doc', 'docx'].includes(ext)) {
    return badge(['doc', 'docx'].includes(ext) ? ext.toUpperCase() : 'DOC', 'bg-secondary text-secondary-foreground');
  }

  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return badge(ext.toUpperCase(), 'bg-success text-success-foreground');
  }

  if (['ppt', 'pptx'].includes(ext)) {
    return badge(ext.toUpperCase(), 'bg-warning text-warning-foreground');
  }

  if (['txt', 'md', 'rtf'].includes(ext)) {
    return badge(ext.toUpperCase(), 'bg-muted text-muted-foreground');
  }

  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'html', 'css', 'json', 'xml'].includes(ext)) {
    return badge(ext.toUpperCase().slice(0, 4), 'bg-accent text-accent-foreground');
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return badge(ext.toUpperCase(), 'bg-secondary text-secondary-foreground');
  }

  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return badge(ext.toUpperCase(), 'bg-accent text-accent-foreground');
  }

  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
    return badge(ext.toUpperCase(), 'bg-primary text-primary-foreground');
  }

  if (ext && ext.length <= 4) {
    return badge(ext.toUpperCase(), 'bg-muted text-muted-foreground');
  }

  return badge('FILE', 'bg-muted text-muted-foreground');
};

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
  is_file?: boolean;
  file_type?: string;
  file_url?: string;
  thumbnail_url?: string;
}

interface WikiItemCardProps {
  type: 'folder' | 'page';
  item: WikiFolder | WikiPage;
  isSelected: boolean;
  isSelectionMode: boolean;
  isFavorite: boolean;
  isEditing: boolean;
  editValue: string;
  canEdit: boolean;
  canDelete?: boolean;
  canMove?: boolean;
  isMobile: boolean;
  folderStats?: { subfolderCount: number; pageCount: number };
  onSelect: () => void;
  onToggleSelect: () => void;
  onStartEditing: () => void;
  onEditChange: (value: string) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onMove: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onCreatePage?: () => void;
  onCreateFolder?: () => void;
  editInputRef?: React.RefObject<HTMLInputElement>;
}

export const WikiItemCard = ({
  type,
  item,
  isSelected,
  isSelectionMode,
  isFavorite,
  isEditing,
  editValue,
  canEdit,
  canDelete,
  canMove,
  isMobile,
  folderStats,
  onSelect,
  onToggleSelect,
  onStartEditing,
  onEditChange,
  onEditConfirm,
  onEditCancel,
  onToggleFavorite,
  onShare,
  onMove,
  onDelete,
  onDuplicate,
  onCreatePage,
  onCreateFolder,
  editInputRef,
}: WikiItemCardProps) => {
  const { getShortRelativeTime } = useRelativeTime();
  
  const isFolder = type === 'folder';
  const folder = isFolder ? (item as WikiFolder) : null;
  const page = !isFolder ? (item as WikiPage) : null;
  
  const name = isFolder ? folder!.name : page!.title;

  const isUploadedFile = !!page && (page.is_file || !!page.file_url || !!page.file_type || !!page.thumbnail_url);

  // Only show image preview if there's actually a thumbnail URL
  const hasImagePreview = isUploadedFile && page?.file_type === 'image' && !!page?.thumbnail_url;

  // Get file type info for all uploaded files
  const fileTypeInfo = isUploadedFile ? getFileTypeIcon(page?.file_type, page?.title, page?.file_url) : null;

  // Show file badge for any uploaded file that doesn't have an image preview
  const showFileBadge = isUploadedFile && !hasImagePreview;

  // Determine effective permissions - canDelete and canMove default to canEdit if not specified
  const effectiveCanDelete = canDelete ?? canEdit;
  const effectiveCanMove = canMove ?? canEdit;
  const canPerformAnyAction = canEdit || effectiveCanDelete || effectiveCanMove;
  

  const handleCardClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect();
    } else {
      onSelect();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEditConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onEditCancel();
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card transition-all cursor-pointer overflow-hidden",
        hasImagePreview ? "h-36" : "items-center p-4 h-40",
        isEditing
          ? "border-2 border-primary shadow-md" 
          : isSelected
            ? "border-2 border-primary bg-primary/5"
            : "hover:bg-muted/50 hover:border-primary/30 hover:shadow-md"
      )}
      onClick={handleCardClick}
    >
      {/* Favorite indicator - top left */}
      {isFavorite && !isEditing && (
        <div className="absolute top-2 left-2 z-20">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        </div>
      )}

      {/* Checkbox - top right, visible on hover or in selection mode */}
      {!isEditing && (
        <div 
          className={cn(
            "absolute top-2 right-2 z-20 transition-opacity",
            isSelectionMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={handleCheckboxClick}
        >
          <Checkbox
            checked={isSelected}
            className="h-5 w-5 bg-background border-2"
          />
        </div>
      )}

      {/* Three-dot menu - below checkbox, show for any user */}
      {!isEditing && !isMobile && !isSelectionMode && (
        <div className="absolute top-9 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 hover:bg-background">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {/* Favorites - available to all users */}
              <DropdownMenuItem onClick={onToggleFavorite}>
                <Star className={cn("h-4 w-4 mr-2", isFavorite && "fill-yellow-400 text-yellow-400")} />
                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              </DropdownMenuItem>
              
              {/* Rename - requires edit access */}
              {canEdit && (
                <DropdownMenuItem onClick={onStartEditing}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              
              {/* Share - requires edit access */}
              {canEdit && (
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              
              {/* Move - requires ownership */}
              {effectiveCanMove && (
                <DropdownMenuItem onClick={onMove}>
                  <Move className="h-4 w-4 mr-2" />
                  Move to...
                </DropdownMenuItem>
              )}
              
              {/* Duplicate - requires edit access (pages only) */}
              {!isFolder && onDuplicate && canEdit && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              
              {/* Create inside folder - requires edit access */}
              {isFolder && canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onCreatePage}>
                    <FilePlus className="h-4 w-4 mr-2" />
                    New Page
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCreateFolder}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Subfolder
                  </DropdownMenuItem>
                </>
              )}
              
              {/* Delete - requires ownership */}
              {effectiveCanDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Image file preview background with white overlay */}
      {hasImagePreview && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${page!.thumbnail_url})` }}
          />
          {/* White overlay for better icon visibility */}
          <div className="absolute inset-0 bg-white/50" />
        </>
      )}

      {/* File type badge for uploaded files (non-image or no preview) */}
      {showFileBadge && fileTypeInfo && (
        <>
          <div className="relative mb-2 mt-1">
            <div className={cn("w-14 h-14 rounded-lg flex items-center justify-center", fileTypeInfo.badgeClass)}>
              <span className="font-bold text-xs">{fileTypeInfo.icon}</span>
            </div>
          </div>
          <span className="text-sm font-medium text-center line-clamp-1 group-hover:text-primary transition-colors px-2">
            {page!.title}
          </span>
          <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getShortRelativeTime(page!.updated_at)}
          </span>
        </>
      )}

      {/* Gradient overlay with filename for image files with preview */}
      {hasImagePreview && (
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background/95 via-background/70 to-transparent flex items-end p-3 z-10">
          <div className="w-full">
            <span className="text-sm font-medium text-foreground line-clamp-1">
              {page!.title}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {getShortRelativeTime(page!.updated_at)}
            </span>
          </div>
        </div>
      )}

      {/* Folder content */}
      {isFolder && (
        <>
          <div className="relative mb-2 mt-1">
            <Folder className="h-14 w-14 text-amber-500 fill-amber-100 group-hover:scale-105 transition-transform" />
          </div>
          {isEditing ? (
            <div className="flex flex-col items-center gap-2 w-full px-2">
              <Input
                ref={editInputRef}
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={onEditConfirm}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium text-center h-8 px-2"
                placeholder="Folder name"
              />
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-center line-clamp-1 group-hover:text-primary transition-colors px-2">
                {folder!.name}
              </span>
              <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getShortRelativeTime(folder!.updated_at)}
              </span>
              {folderStats && (
                <span className="text-xs text-muted-foreground">
                  {folderStats.subfolderCount > 0 && `${folderStats.subfolderCount} folder${folderStats.subfolderCount > 1 ? "s" : ""}`}
                  {folderStats.subfolderCount > 0 && folderStats.pageCount > 0 && ", "}
                  {folderStats.pageCount > 0 && `${folderStats.pageCount} file${folderStats.pageCount > 1 ? "s" : ""}`}
                  {folderStats.subfolderCount === 0 && folderStats.pageCount === 0 && "Empty"}
                </span>
              )}
            </>
          )}
        </>
      )}

      {/* Regular page (non-file) content */}
      {!isFolder && !isUploadedFile && (
        <>
          <div className="relative mb-2 mt-1">
            <FileText className="h-14 w-14 text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all" />
          </div>
          {isEditing ? (
            <div className="flex flex-col items-center gap-2 w-full px-2">
              <Input
                ref={editInputRef}
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={onEditConfirm}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium text-center h-8 px-2"
                placeholder="Page title"
              />
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-center line-clamp-1 group-hover:text-primary transition-colors px-2">
                {page!.title}
              </span>
              <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getShortRelativeTime(page!.updated_at)}
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
};
