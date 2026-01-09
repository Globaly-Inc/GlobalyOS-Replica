import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, UserPlus, UserMinus, Clock, CheckCircle2, Calendar, GitBranch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeWorkflowTasks, useUpdateWorkflowTask, useWorkflowDetailRealtime } from "@/services/useWorkflows";
import { format, differenceInDays } from "date-fns";
import type { WorkflowType, WorkflowStatus } from "@/types/workflow";
import { StageProgressIndicator } from "@/components/workflows/StageProgressIndicator";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkflowDetail() {
  const { orgCode, workflowId } = useParams<{ orgCode: string; workflowId: string }>();
  const navigate = useNavigate();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { orgCode: navOrgCode } = useOrgNavigation();
  
  // Enable realtime updates
  useWorkflowDetailRealtime(workflowId);
  
  // Fetch workflow details with proper FK hint
  const { data: workflow, isLoading: workflowLoading } = useQuery({
    queryKey: ["workflow-detail", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      
      const { data, error } = await supabase
        .from("employee_workflows")
        .select(`
          *,
          employee:employees!employee_workflows_employee_id_fkey(
            id,
            position,
            profiles!inner(full_name, avatar_url)
          ),
          template:workflow_templates(name)
        `)
        .eq("id", workflowId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!workflowId,
  });
  
  // Fetch workflow tasks
  const { data: tasks } = useEmployeeWorkflowTasks(workflowId);
  
  // Fetch stages for this workflow's template
  const { data: stages } = useQuery({
    queryKey: ["workflow-stages", workflow?.template_id],
    queryFn: async () => {
      if (!workflow?.template_id) return [];
      
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("template_id", workflow.template_id)
        .order("sort_order");
      
      if (error) throw error;
      return data;
    },
    enabled: !!workflow?.template_id,
  });
  
  const updateTask = useUpdateWorkflowTask();
  
  const handleTaskToggle = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({ taskId, status: newStatus as any });
  };
  
  // Loading state
  if (roleLoading || workflowLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <PageHeader title="Workflow Details" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  // Only admin/HR can access
  if (!isOwner && !isAdmin && !isHR) {
    return <Navigate to={`/org/${navOrgCode}`} replace />;
  }
  
  if (!workflow) {
    return (
      <div className="space-y-4 md:space-y-6">
        <PageHeader title="Workflow Details" />
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Workflow not found</h2>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(`/org/${orgCode}/workflows`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }
  
  const completedTasks = tasks?.filter(t => t.status === 'completed').length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const daysRemaining = workflow.status === 'active' 
    ? differenceInDays(new Date(workflow.target_date), new Date())
    : null;
  
  const TypeIcon = workflow.type === 'onboarding' ? UserPlus : UserMinus;
  const typeColor = workflow.type === 'onboarding' ? 'text-blue-600' : 'text-orange-600';
  
  // Group tasks by stage
  const tasksByStage = stages?.map(stage => ({
    stage,
    tasks: tasks?.filter(t => t.stage_id === stage.id) ?? [],
  })) ?? [];
  
  // Tasks without a stage
  const unstagedTasks = tasks?.filter(t => !t.stage_id) ?? [];
  
  // Calculate current stage
  const currentStageIndex = tasksByStage.findIndex(group => 
    group.tasks.some(t => t.status !== 'completed')
  );
  
  // Get employee info safely
  const employeeProfiles = (workflow.employee as any)?.profiles;
  const employeeName = employeeProfiles?.full_name || 'Unknown';
  const employeeAvatar = employeeProfiles?.avatar_url;
  const employeePosition = (workflow.employee as any)?.position;
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Back button */}
      <Button 
        variant="ghost" 
        className="w-fit"
        onClick={() => navigate(`/org/${orgCode}/workflows`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Workflows
      </Button>
      
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employeeAvatar || undefined} />
              <AvatarFallback className="text-lg">
                {employeeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {employeeName}
                </h1>
                <StatusBadge status={workflow.status as WorkflowStatus} />
              </div>
              
              <p className="text-muted-foreground">
                {employeePosition || 'No position'}
              </p>
              
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="outline" className={`gap-1 ${typeColor}`}>
                  <TypeIcon className="h-3 w-3" />
                  {workflow.type === 'onboarding' ? 'Onboarding' : 'Offboarding'}
                </Badge>
                
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {workflow.type === 'onboarding' ? 'Started' : 'Last Day'}:{' '}
                  {format(new Date(workflow.target_date), 'MMM d, yyyy')}
                </span>
                
                {daysRemaining !== null && workflow.status === 'active' && (
                  <span className={`text-sm ${daysRemaining <= 3 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : 
                     daysRemaining === 0 ? 'Due today' : 
                     `${Math.abs(daysRemaining)} days overdue`}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedTasks}/{totalTasks} tasks ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          
          {/* Stage Progress */}
          {stages && stages.length > 0 && (
            <div className="mt-6">
              <StageProgressIndicator 
                stages={stages} 
                currentStageIndex={currentStageIndex >= 0 ? currentStageIndex : stages.length}
                tasksByStage={tasksByStage}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tasks by Stage */}
      {tasksByStage.map(({ stage, tasks: stageTasks }) => (
        <Card key={stage.id}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div 
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getStageColor(stage.color) }}
              />
              {stage.name}
              <Badge variant="secondary" className="ml-2">
                {stageTasks.filter(t => t.status === 'completed').length}/{stageTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks in this stage</p>
            ) : (
              <div className="space-y-2">
                {stageTasks.map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={handleTaskToggle}
                    disabled={workflow.status !== 'active'}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {/* Unstaged Tasks */}
      {unstagedTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Other Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unstagedTasks.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onToggle={handleTaskToggle}
                  disabled={workflow.status !== 'active'}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* No stages - show all tasks */}
      {(!stages || stages.length === 0) && tasks && tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onToggle={handleTaskToggle}
                  disabled={workflow.status !== 'active'}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
          <Clock className="h-3 w-3" />
          Active
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-green-600 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="secondary" className="gap-1">
          Cancelled
        </Badge>
      );
  }
}

function TaskItem({ 
  task, 
  onToggle, 
  disabled 
}: { 
  task: any; 
  onToggle: (id: string, status: string) => void;
  disabled?: boolean;
}) {
  const isCompleted = task.status === 'completed';
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${isCompleted ? 'bg-muted/50' : 'bg-background'}`}>
      <Checkbox 
        checked={isCompleted}
        onCheckedChange={() => onToggle(task.id, task.status)}
        disabled={disabled}
      />
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {task.description}
          </p>
        )}
      </div>
      {task.due_date && (
        <span className="text-xs text-muted-foreground">
          Due: {format(new Date(task.due_date), 'MMM d')}
        </span>
      )}
      {task.assignee && (
        <Avatar className="h-6 w-6">
          <AvatarImage src={task.assignee.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {task.assignee.profiles?.full_name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}
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
  return colors[color || 'blue'] || color || '#6b7280';
}
