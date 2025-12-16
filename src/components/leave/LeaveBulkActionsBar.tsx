import { Trash2, Download, X, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SelectedTransaction {
  type: 'leave_taken' | 'adjustment';
  id: string;
  status?: string;
}

interface LeaveBulkActionsBarProps {
  selectedItems: SelectedTransaction[];
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteAdjustments: () => void;
  onDeleteLeave: () => void;
  onExportSelected: () => void;
  className?: string;
}

export const LeaveBulkActionsBar = ({
  selectedItems,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onDeleteAdjustments,
  onDeleteLeave,
  onExportSelected,
  className,
}: LeaveBulkActionsBarProps) => {
  const selectedCount = selectedItems.length;
  const allSelected = selectedCount === totalItems && totalItems > 0;

  const adjustmentCount = selectedItems.filter(i => i.type === 'adjustment').length;
  const leaveCount = selectedItems.filter(i => i.type === 'leave_taken').length;

  const getSelectionText = () => {
    const parts = [];
    if (adjustmentCount > 0) {
      parts.push(`${adjustmentCount} adjustment${adjustmentCount > 1 ? 's' : ''}`);
    }
    if (leaveCount > 0) {
      parts.push(`${leaveCount} leave${leaveCount > 1 ? 's' : ''}`);
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
          onClick={onExportSelected}
          className="gap-2 h-8"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        
        {leaveCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteLeave}
            className="gap-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete Leave ({leaveCount})</span>
          </Button>
        )}
        
        {adjustmentCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteAdjustments}
            className="gap-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete Adj ({adjustmentCount})</span>
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
