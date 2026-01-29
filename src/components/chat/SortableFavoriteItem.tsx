import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableFavoriteItemProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const SortableFavoriteItem = ({ id, children, disabled }: SortableFavoriteItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-0.5 group/sortable",
        isDragging && "opacity-50 z-50 bg-background shadow-lg rounded-md"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "flex items-center justify-center w-4 h-6 cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-100 transition-opacity",
          isDragging && "opacity-100 cursor-grabbing",
          disabled && "cursor-not-allowed"
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
};

export default SortableFavoriteItem;
