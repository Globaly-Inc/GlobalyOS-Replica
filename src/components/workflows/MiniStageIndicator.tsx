import { cn } from "@/lib/utils";
import type { WorkflowStage } from "@/types/workflow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MiniStageIndicatorProps {
  stages: WorkflowStage[];
  currentStageId: string | null;
  isCompleted?: boolean;
}

export function MiniStageIndicator({
  stages,
  currentStageId,
  isCompleted,
}: MiniStageIndicatorProps) {
  if (!stages?.length) return null;

  const currentIndex = isCompleted
    ? stages.length
    : stages.findIndex((s) => s.id === currentStageId);
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          {stages.map((stage, index) => {
            const isComplete = index < effectiveIndex || isCompleted;
            const isCurrent = index === effectiveIndex && !isCompleted;

            return (
              <Tooltip key={stage.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      isComplete && "bg-green-500",
                      isCurrent && "animate-pulse",
                      !isComplete && !isCurrent && "bg-muted-foreground/30"
                    )}
                    style={{
                      backgroundColor: isCurrent
                        ? stage.color || "#3b82f6"
                        : undefined,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{stage.name}</p>
                  <p className="text-muted-foreground">
                    {isComplete
                      ? "Completed"
                      : isCurrent
                      ? "Current stage"
                      : "Upcoming"}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {isCompleted
            ? "Done"
            : `Stage ${effectiveIndex + 1}/${stages.length}`}
        </span>
      </div>
    </TooltipProvider>
  );
}
