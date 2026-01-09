import { useWorkflowActivityLogs } from "@/services/useWorkflowActivityLogs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  ArrowRight,
  CheckCircle2,
  Check,
  RotateCcw,
  UserPlus,
  Plus,
  Trash2,
  Pencil,
  Zap,
  History,
  MessageSquare,
  ListPlus,
  CheckSquare,
  Square,
  ListMinus,
  Paperclip,
  FileX,
  Slash,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { WorkflowActivityType } from "@/types/workflow";

const activityConfig: Record<
  WorkflowActivityType,
  { icon: React.ElementType; color: string; label: string }
> = {
  workflow_started: { icon: Play, color: "text-green-600", label: "Workflow Started" },
  stage_changed: { icon: ArrowRight, color: "text-blue-600", label: "Stage Changed" },
  workflow_completed: { icon: CheckCircle2, color: "text-green-600", label: "Workflow Completed" },
  task_completed: { icon: Check, color: "text-green-600", label: "Task Completed" },
  task_uncompleted: { icon: RotateCcw, color: "text-orange-600", label: "Task Reopened" },
  task_assigned: { icon: UserPlus, color: "text-teal-600", label: "Task Assigned" },
  task_added: { icon: Plus, color: "text-green-600", label: "Task Added" },
  task_deleted: { icon: Trash2, color: "text-red-600", label: "Task Deleted" },
  task_updated: { icon: Pencil, color: "text-blue-600", label: "Task Updated" },
  task_skipped: { icon: Slash, color: "text-amber-600", label: "Task Skipped" },
  auto_advanced: { icon: Zap, color: "text-purple-600", label: "Auto Advanced" },
  comment_added: { icon: MessageSquare, color: "text-blue-600", label: "Comment Added" },
  checklist_added: { icon: ListPlus, color: "text-green-600", label: "Checklist Added" },
  checklist_completed: { icon: CheckSquare, color: "text-green-600", label: "Checklist Completed" },
  checklist_uncompleted: { icon: Square, color: "text-orange-600", label: "Checklist Reopened" },
  checklist_deleted: { icon: ListMinus, color: "text-red-600", label: "Checklist Deleted" },
  attachment_added: { icon: Paperclip, color: "text-blue-600", label: "Attachment Added" },
  attachment_deleted: { icon: FileX, color: "text-red-600", label: "Attachment Deleted" },
};

interface WorkflowActivityLogProps {
  workflowId: string | undefined;
}

export function WorkflowActivityLog({ workflowId }: WorkflowActivityLogProps) {
  const { data: logs, isLoading } = useWorkflowActivityLogs(workflowId);

  if (!workflowId) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Activity Log
          </span>
          {logs && logs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {logs.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity recorded yet.
          </p>
        ) : (
          <ScrollArea className="max-h-80 pr-4">
            <div className="space-y-4">
              {logs.map((log) => {
                const config = activityConfig[log.action_type as WorkflowActivityType] || {
                  icon: History,
                  color: "text-muted-foreground",
                  label: log.action_type,
                };
                const Icon = config.icon;
                const employeeProfile = (log.employee as any)?.profiles;

                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 border flex-shrink-0">
                      {employeeProfile?.avatar_url ? (
                        <AvatarImage src={employeeProfile.avatar_url} />
                      ) : null}
                      <AvatarFallback className="text-xs bg-muted">
                        {employeeProfile?.full_name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2) || "SY"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {employeeProfile?.full_name || "System"}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-xs gap-1 py-0", config.color)}
                        >
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>

                      {log.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {log.description}
                        </p>
                      )}

                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
