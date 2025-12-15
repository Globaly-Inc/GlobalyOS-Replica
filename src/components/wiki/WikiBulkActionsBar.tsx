import { Trash2, Move, Star, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const someSelected = selectedCount > 0 && selectedCount < totalItems;

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
    return parts.join(', ') + ' selected';
  };

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
      "bg-card border shadow-xl rounded-xl px-4 py-3",
      "flex items-center gap-4",
      "animate-in slide-in-from-bottom-4 duration-200",
      className
    )}>
      {/* Select all checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => {
            if (checked) {
              onSelectAll();
            } else {
              onDeselectAll();
            }
          }}
          className={cn(someSelected && "data-[state=checked]:bg-primary/50")}
        />
        <span className="text-sm font-medium text-muted-foreground">
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
          className="gap-2"
        >
          <Move className="h-4 w-4" />
          <span className="hidden sm:inline">Move</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFavorite}
          className="gap-2"
        >
          <Star className="h-4 w-4" />
          <span className="hidden sm:inline">Favorite</span>
        </Button>
        {onDownload && pageCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Cancel button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDeselectAll}
        className="gap-1"
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">Cancel</span>
      </Button>
    </div>
  );
};
