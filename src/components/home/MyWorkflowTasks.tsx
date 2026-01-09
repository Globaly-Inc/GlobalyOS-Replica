import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, User, ArrowRight } from "lucide-react";
import { useMyWorkflowTasks, useCompleteWorkflowTask } from "@/services/useWorkflows";
import { OrgLink } from "@/components/OrgLink";
import { format } from "date-fns";
import { TaskDetailSheet } from "@/components/workflows/TaskDetailSheet";
import { useOrganization } from "@/hooks/useOrganization";
import { useQueryClient } from "@tanstack/react-query";

interface MyWorkflowTasksProps {
  employeeId: string;
}

interface TaskData {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  assignee_id?: string | null;
  due_date?: string | null;
  is_required?: boolean;
  status: string;
  notes?: string | null;
  stage_id: string;
  workflow_id?: string;
}

export function MyWorkflowTasks({ employeeId }: MyWorkflowTasksProps) {
  const { data: tasks, isLoading } = useMyWorkflowTasks(employeeId);
  const completeTask = useCompleteWorkflowTask();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const pendingTasks = tasks?.filter((t: any) => t.status === 'pending' || t.status === 'in_progress') || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            My Workflow Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (pendingTasks.length === 0) {
    return null; // Don't show card if no tasks
  }

  const handleComplete = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    completeTask.mutate({ taskId, completedBy: employeeId });
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      assignee_id: task.assignee_id,
      due_date: task.due_date,
      is_required: task.is_required,
      status: task.status,
      notes: task.notes,
      stage_id: task.stage_id,
      workflow_id: task.workflow_id,
    });
    setIsSheetOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              My Workflow Tasks
              <Badge variant="secondary" className="text-xs">{pendingTasks.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingTasks.slice(0, 5).map((task: any) => {
            const workflow = task.workflow as any;
            const employee = workflow?.employee as any;
            const isOnboarding = workflow?.type === 'onboarding';
            
            return (
              <div 
                key={task.id} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {getStatusBadge(task.status)}
                    <Badge variant={isOnboarding ? "default" : "secondary"} className="text-xs">
                      {isOnboarding ? 'Onboarding' : 'Offboarding'}
                    </Badge>
                    {employee && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <OrgLink 
                          to={`/team/${employee.id}`} 
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {employee.profiles?.full_name}
                        </OrgLink>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.due_date), 'd MMM yyyy')}
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => handleComplete(e, task.id)}
                  disabled={completeTask.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Done
                </Button>
              </div>
            );
          })}
          
          {pendingTasks.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="ghost" size="sm" className="text-primary">
                View all {pendingTasks.length} tasks
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDetailSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        task={selectedTask}
        organizationId={currentOrg?.id || ""}
        workflowId={selectedTask?.workflow_id}
        onTaskUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ["my-workflow-tasks"] });
        }}
      />
    </>
  );
}
