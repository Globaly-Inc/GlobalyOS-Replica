import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/PageHeader";
import { 
  ArrowLeft, 
  UserPlus, 
  UserMinus, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Circle,
  Plus
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeWorkflowTasks, useUpdateWorkflowTask, useWorkflowDetailRealtime, useAddWorkflowTask } from "@/services/useWorkflows";
import { format, differenceInDays } from "date-fns";
import type { WorkflowType, WorkflowStatus, WorkflowTaskCategory } from "@/types/workflow";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AddWorkflowTaskDialog } from "@/components/workflows/AddWorkflowTaskDialog";

export default function WorkflowDetail() {
  const { orgCode, workflowId } = useParams<{ orgCode: string; workflowId: string }>();
  const navigate = useNavigate();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { orgCode: navOrgCode } = useOrgNavigation();
  
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedStageName, setSelectedStageName] = useState<string>("Other Tasks");
  
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
  const addTask = useAddWorkflowTask();
  
  const handleTaskToggle = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({ taskId, status: newStatus as any });
  };

  const handleOpenAddTaskDialog = (stageId: string | null, stageName: string) => {
    setSelectedStageId(stageId);
    setSelectedStageName(stageName);
    setAddTaskDialogOpen(true);
  };

  const handleAddTask = (data: {
    title: string;
    description?: string;
    category: WorkflowTaskCategory;
    assigneeId?: string;
    dueDate?: string;
    isRequired: boolean;
  }) => {
    if (!workflow) return;

    addTask.mutate({
      workflowId: workflow.id,
      employeeId: workflow.employee_id,
      organizationId: workflow.organization_id,
      stageId: selectedStageId,
      title: data.title,
      description: data.description,
      category: data.category,
      assigneeId: data.assigneeId === "__none__" ? undefined : data.assigneeId,
      dueDate: data.dueDate,
      isRequired: data.isRequired,
    }, {
      onSuccess: () => {
        setAddTaskDialogOpen(false);
      }
    });
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
  
  // Calculate current stage - first stage with incomplete tasks
  const currentStageIndex = tasksByStage.findIndex(group => 
    group.tasks.some(t => t.status !== 'completed')
  );
  
  // Get employee info safely
  const employeeProfiles = (workflow.employee as any)?.profiles;
  const employeeName = employeeProfiles?.full_name || 'Unknown';
  const employeeAvatar = employeeProfiles?.avatar_url;
  const employeePosition = (workflow.employee as any)?.position;

  const isActive = workflow.status === 'active';
  
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
      <Card className="border-l-4" style={{ borderLeftColor: workflow.type === 'onboarding' ? '#3b82f6' : '#f97316' }}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-md">
              <AvatarImage src={employeeAvatar || undefined} />
              <AvatarFallback className="text-lg bg-primary/10">
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
              
              <div className="flex items-center gap-4 mt-3 flex-wrap">
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
                  <span className={`text-sm ${daysRemaining <= 3 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
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
            <Progress 
              value={progressPercent} 
              className={cn(
                "h-2",
                progressPercent === 100 && "[&>div]:bg-green-500"
              )} 
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Tasks by Stage */}
      {tasksByStage.map(({ stage, tasks: stageTasks }, index) => {
        const stageCompletedCount = stageTasks.filter(t => t.status === 'completed').length;
        const isCompleted = stageTasks.length > 0 && stageCompletedCount === stageTasks.length;
        const isCurrent = index === currentStageIndex || (currentStageIndex === -1 && index === 0);
        const isPending = !isCompleted && !isCurrent;

        return (
          <Card 
            key={stage.id}
            className={cn(
              "transition-all duration-200 border-l-4",
              isCompleted && "border-l-green-500 bg-green-50/30 dark:bg-green-950/10",
              isCurrent && "border-l-primary bg-primary/5 shadow-md",
              isPending && "border-l-muted-foreground/30"
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                {/* Stage status icon */}
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : isCurrent ? (
                  <div className="h-5 w-5 rounded-full border-2 border-primary bg-primary/20 flex-shrink-0 animate-pulse" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                )}
                
                <span className={cn(
                  isCompleted && "text-green-700 dark:text-green-400",
                  isPending && "text-muted-foreground"
                )}>
                  {stage.name}
                </span>
                
                <Badge 
                  variant={isCompleted ? "default" : "secondary"} 
                  className={cn(
                    "ml-auto",
                    isCompleted && "bg-green-600 hover:bg-green-600"
                  )}
                >
                  {stageCompletedCount}/{stageTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stageTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-3">No tasks in this stage</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {stageTasks.map((task) => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={handleTaskToggle}
                      disabled={!isActive}
                    />
                  ))}
                </div>
              )}
              
              {/* Add Task Button */}
              {isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground border border-dashed hover:border-primary/50"
                  onClick={() => handleOpenAddTaskDialog(stage.id, stage.name)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
      
      {/* Unstaged Tasks */}
      {(unstagedTasks.length > 0 || (stages && stages.length > 0 && isActive)) && (
        <Card className="border-l-4 border-l-muted-foreground/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <Circle className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
              <span className="text-muted-foreground">Other Tasks</span>
              <Badge variant="secondary" className="ml-auto">
                {unstagedTasks.filter(t => t.status === 'completed').length}/{unstagedTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unstagedTasks.length > 0 && (
              <div className="space-y-2 mb-3">
                {unstagedTasks.map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={handleTaskToggle}
                    disabled={!isActive}
                  />
                ))}
              </div>
            )}
            
            {/* Add Task Button */}
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground border border-dashed hover:border-primary/50"
                onClick={() => handleOpenAddTaskDialog(null, "Other Tasks")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            )}
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
            <div className="space-y-2 mb-3">
              {tasks.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onToggle={handleTaskToggle}
                  disabled={!isActive}
                />
              ))}
            </div>
            
            {/* Add Task Button */}
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground border border-dashed hover:border-primary/50"
                onClick={() => handleOpenAddTaskDialog(null, "Tasks")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* No tasks at all - show empty state with add button */}
      {(!tasks || tasks.length === 0) && (!stages || stages.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No tasks in this workflow yet</p>
            {isActive && (
              <Button
                variant="outline"
                onClick={() => handleOpenAddTaskDialog(null, "Tasks")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Task Dialog */}
      <AddWorkflowTaskDialog
        open={addTaskDialogOpen}
        onOpenChange={setAddTaskDialogOpen}
        onSubmit={handleAddTask}
        isLoading={addTask.isPending}
        stageId={selectedStageId}
        stageName={selectedStageName}
        organizationId={workflow.organization_id}
      />
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
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
      isCompleted ? "bg-muted/50 border-muted" : "bg-background hover:bg-muted/30"
    )}>
      <Checkbox 
        checked={isCompleted}
        onCheckedChange={() => onToggle(task.id, task.status)}
        disabled={disabled}
        className={cn(
          isCompleted && "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {task.description}
          </p>
        )}
      </div>
      {task.due_date && (
        <span className={cn(
          "text-xs whitespace-nowrap",
          isCompleted ? "text-muted-foreground" : "text-muted-foreground"
        )}>
          Due: {format(new Date(task.due_date), 'MMM d')}
        </span>
      )}
      {task.assignee && (
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={task.assignee.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {task.assignee.profiles?.full_name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
