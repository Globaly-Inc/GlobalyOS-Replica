import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { WorkflowKanbanCard, type WorkflowKanbanCardData } from "./WorkflowKanbanCard";
import type { WorkflowStage } from "@/types/workflow";
import { cn } from "@/lib/utils";

interface DraggableWorkflowCardProps {
  workflow: WorkflowKanbanCardData;
  stages: WorkflowStage[];
  onClick: () => void;
  disabled?: boolean;
}

export function DraggableWorkflowCard({
  workflow,
  stages,
  onClick,
  disabled,
}: DraggableWorkflowCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: workflow.id,
    disabled,
    data: { workflow, currentStageId: (workflow as any).current_stage_id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "opacity-50 z-50"
      )}
      {...attributes}
      {...listeners}
    >
      <WorkflowKanbanCard
        workflow={workflow}
        stages={stages}
        onClick={onClick}
      />
    </div>
  );
}
