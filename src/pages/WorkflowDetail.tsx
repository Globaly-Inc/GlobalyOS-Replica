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
  Plus,
  Pencil,
  Trash2,
  Eye,
  CalendarIcon,
  User,
  Search
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  useEmployeeWorkflowTasks, 
  useUpdateWorkflowTask, 
  useWorkflowDetailRealtime, 
  useAddWorkflowTask,
  useEditWorkflowTask,
  useDeleteEmployeeWorkflowTask,
  useCompleteStage
} from "@/services/useWorkflows";
import { format, differenceInDays } from "date-fns";
import type { WorkflowType, WorkflowStatus, WorkflowTaskCategory } from "@/types/workflow";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AddWorkflowTaskDialog } from "@/components/workflows/AddWorkflowTaskDialog";
import { EditWorkflowTaskDialog } from "@/components/workflows/EditWorkflowTaskDialog";
import { CompleteStageDialog } from "@/components/workflows/CompleteStageDialog";
import { TaskDetailSheet } from "@/components/workflows/TaskDetailSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";

export default function WorkflowDetail() {
  const { orgCode, workflowId } = useParams<{ orgCode: string; workflowId: string }>();
  const navigate = useNavigate();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { orgCode: navOrgCode } = useOrgNavigation();
  
  // Add task dialog state
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedStageName, setSelectedStageName] = useState<string>("Other Tasks");
  
  // Edit task dialog state
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  
  // Delete task dialog state
  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Complete stage dialog state
  const [completeStageDialogOpen, setCompleteStageDialogOpen] = useState(false);
  const [stageToComplete, setStageToComplete] = useState<{ id: string; name: string; tasks: any[]; nextStageId: string | null } | null>(null);
  
  // Task detail sheet state
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<any>(null);
  
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
  
  // Get current employee ID for completing tasks
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee-for-workflow"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      return data;
    },
  });
  
  const updateTask = useUpdateWorkflowTask();
  const addTask = useAddWorkflowTask();
  const editTask = useEditWorkflowTask();
  const deleteTask = useDeleteEmployeeWorkflowTask();
  const completeStage = useCompleteStage();
  
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
    stageId: string;
  }) => {
    if (!workflow) return;

    addTask.mutate({
      workflowId: workflow.id,
      employeeId: workflow.employee_id,
      organizationId: workflow.organization_id,
      stageId: data.stageId,
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

  const handleOpenEditDialog = (task: any) => {
    setTaskToEdit(task);
    setEditTaskDialogOpen(true);
  };

  const handleEditTask = (data: {
    taskId: string;
    title: string;
    description?: string | null;
    category: WorkflowTaskCategory;
    assigneeId?: string | null;
    dueDate?: string | null;
    isRequired: boolean;
    stageId: string;
    workflowId?: string;
    employeeId?: string;
  }) => {
    editTask.mutate(data, {
      onSuccess: () => {
        setEditTaskDialogOpen(false);
        setTaskToEdit(null);
      }
    });
  };

  const handleOpenDeleteDialog = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteTaskDialogOpen(true);
  };

  const handleDeleteTask = () => {
    if (!taskToDelete) return;
    
    deleteTask.mutate(taskToDelete, {
      onSuccess: () => {
        setDeleteTaskDialogOpen(false);
        setTaskToDelete(null);
      }
    });
  };

  const handleOpenCompleteStageDialog = (stageId: string, stageName: string, stageTasks: any[], nextStageId: string | null) => {
    const pendingTasks = stageTasks.filter(t => t.status !== 'completed');
    
    setStageToComplete({ 
      id: stageId, 
      name: stageName, 
      tasks: pendingTasks,
      nextStageId,
    });
    setCompleteStageDialogOpen(true);
  };

  const handleCompleteStage = () => {
    if (!stageToComplete || !currentEmployee || !workflow) return;
    
    const pendingTaskIds = stageToComplete.tasks.map((t: any) => t.id);
    
    completeStage.mutate({
      workflowId: workflow.id,
      taskIds: pendingTaskIds,
      completedBy: currentEmployee.id,
      nextStageId: stageToComplete.nextStageId,
    }, {
      onSuccess: () => {
        setCompleteStageDialogOpen(false);
        setStageToComplete(null);
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
  
  // Calculate current stage using explicit current_stage_id
  const currentStageIndex = workflow.current_stage_id 
    ? tasksByStage.findIndex(group => group.stage.id === workflow.current_stage_id)
    : (workflow.status === 'completed' ? -1 : 0); // Default to first stage if not set, or -1 if completed
  
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
        const pendingTasks = stageTasks.filter(t => t.status !== 'completed');
        // Calculate next stage ID (null if this is the last stage)
        const nextStageId = index < tasksByStage.length - 1 ? tasksByStage[index + 1].stage.id : null;

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

                {/* Current Stage Badge */}
                {isCurrent && isActive && (
                  <Badge 
                    variant="default" 
                    className="bg-primary text-primary-foreground text-xs"
                  >
                    Current Stage
                  </Badge>
                )}
                
                <Badge 
                  variant={isCompleted ? "default" : "secondary"} 
                  className={cn(
                    "ml-auto",
                    isCompleted && "bg-green-600 hover:bg-green-600"
                  )}
                >
                  {stageCompletedCount}/{stageTasks.length}
                </Badge>

                {/* Complete Stage Button */}
                {isActive && !isCompleted && pendingTasks.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                    onClick={() => handleOpenCompleteStageDialog(stage.id, stage.name, stageTasks, nextStageId)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {nextStageId ? "Complete Stage" : "Complete Workflow"}
                  </Button>
                )}

                {/* Add Task Button */}
                {isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenAddTaskDialog(stage.id, stage.name)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                )}
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
                      onView={(task) => {
                        setSelectedTaskForDetail(task);
                        setTaskDetailOpen(true);
                      }}
                      onEdit={handleOpenEditDialog}
                      onDelete={handleOpenDeleteDialog}
                      disabled={!isActive}
                      organizationId={workflow.organization_id}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      
      
      {/* No stages fallback - show all tasks if no stages defined */}
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
                  onView={(task) => {
                    setSelectedTaskForDetail(task);
                    setTaskDetailOpen(true);
                  }}
                  onEdit={handleOpenEditDialog}
                  onDelete={handleOpenDeleteDialog}
                  disabled={!isActive}
                  organizationId={workflow.organization_id}
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
        templateId={workflow.template_id || undefined}
        stages={stages?.map(s => ({ id: s.id, name: s.name, color: s.color })) || []}
      />

      {/* Edit Task Dialog */}
      <EditWorkflowTaskDialog
        open={editTaskDialogOpen}
        onOpenChange={setEditTaskDialogOpen}
        onSubmit={handleEditTask}
        isLoading={editTask.isPending}
        organizationId={workflow.organization_id}
        workflowId={workflow.id}
        templateId={workflow.template_id || undefined}
        task={taskToEdit}
      />

      {/* Delete Task Confirmation */}
      <AlertDialog open={deleteTaskDialogOpen} onOpenChange={setDeleteTaskDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task will be permanently removed from this workflow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTask.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={deleteTask.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Stage Dialog */}
      {stageToComplete && (
        <CompleteStageDialog
          open={completeStageDialogOpen}
          onOpenChange={setCompleteStageDialogOpen}
          onConfirm={handleCompleteStage}
          stageName={stageToComplete.name}
          pendingTasks={stageToComplete.tasks}
          isLoading={completeStage.isPending}
          isFinalStage={!stageToComplete.nextStageId}
          nextStageName={
            stageToComplete.nextStageId
              ? tasksByStage.find(s => s.stage.id === stageToComplete.nextStageId)?.stage.name
              : undefined
          }
        />
      )}

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
        task={selectedTaskForDetail}
        organizationId={workflow.organization_id}
        workflowId={workflow.id}
        templateId={workflow.template_id || undefined}
        onTaskUpdate={() => {
          setTaskDetailOpen(false);
        }}
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
  onView,
  onEdit,
  onDelete,
  disabled,
  organizationId
}: { 
  task: any; 
  onToggle: (id: string, status: string) => void;
  onView: (task: any) => void;
  onEdit: (task: any) => void;
  onDelete: (taskId: string) => void;
  disabled?: boolean;
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const isCompleted = task.status === 'completed';

  // Fetch employees for assignee selection
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-inline-edit", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, profiles!inner(full_name, avatar_url)")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .order("created_at");

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Mutation for inline updates
  const updateTask = useMutation({
    mutationFn: async (updates: { assignee_id?: string | null; due_date?: string | null }) => {
      const { error } = await supabase
        .from("employee_workflow_tasks")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      toast.success("Task updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });

  const handleAssigneeChange = (newAssigneeId: string) => {
    updateTask.mutate({ 
      assignee_id: newAssigneeId === "__none__" ? null : newAssigneeId 
    });
  };

  const handleDueDateChange = (newDate: Date | undefined) => {
    updateTask.mutate({ 
      due_date: newDate ? newDate.toISOString() : null 
    });
  };

  const selectedEmployee = employees.find((e: any) => e.id === task.assignee_id);
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors group",
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

      {/* Inline Due Date Picker */}
      {!disabled ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs whitespace-nowrap gap-1",
                !task.due_date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {task.due_date ? format(new Date(task.due_date), 'd MMM yyyy') : "Set date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarPicker
              mode="single"
              selected={task.due_date ? new Date(task.due_date) : undefined}
              onSelect={handleDueDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : task.due_date ? (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {format(new Date(task.due_date), 'd MMM yyyy')}
        </span>
      ) : null}

      {/* Inline Assignee Selector */}
      {!disabled ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1"
            >
              {task.assignee ? (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.assignee.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.profiles?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{task.assignee.profiles?.full_name?.split(' ')[0]}</span>
                </>
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search team members..." />
              <CommandList>
                <CommandEmpty>No team members found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__unassigned__"
                    onSelect={() => handleAssigneeChange("__none__")}
                    className={cn(!task.assignee_id && "bg-muted")}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Unassigned</span>
                    </div>
                  </CommandItem>
                  {employees.map((emp: any) => (
                    <CommandItem
                      key={emp.id}
                      value={emp.profiles?.full_name}
                      onSelect={() => handleAssigneeChange(emp.id)}
                      className={cn(task.assignee_id === emp.id && "bg-muted")}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {emp.profiles?.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{emp.profiles?.full_name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : task.assignee ? (
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={task.assignee.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {task.assignee.profiles?.full_name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
      ) : null}
      
      {/* Inline action icons - always visible */}
      {!disabled && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => onView(task)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => onEdit(task)}
            title="Edit Task"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(task.id)}
            title="Delete Task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
