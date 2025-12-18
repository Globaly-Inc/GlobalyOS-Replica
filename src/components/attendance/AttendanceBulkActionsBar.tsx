import { Trash2, Download, X, CheckSquare, Square, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AttendanceBulkActionsBarProps {
  selectedCount: number;
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onExport: () => void;
  onEdit?: () => void;
  canDelete?: boolean;
  canEdit?: boolean;
  className?: string;
}

export const AttendanceBulkActionsBar = ({
  selectedCount,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onExport,
  onEdit,
  canDelete = false,
  canEdit = false,
  className,
}: AttendanceBulkActionsBarProps) => {
  const allSelected = selectedCount === totalItems && totalItems > 0;

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
      "bg-card border shadow-xl rounded-xl px-4 py-3",
      "flex items-center gap-3",
      "animate-in slide-in-from-bottom-4 duration-200",
      className
    )}>
      {/* Selection info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
          <span className="text-sm font-semibold">{selectedCount}</span>
          <span className="text-xs text-primary/80">of {totalItems}</span>
        </div>

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

        <span className="text-xs text-muted-foreground hidden sm:inline">
          {selectedCount} record{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {canEdit && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="gap-2 h-8"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="gap-2 h-8"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="gap-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        )}
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
