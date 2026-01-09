import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, User, ArrowRight } from "lucide-react";
import { useMyWorkflowTasks, useCompleteWorkflowTask } from "@/services/useWorkflows";
import { OrgLink } from "@/components/OrgLink";
import { formatDistanceToNow } from "date-fns";

interface MyWorkflowTasksProps {
  employeeId: string;
}

export function MyWorkflowTasks({ employeeId }: MyWorkflowTasksProps) {
  const { data: tasks, isLoading } = useMyWorkflowTasks(employeeId);
  const completeTask = useCompleteWorkflowTask();

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

  const handleComplete = (taskId: string) => {
    completeTask.mutate({ taskId, completedBy: employeeId });
  };

  return (
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
        {pendingTasks.slice(0, 5).map((task) => {
          const workflow = task.workflow as any;
          const employee = workflow?.employee as any;
          const isOnboarding = workflow?.type === 'onboarding';
          
          return (
            <div 
              key={task.id} 
              className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{task.title}</span>
                  {task.is_required && (
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Required</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={isOnboarding ? "default" : "secondary"} className="text-xs">
                    {isOnboarding ? 'Onboarding' : 'Offboarding'}
                  </Badge>
                  {employee && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <OrgLink to={`/team/${employee.id}`} className="hover:underline">
                        {employee.profiles?.full_name}
                      </OrgLink>
                    </div>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleComplete(task.id)}
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
  );
}
