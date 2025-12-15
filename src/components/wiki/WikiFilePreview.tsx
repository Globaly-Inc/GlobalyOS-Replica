import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, 
  Star, Share2, Pencil, Trash2, Move, Copy, FileText, File
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WikiSharedAvatars, SharedMember, SharedGroup } from "./WikiSharedAvatars";
import { WikiMarkdownRenderer } from "./WikiMarkdownRenderer";

interface WikiPage {
  id: string;
  title: string;
  content: string | null;
  is_file?: boolean;
  file_type?: string;
  file_url?: string;
  thumbnail_url?: string;
  updated_at: string;
}

interface WikiFilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItem: WikiPage | null;
  allItems: WikiPage[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  canEdit: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onMove: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  sharedMembers: SharedMember[];
  sharedGroups: SharedGroup[];
  onShareClick?: () => void;
}

// File type badge colors
const getFileTypeBadge = (fileType?: string, title?: string, fileUrl?: string) => {
  const titleExt = title?.split('.').pop()?.toLowerCase() || '';
  const urlExt = fileUrl?.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
  const ext = titleExt.length <= 5 && titleExt !== title?.toLowerCase() ? titleExt : urlExt;

  if (fileType === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return { label: ext.toUpperCase().slice(0, 4) || 'IMG', className: 'bg-primary text-primary-foreground' };
  }
  if (fileType === 'pdf' || ext === 'pdf') {
    return { label: 'PDF', className: 'bg-destructive text-destructive-foreground' };
  }
  if (['doc', 'docx'].includes(ext)) {
    return { label: ext.toUpperCase(), className: 'bg-secondary text-secondary-foreground' };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { label: ext.toUpperCase(), className: 'bg-success text-success-foreground' };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return { label: ext.toUpperCase(), className: 'bg-warning text-warning-foreground' };
  }
  return { label: ext?.toUpperCase()?.slice(0, 4) || 'FILE', className: 'bg-muted text-muted-foreground' };
};

export const WikiFilePreview = ({
  open,
  onOpenChange,
  currentItem,
  allItems,
  currentIndex,
  onNavigate,
  canEdit,
  isFavorite,
  onToggleFavorite,
  onShare,
  onMove,
  onDelete,
  onDuplicate,
  onEdit,
  sharedMembers,
  sharedGroups,
  onShareClick,
}: WikiFilePreviewProps) => {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [currentIndex, open]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
      setZoom(1);
    }
  }, [currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < allItems.length - 1) {
      onNavigate(currentIndex + 1);
      setZoom(1);
    }
  }, [currentIndex, allItems.length, onNavigate]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "Escape") onOpenChange(false);
  }, [handlePrevious, handleNext, onOpenChange]);

  useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleDownload = () => {
    if (currentItem?.file_url) {
      window.open(currentItem.file_url, "_blank");
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 0.5));

  if (!currentItem) return null;

  const isImage = currentItem.file_type === 'image' || 
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(
      currentItem.title?.split('.').pop()?.toLowerCase() || ''
    );
  const isPdf = currentItem.file_type === 'pdf' || 
    currentItem.title?.toLowerCase().endsWith('.pdf');
  const isWikiPage = !currentItem.is_file && !currentItem.file_url;
  const fileTypeBadge = getFileTypeBadge(currentItem.file_type, currentItem.title, currentItem.file_url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-background border-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20 bg-gradient-to-b from-background via-background/95 to-transparent">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {!isWikiPage && (
              <Badge variant="secondary" className={cn("text-xs", fileTypeBadge.className)}>
                {fileTypeBadge.label}
              </Badge>
            )}
            
            <span className="font-medium truncate max-w-[300px]">
              {currentItem.title}
            </span>
            
            {allItems.length > 1 && (
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {allItems.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Shared avatars */}
            <WikiSharedAvatars
              members={sharedMembers}
              groups={sharedGroups}
              size="sm"
              onClick={onShareClick}
              className="mr-2"
            />

            {/* Zoom controls for images */}
            {isImage && (
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Actions */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleFavorite}
            >
              <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-400")} />
            </Button>
            
            {canEdit && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                {isWikiPage && onEdit && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMove}>
                  <Move className="h-4 w-4" />
                </Button>
                {onDuplicate && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive" 
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {currentItem.file_url && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex items-center justify-center w-full h-full overflow-auto pt-16 pb-20">
          {/* Image preview */}
          {isImage && currentItem.file_url && (
            <img
              src={currentItem.file_url}
              alt={currentItem.title}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          )}

          {/* PDF preview */}
          {isPdf && currentItem.file_url && (
            <iframe
              src={`${currentItem.file_url}#toolbar=1&navpanes=0`}
              className="w-full h-full max-w-4xl"
              title={currentItem.title}
            />
          )}

          {/* Wiki page preview */}
          {isWikiPage && currentItem.content && (
            <div className="w-full max-w-4xl px-6 py-8 overflow-y-auto">
              <WikiMarkdownRenderer content={currentItem.content} />
            </div>
          )}

          {/* Other file types */}
          {!isImage && !isPdf && !isWikiPage && (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className={cn("w-24 h-24 rounded-xl flex items-center justify-center", fileTypeBadge.className)}>
                <span className="text-2xl font-bold">{fileTypeBadge.label}</span>
              </div>
              <h3 className="font-medium text-lg">{currentItem.title}</h3>
              <p className="text-sm text-muted-foreground">
                This file type cannot be previewed directly.
              </p>
              {currentItem.file_url && (
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {allItems.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 hover:bg-background",
                currentIndex === 0 && "opacity-50 cursor-not-allowed"
              )}
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 hover:bg-background",
                currentIndex === allItems.length - 1 && "opacity-50 cursor-not-allowed"
              )}
              onClick={handleNext}
              disabled={currentIndex === allItems.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Thumbnails for images */}
        {allItems.length > 1 && allItems.some(item => item.file_type === 'image' || item.thumbnail_url) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-background/80 rounded-lg backdrop-blur-sm max-w-[80vw] overflow-x-auto">
            {allItems.map((item, index) => {
              const isImageItem = item.file_type === 'image' || item.thumbnail_url;
              const badge = getFileTypeBadge(item.file_type, item.title, item.file_url);
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(index);
                    setZoom(1);
                  }}
                  className={cn(
                    "h-12 w-12 rounded-md overflow-hidden border-2 transition-colors flex-shrink-0",
                    index === currentIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                  )}
                >
                  {isImageItem && (item.thumbnail_url || item.file_url) ? (
                    <img
                      src={item.thumbnail_url || item.file_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className={cn("h-full w-full flex items-center justify-center text-[10px] font-bold", badge.className)}>
                      {badge.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
