import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import type { WorkflowStage } from "@/types/workflow";

interface StageProgressIndicatorProps {
  stages: WorkflowStage[];
  currentStageIndex: number;
  tasksByStage?: {
    stage: WorkflowStage;
    tasks: { id: string; status: string }[];
  }[];
}

export function StageProgressIndicator({ 
  stages, 
  currentStageIndex,
  tasksByStage 
}: StageProgressIndicatorProps) {
  if (stages.length === 0) return null;
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;
          
          const stageGroup = tasksByStage?.find(g => g.stage.id === stage.id);
          const completedTasks = stageGroup?.tasks.filter(t => t.status === 'completed').length ?? 0;
          const totalTasks = stageGroup?.tasks.length ?? 0;
          
          return (
            <div key={stage.id} className="flex flex-1 items-center">
              {/* Stage Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isCompleted && "bg-green-600 text-white",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                  style={isCurrent ? { backgroundColor: getStageColor(stage.color) } : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                
                <span className={cn(
                  "text-xs mt-2 text-center max-w-[80px] truncate",
                  isCurrent && "font-medium text-foreground",
                  !isCurrent && "text-muted-foreground"
                )}>
                  {stage.name}
                </span>
                
                {totalTasks > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {completedTasks}/{totalTasks}
                  </span>
                )}
              </div>
              
              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    index < currentStageIndex ? "bg-green-600" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getStageColor(color: string | null): string {
  const colors: Record<string, string> = {
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    red: '#ef4444',
    purple: '#a855f7',
  };
  return colors[color || 'blue'] || color || '#3b82f6';
}
