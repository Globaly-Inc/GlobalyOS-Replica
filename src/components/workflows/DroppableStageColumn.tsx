import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableStageColumnProps {
  id: string;
  children: React.ReactNode;
}

export function DroppableStageColumn({ id, children }: DroppableStageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 space-y-3 p-2 rounded-lg min-h-[200px] transition-colors",
        "bg-muted/30 border border-dashed",
        isOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/20"
      )}
    >
      {children}
    </div>
  );
}
