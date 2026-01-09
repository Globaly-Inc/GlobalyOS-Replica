import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useUpdateWorkflowTask } from "@/services/useWorkflows";
import type { EmployeeWorkflowTaskWithAssignee, WorkflowTaskCategory, WorkflowTaskStatus } from "@/types/workflow";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Laptop,
  GraduationCap,
  Key,
  MessageSquare,
  Package,
  BookOpen,
  MoreHorizontal,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowTaskListProps {
  tasks: EmployeeWorkflowTaskWithAssignee[];
  canEdit?: boolean;
}

const categoryIcons: Record<WorkflowTaskCategory, React.ElementType> = {
  documentation: FileText,
  equipment: Laptop,
  training: GraduationCap,
  access: Key,
  exit_interview: MessageSquare,
  asset_return: Package,
  knowledge_transfer: BookOpen,
  other: MoreHorizontal,
};

const categoryLabels: Record<WorkflowTaskCategory, string> = {
  documentation: "Documentation",
  equipment: "Equipment",
  training: "Training",
  access: "Access",
  exit_interview: "Exit Interview",
  asset_return: "Asset Return",
  knowledge_transfer: "Knowledge Transfer",
  other: "Other",
};

const statusConfig: Record<WorkflowTaskStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: Check },
  skipped: { label: "Skipped", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: MoreHorizontal },
};

export function WorkflowTaskList({ tasks, canEdit = false }: WorkflowTaskListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["documentation", "equipment", "access"]));
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState<string>("");
  
  const updateTask = useUpdateWorkflowTask();

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    const category = task.category as WorkflowTaskCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {} as Record<WorkflowTaskCategory, EmployeeWorkflowTaskWithAssignee[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleStatusChange = (taskId: string, newStatus: WorkflowTaskStatus) => {
    updateTask.mutate({ taskId, status: newStatus, notes: taskNotes || undefined });
    setEditingTaskId(null);
    setTaskNotes("");
  };

  const completedCount = tasks.filter((t) => t.status === "completed" || t.status === "skipped").length;
  const totalCount = tasks.length;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} tasks</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tasks by category */}
      <div className="space-y-2">
        {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
          const CategoryIcon = categoryIcons[category as WorkflowTaskCategory] || MoreHorizontal;
          const isExpanded = expandedCategories.has(category);
          const categoryCompleted = categoryTasks.filter((t) => t.status === "completed" || t.status === "skipped").length;

          return (
            <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium flex-1 text-left">
                  {categoryLabels[category as WorkflowTaskCategory] || category}
                </span>
                <Badge variant="outline" className="text-xs">
                  {categoryCompleted}/{categoryTasks.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-6 border-l pl-4 space-y-2 py-2">
                  {categoryTasks.map((task) => {
                    const StatusIcon = statusConfig[task.status].icon;
                    const isEditing = editingTaskId === task.id;
                    const isPastDue = task.due_date && new Date(task.due_date) < new Date() && task.status === "pending";

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          task.status === "completed" && "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30",
                          task.status === "skipped" && "bg-muted/30 opacity-60",
                          isPastDue && "border-destructive/50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {canEdit && task.status !== "completed" && task.status !== "skipped" && (
                            <Checkbox
                              checked={false}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleStatusChange(task.id, "completed");
                                }
                              }}
                              className="mt-1"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "font-medium",
                                (task.status === "completed" || task.status === "skipped") && "line-through text-muted-foreground"
                              )}>
                                {task.title}
                              </span>
                              {task.is_required && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {task.due_date && (
                                <span className={cn(isPastDue && "text-destructive")}>
                                  Due: {format(new Date(task.due_date), "MMM d")}
                                </span>
                              )}
                              {task.assignee && (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={task.assignee.profiles.avatar_url || undefined} />
                                    <AvatarFallback className="text-[8px]">
                                      {task.assignee.profiles.full_name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{task.assignee.profiles.full_name}</span>
                                </div>
                              )}
                              <Badge className={statusConfig[task.status].color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[task.status].label}
                              </Badge>
                            </div>
                            {task.notes && (
                              <p className="text-sm mt-2 p-2 rounded bg-muted/50">{task.notes}</p>
                            )}
                            {task.completed_by_employee && task.completed_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Completed by {task.completed_by_employee.profiles.full_name} on {format(new Date(task.completed_at), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                          {canEdit && task.status !== "completed" && task.status !== "skipped" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingTaskId(isEditing ? null : task.id);
                                setTaskNotes(task.notes || "");
                              }}
                            >
                              {isEditing ? "Cancel" : "Edit"}
                            </Button>
                          )}
                        </div>
                        {isEditing && (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              placeholder="Add notes..."
                              value={taskNotes}
                              onChange={(e) => setTaskNotes(e.target.value)}
                              className="min-h-[60px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(task.id, "completed")}
                              >
                                Complete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(task.id, "skipped")}
                              >
                                Skip
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
