import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Clock, AlertCircle } from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { MiniStageIndicator } from "./MiniStageIndicator";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { WorkflowStage } from "@/types/workflow";

export interface WorkflowKanbanCardData {
  id: string;
  type: string;
  status: string;
  target_date: string;
  current_stage_id?: string | null;
  employee: {
    id: string;
    position: string | null;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  tasks: {
    id: string;
    status: string;
    stage_id: string | null;
  }[];
}

interface WorkflowKanbanCardProps {
  workflow: WorkflowKanbanCardData;
  stages?: WorkflowStage[];
  onClick?: () => void;
}

export function WorkflowKanbanCard({ workflow, stages, onClick }: WorkflowKanbanCardProps) {
  const { isOnline } = useOnlineStatus(workflow.employee?.id);
  const completedTasks = workflow.tasks?.filter(t => t.status === "completed").length ?? 0;
  const totalTasks = workflow.tasks?.length ?? 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const daysRemaining = differenceInDays(new Date(workflow.target_date), new Date());
  const isOverdue = daysRemaining < 0;
  const isDueToday = daysRemaining === 0;
  const isUrgent = daysRemaining <= 3 && daysRemaining >= 0;

  const getDaysText = () => {
    if (isOverdue) return `${Math.abs(daysRemaining)}d overdue`;
    if (isDueToday) return "Due today";
    return `${daysRemaining}d left`;
  };

  const initials = workflow.employee?.profiles?.full_name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2) || "?";

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer hover:shadow-md transition-all hover:border-primary/50",
        isOverdue && "border-destructive/50 bg-destructive/5",
        isDueToday && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
      )}
      onClick={onClick}
    >
      {/* Employee Info */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={workflow.employee?.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">
            {workflow.employee?.profiles?.full_name}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {workflow.employee?.position || "No position"}
          </p>
        </div>
      </div>

      {/* Stage Progress Indicator */}
      {stages && stages.length > 0 && (
        <div className="mt-2.5">
          <MiniStageIndicator
            stages={stages}
            currentStageId={workflow.current_stage_id || null}
            isCompleted={workflow.status === "completed"}
          />
        </div>
      )}

      {/* Progress */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{completedTasks}/{totalTasks} tasks</span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Due Date Badge */}
      <div className="mt-3 flex items-center justify-between">
        <Badge
          variant={isOverdue ? "destructive" : isDueToday || isUrgent ? "secondary" : "outline"}
          className={cn(
            "text-xs gap-1",
            isDueToday && "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
            isUrgent && !isDueToday && "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20"
          )}
        >
          {isOverdue ? (
            <AlertCircle className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          {getDaysText()}
        </Badge>

        {progressPercent === 100 && (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Ready
          </Badge>
        )}
      </div>
    </Card>
  );
}
