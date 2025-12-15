import { Folder, FileText, File, Clock, Star, MoreHorizontal, Pencil, Trash2, Share2, Move, Copy, FilePlus, FolderPlus, Check, X } from "lucide-react";
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
const getFileTypeIcon = (fileType?: string, title?: string) => {
  const ext = title?.split('.').pop()?.toLowerCase() || '';
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return { icon: ext.toUpperCase().slice(0, 4), color: 'bg-purple-500', textColor: 'text-purple-500' };
  }
  // PDF
  if (fileType === 'pdf' || ext === 'pdf') {
    return { icon: 'PDF', color: 'bg-red-500', textColor: 'text-red-500' };
  }
  // Word documents
  if (fileType === 'document' || ['doc', 'docx'].includes(ext)) {
    return { icon: ext === 'docx' ? 'DOCX' : 'DOC', color: 'bg-blue-500', textColor: 'text-blue-500' };
  }
  // Excel files
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { icon: ext.toUpperCase(), color: 'bg-green-500', textColor: 'text-green-500' };
  }
  // PowerPoint
  if (['ppt', 'pptx'].includes(ext)) {
    return { icon: ext.toUpperCase(), color: 'bg-orange-500', textColor: 'text-orange-500' };
  }
  // Text and markdown
  if (['txt', 'md', 'rtf'].includes(ext)) {
    return { icon: ext.toUpperCase(), color: 'bg-gray-500', textColor: 'text-gray-500' };
  }
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'html', 'css', 'json', 'xml'].includes(ext)) {
    return { icon: ext.toUpperCase().slice(0, 4), color: 'bg-cyan-500', textColor: 'text-cyan-500' };
  }
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icon: ext.toUpperCase(), color: 'bg-yellow-600', textColor: 'text-yellow-600' };
  }
  // Audio files
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return { icon: ext.toUpperCase(), color: 'bg-pink-500', textColor: 'text-pink-500' };
  }
  // Video files
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
    return { icon: ext.toUpperCase(), color: 'bg-indigo-500', textColor: 'text-indigo-500' };
  }
  // Default file - show extension if exists
  if (ext && ext.length <= 4) {
    return { icon: ext.toUpperCase(), color: 'bg-slate-500', textColor: 'text-slate-500' };
  }
  return { icon: 'FILE', color: 'bg-slate-500', textColor: 'text-slate-500' };
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
  file_type?: 'image' | 'pdf' | 'document';
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
  const isImageFile = page?.is_file && page?.file_type === 'image' && page?.thumbnail_url;
  const fileTypeInfo = page?.is_file ? getFileTypeIcon(page.file_type, page.title) : null;

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
        isImageFile ? "h-36" : "items-center p-4 h-40",
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

      {/* Image file preview background */}
      {isImageFile && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${page!.thumbnail_url})` }}
        />
      )}

      {/* File type badge for uploaded files (non-image) */}
      {page?.is_file && fileTypeInfo && !isImageFile && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn("w-16 h-16 rounded-lg flex items-center justify-center relative", fileTypeInfo.color)}>
            <File className="h-10 w-10 text-white/30 absolute" />
            <span className="text-white font-bold text-xs relative z-10">{fileTypeInfo.icon}</span>
          </div>
        </div>
      )}

      {/* Gradient overlay with filename for files */}
      {page?.is_file && (
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background/95 via-background/70 to-transparent flex items-end p-3 z-10">
          <div className="w-full">
            <span className="text-sm font-medium text-foreground line-clamp-1">
              {page.title}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {getShortRelativeTime(page.updated_at)}
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
      {!isFolder && !page?.is_file && (
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
