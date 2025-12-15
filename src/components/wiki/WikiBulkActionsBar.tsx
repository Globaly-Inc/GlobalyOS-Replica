import { Trash2, Move, Star, Download, X, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SelectedItem {
  type: 'folder' | 'page';
  id: string;
}

interface WikiBulkActionsBarProps {
  selectedItems: SelectedItem[];
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onMove: () => void;
  onFavorite: () => void;
  onDownload?: () => void;
  className?: string;
}

export const WikiBulkActionsBar = ({
  selectedItems,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onMove,
  onFavorite,
  onDownload,
  className,
}: WikiBulkActionsBarProps) => {
  const selectedCount = selectedItems.length;
  const allSelected = selectedCount === totalItems && totalItems > 0;

  const folderCount = selectedItems.filter(i => i.type === 'folder').length;
  const pageCount = selectedItems.filter(i => i.type === 'page').length;

  const getSelectionText = () => {
    const parts = [];
    if (folderCount > 0) {
      parts.push(`${folderCount} folder${folderCount > 1 ? 's' : ''}`);
    }
    if (pageCount > 0) {
      parts.push(`${pageCount} file${pageCount > 1 ? 's' : ''}`);
    }
    return parts.join(', ');
  };

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
      "bg-card border shadow-xl rounded-xl px-4 py-3",
      "flex items-center gap-3",
      "animate-in slide-in-from-bottom-4 duration-200",
      className
    )}>
      {/* Selection info and Select All button */}
      <div className="flex items-center gap-3">
        {/* Selection count badge */}
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
          <span className="text-sm font-semibold">{selectedCount}</span>
          <span className="text-xs text-primary/80">of {totalItems}</span>
        </div>

        {/* Select All / Deselect All button */}
        <Button
          variant="outline"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="gap-2 h-8"
        >
          {allSelected ? (
            <>
              <Square className="h-4 w-4" />
              Deselect All
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4" />
              Select All
            </>
          )}
        </Button>

        {/* Selection details */}
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {getSelectionText()}
        </span>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMove}
          className="gap-2 h-8"
        >
          <Move className="h-4 w-4" />
          <span className="hidden sm:inline">Move</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFavorite}
          className="gap-2 h-8"
        >
          <Star className="h-4 w-4" />
          <span className="hidden sm:inline">Favorite</span>
        </Button>
        {onDownload && pageCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="gap-2 h-8"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="gap-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Cancel button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDeselectAll}
        className="h-8 w-8"
        title="Cancel selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
