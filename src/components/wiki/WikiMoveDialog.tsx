import { useState } from "react";
import { Folder, ChevronRight, ChevronDown, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface WikiMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "folder" | "page";
  itemId: string;
  itemName: string;
  currentParentId: string | null;
  folders: WikiFolder[];
  onMove: (newParentId: string | null) => void;
  isMoving?: boolean;
}

export const WikiMoveDialog = ({
  open,
  onOpenChange,
  itemType,
  itemId,
  itemName,
  currentParentId,
  folders,
  onMove,
  isMoving = false,
}: WikiMoveDialogProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentParentId);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Get child folders for a parent
  const getChildFolders = (parentId: string | null): WikiFolder[] => {
    return folders.filter((f) => f.parent_id === parentId);
  };

  // Check if a folder is a descendant of the item being moved (to prevent circular references)
  const isDescendantOf = (folderId: string, ancestorId: string): boolean => {
    let current = folders.find((f) => f.id === folderId);
    while (current) {
      if (current.id === ancestorId) return true;
      current = folders.find((f) => f.id === current?.parent_id);
    }
    return false;
  };

  const toggleExpanded = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleMove = () => {
    if (selectedFolderId !== currentParentId) {
      onMove(selectedFolderId);
    }
    onOpenChange(false);
  };

  const renderFolderTree = (parentId: string | null, depth: number = 0): React.ReactNode => {
    const children = getChildFolders(parentId);
    
    return children.map((folder) => {
      // Don't show the folder being moved or its descendants
      if (itemType === "folder" && (folder.id === itemId || isDescendantOf(folder.id, itemId))) {
        return null;
      }

      const hasChildren = getChildFolders(folder.id).some(
        (f) => itemType !== "folder" || (f.id !== itemId && !isDescendantOf(f.id, itemId))
      );
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;
      const isCurrent = currentParentId === folder.id;

      return (
        <div key={folder.id}>
          <div
            className={cn(
              "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
              isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted",
              isCurrent && "border border-dashed border-muted-foreground/40"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => setSelectedFolderId(folder.id)}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(folder.id);
                }}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <Folder className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm truncate flex-1">{folder.name}</span>
            {isCurrent && <span className="text-xs text-muted-foreground">(current)</span>}
          </div>
          {isExpanded && renderFolderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  const isRootSelected = selectedFolderId === null;
  const isRootCurrent = currentParentId === null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move {itemType === "folder" ? "Folder" : "Page"}</DialogTitle>
          <DialogDescription>
            Choose a new location for "{itemName}"
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[300px] border rounded-md p-2">
          {/* Root / Wiki Home */}
          <div
            className={cn(
              "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors mb-1",
              isRootSelected ? "bg-primary/10 text-primary" : "hover:bg-muted",
              isRootCurrent && "border border-dashed border-muted-foreground/40"
            )}
            onClick={() => setSelectedFolderId(null)}
          >
            <Home className={cn("h-4 w-4", isRootSelected ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-medium">Wiki Home (Root)</span>
            {isRootCurrent && <span className="text-xs text-muted-foreground">(current)</span>}
          </div>
          
          {/* Folder tree */}
          {renderFolderTree(null)}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={selectedFolderId === currentParentId || isMoving}
          >
            {isMoving ? "Moving..." : "Move Here"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
