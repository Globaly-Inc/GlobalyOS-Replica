import { Button } from "@/components/ui/button";
import { X, Trash2, Download, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectedKpi {
  id: string;
  scopeType?: string; // 'individual' | 'department' | 'office' | 'project' | 'organization'
  canEdit: boolean;
}

interface KpiBulkActionsBarProps {
  selectedItems: SelectedKpi[];
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  canDelete: boolean;
  className?: string;
}

export function KpiBulkActionsBar({
  selectedItems,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onExportSelected,
  canDelete,
  className,
}: KpiBulkActionsBarProps) {
  const allSelected = selectedItems.length === totalItems && totalItems > 0;

  // Count by type
  const individualCount = selectedItems.filter(k => !k.scopeType || k.scopeType === 'individual').length;
  const groupCount = selectedItems.filter(k => k.scopeType && ['department', 'office', 'project'].includes(k.scopeType)).length;
  const orgCount = selectedItems.filter(k => k.scopeType === 'organization').length;

  // Build summary text
  const summaryParts: string[] = [];
  if (individualCount > 0) summaryParts.push(`${individualCount} individual`);
  if (groupCount > 0) summaryParts.push(`${groupCount} group`);
  if (orgCount > 0) summaryParts.push(`${orgCount} org`);
  const summaryText = summaryParts.length > 0 ? summaryParts.join(', ') : '';

  // Count deletable items
  const deletableCount = selectedItems.filter(k => k.canEdit).length;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "bg-background border rounded-lg shadow-lg px-4 py-3",
        "flex items-center gap-3 flex-wrap justify-center",
        "animate-in slide-in-from-bottom-4 duration-200",
        className
      )}
    >
      {/* Selection info */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedItems.length} of {totalItems} selected
        </span>
        {summaryText && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            ({summaryText})
          </span>
        )}
      </div>

      {/* Select All / Deselect All toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="gap-1.5"
      >
        {allSelected ? (
          <>
            <Square className="h-4 w-4" />
            <span className="hidden sm:inline">Deselect All</span>
          </>
        ) : (
          <>
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Select All</span>
          </>
        )}
      </Button>

      {/* Export button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onExportSelected}
        className="gap-1.5"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
      </Button>

      {/* Delete button - only show if user can delete selected items */}
      {canDelete && deletableCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteSelected}
          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete ({deletableCount})</span>
        </Button>
      )}

      {/* Cancel button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDeselectAll}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
