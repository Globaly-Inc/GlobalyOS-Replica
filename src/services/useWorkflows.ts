/**
 * React Query hooks for workflow management
 * 
 * Terminology:
 * - Workflow: A business process (stored in workflow_templates table)
 * - Application: An instance of a Workflow for a person (stored in employee_workflows table)
 * 
 * Legacy hooks (useWorkflowTemplates, useEmployeeWorkflows, etc.) are preserved for backward compatibility.
 * New code should use the new naming convention:
 * - useWorkflows (was useWorkflowTemplates)
 * - useApplications (was useEmployeeWorkflows)
 * - useApplicationTasks (was useEmployeeWorkflowTasks)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import type {
  Workflow,
  WorkflowTask,
  Application,
  ApplicationTaskWithAssignee,
  ExitInterview,
  AssetHandover,
  KnowledgeTransferWithRecipient,
  WorkflowTaskStatus,
  AssetStatus,
  KnowledgeTransferStatus,
  WorkflowStatus,
  WorkflowType,
  WorkflowStage,
  WorkflowTrigger,
  // Legacy type aliases for backward compatibility
  WorkflowTemplate,
  WorkflowTemplateTask,
  EmployeeWorkflow,
  EmployeeWorkflowTaskWithAssignee,
} from "@/types/workflow";

// Re-export realtime hooks
export { useWorkflowRealtime, useWorkflowDetailRealtime } from "./useWorkflowRealtime";

// Fetch all organization workflows with employee details
export const useAllWorkflows = (filters?: {
  status?: WorkflowStatus | 'all';
  type?: WorkflowType | 'all';
  search?: string;
}) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["all-workflows", currentOrg?.id, filters],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      let query = supabase
        .from("employee_workflows")
        .select(`
          *,
          employee:employees!employee_workflows_employee_id_fkey(
            id,
            position,
            profiles!inner(full_name, avatar_url)
          ),
          template:workflow_templates(name),
          tasks:employee_workflow_tasks(id, status, stage_id)
        `)
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      
      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      
      // Apply type filter
      if (filters?.type && filters.type !== 'all') {
        query = query.eq("type", filters.type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by search (employee name) client-side
      let results = data || [];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter((w: any) => 
          w.employee?.profiles?.full_name?.toLowerCase().includes(searchLower)
        );
      }
      
      return results;
    },
    enabled: !!currentOrg?.id,
  });
};

// Workflow Stages
export const useWorkflowStages = (templateId?: string) => {
  return useQuery({
    queryKey: ["workflow-stages", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      
      if (error) throw error;
      return data as WorkflowStage[];
    },
    enabled: !!templateId,
  });
};

// Workflow Triggers
export const useWorkflowTriggers = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["workflow-triggers", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      const { data, error } = await supabase
        .from("workflow_triggers")
        .select("*")
        .eq("organization_id", currentOrg.id);
      
      if (error) throw error;
      return data as WorkflowTrigger[];
    },
    enabled: !!currentOrg?.id,
  });
};

// ============ Workflows (stored in workflow_templates table) ============

/**
 * Fetch all workflows for the current organization
 * @param type - Optional filter by workflow type (onboarding, offboarding)
 */
export const useWorkflows = (type?: 'onboarding' | 'offboarding') => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["workflow-templates", currentOrg?.id, type],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      let query = supabase
        .from("workflow_templates")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      
      if (type) {
        query = query.eq("type", type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Workflow[];
    },
    enabled: !!currentOrg?.id,
  });
};

/** @deprecated Use useWorkflows instead */
export const useWorkflowTemplates = useWorkflows;

/**
 * Fetch tasks for a workflow definition
 */
export const useWorkflowTasks = (templateId: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-template-tasks", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from("workflow_template_tasks")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      
      if (error) throw error;
      return data as WorkflowTask[];
    },
    enabled: !!templateId,
  });
};

/** @deprecated Use useWorkflowTasks instead */
export const useWorkflowTemplateTasks = useWorkflowTasks;

// ============ Applications (stored in employee_workflows table) ============

/**
 * Fetch applications for a specific employee
 */
export const useApplications = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ["employee-workflows", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from("employee_workflows")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Application[];
    },
    enabled: !!employeeId,
  });
};

/** @deprecated Use useApplications instead */
export const useEmployeeWorkflows = useApplications;

/**
 * Fetch tasks for an application instance
 */
export const useApplicationTasks = (workflowId: string | undefined, includeArchived = false) => {
  return useQuery({
    queryKey: ["employee-workflow-tasks", workflowId, includeArchived],
    queryFn: async () => {
      if (!workflowId) return [];
      
      let query = supabase
        .from("employee_workflow_tasks")
        .select(`
          *,
          assignee:employees!employee_workflow_tasks_assignee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          ),
          completed_by_employee:employees!employee_workflow_tasks_completed_by_fkey(
            profiles!inner(full_name)
          )
        `)
        .eq("workflow_id", workflowId)
        .order("sort_order");
      
      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ApplicationTaskWithAssignee[];
    },
    enabled: !!workflowId,
  });
};

/** @deprecated Use useApplicationTasks instead */
export const useEmployeeWorkflowTasks = useApplicationTasks;

// Archive/Unarchive a workflow task
export const useArchiveWorkflowTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, isArchived }: { taskId: string; isArchived: boolean }) => {
      const { error } = await supabase
        .from("employee_workflow_tasks")
        .update({ is_archived: isArchived })
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      queryClient.invalidateQueries({ queryKey: ["my-workflow-tasks"] });
      toast.success(variables.isArchived ? "Task archived" : "Task unarchived");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to update task", {
        componentName: "useArchiveWorkflowTask",
        actionAttempted: "Archive/unarchive workflow task",
        errorType: "database",
      });
    },
  });
};

export const useMyWorkflowTasks = (employeeId?: string) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["my-workflow-tasks", currentOrg?.id, employeeId],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      // Use provided employeeId or get current user's employee ID
      let targetEmployeeId = employeeId;
      
      if (!targetEmployeeId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .eq("organization_id", currentOrg.id)
          .single();
        
        if (!employee) return [];
        targetEmployeeId = employee.id;
      }
      
      const { data, error } = await supabase
        .from("employee_workflow_tasks")
        .select(`
          *,
          stage:workflow_stages!inner(id, name, color),
          workflow:employee_workflows!inner(
            id, type, target_date,
            employee:employees!employee_workflows_employee_id_fkey!inner(
              id,
              profiles!inner(full_name, avatar_url)
            )
          )
        `)
        .eq("assignee_id", targetEmployeeId)
        .eq("organization_id", currentOrg.id)
        .in("status", ["pending", "in_progress"])
        .order("due_date");
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });
};

// Complete a workflow task
export const useCompleteWorkflowTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      completedBy,
      notes,
    }: {
      taskId: string;
      completedBy: string;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = { 
        status: 'completed',
        completed_by: completedBy,
        completed_at: new Date().toISOString(),
      };
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      const { error } = await supabase
        .from("employee_workflow_tasks")
        .update(updateData)
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-workflow-tasks"] });
      toast.success("Task completed");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to complete task", {
        componentName: "useCompleteWorkflowTask",
        actionAttempted: "Complete workflow task",
        errorType: "database",
      });
    },
  });
};

// Delete a workflow template task
export const useDeleteWorkflowTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("workflow_template_tasks")
        .delete()
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-template-tasks"] });
      toast.success("Task deleted");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to delete task", {
        componentName: "useDeleteWorkflowTask",
        actionAttempted: "Delete workflow template task",
        errorType: "database",
      });
    },
  });
};

// Update workflow template task
export const useUpdateWorkflowTemplateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<WorkflowTemplateTask>;
    }) => {
      const { error } = await supabase
        .from("workflow_template_tasks")
        .update(updates)
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-template-tasks"] });
      toast.success("Task updated");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to update task", {
        componentName: "useUpdateWorkflowTemplateTask",
        actionAttempted: "Update workflow template task",
        errorType: "database",
      });
    },
  });
};

// Update workflow task with optional auto-advance
export const useUpdateWorkflowTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
      notes,
    }: {
      taskId: string;
      status: WorkflowTaskStatus;
      notes?: string;
    }) => {
      // Get current user's employee ID for completed_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: employee } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .single();
      
      if (!employee) throw new Error("Employee not found");
      
      const updateData: Record<string, unknown> = { status };
      
      if (status === "completed") {
        updateData.completed_by = employee.id;
        updateData.completed_at = new Date().toISOString();
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      const { error } = await supabase
        .from("employee_workflow_tasks")
        .update(updateData)
        .eq("id", taskId);
      
      if (error) throw error;

      // Check for auto-advance if task was completed
      if (status === "completed") {
        // Get task details including workflow and stage
        const { data: task } = await supabase
          .from("employee_workflow_tasks")
          .select("workflow_id, stage_id")
          .eq("id", taskId)
          .single();

        if (task?.workflow_id && task?.stage_id) {
          // Get workflow with template auto_advance_stages setting
          const { data: workflow } = await supabase
            .from("employee_workflows")
            .select(`
              id,
              current_stage_id,
              template_id,
              template:workflow_templates(auto_advance_stages)
            `)
            .eq("id", task.workflow_id)
            .single();

          const autoAdvance = (workflow?.template as any)?.auto_advance_stages;

          // Only auto-advance if setting is enabled and task is in current stage
          if (autoAdvance && workflow?.current_stage_id === task.stage_id) {
            // Count remaining incomplete tasks in current stage
            const { count } = await supabase
              .from("employee_workflow_tasks")
              .select("id", { count: "exact", head: true })
              .eq("workflow_id", task.workflow_id)
              .eq("stage_id", task.stage_id)
              .neq("status", "completed");

            if (count === 0) {
              // All tasks complete - find next stage
              const { data: stages } = await supabase
                .from("workflow_stages")
                .select("id, sort_order")
                .eq("template_id", workflow.template_id!)
                .order("sort_order");

              const currentStageIdx = stages?.findIndex(s => s.id === workflow.current_stage_id) ?? -1;
              const nextStage = stages?.[currentStageIdx + 1];

              if (nextStage) {
                // Move to next stage
                await supabase
                  .from("employee_workflows")
                  .update({ current_stage_id: nextStage.id })
                  .eq("id", workflow.id);
                
                return { autoAdvanced: true, nextStageName: "next stage" };
              } else {
                // Complete workflow
                await supabase
                  .from("employee_workflows")
                  .update({ 
                    current_stage_id: null,
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                  })
                  .eq("id", workflow.id);
                
                return { autoAdvanced: true, workflowCompleted: true };
              }
            }
          }
        }
      }

      return { autoAdvanced: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      
      if (result?.autoAdvanced) {
        if (result.workflowCompleted) {
          toast.success("All tasks complete - workflow completed!");
        } else {
          toast.success("All tasks complete - moved to next stage");
        }
      } else {
        toast.success("Task updated");
      }
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to update task", {
        componentName: "useUpdateWorkflowTask",
        actionAttempted: "Update workflow task status",
        errorType: "database",
      });
    },
  });
};

// Move workflow to next stage without completing tasks
export const useMoveToNextStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      nextStageId,
    }: {
      workflowId: string;
      nextStageId: string | null; // null = complete workflow
    }) => {
      // Get current workflow details for logging
      const { data: workflow } = await supabase
        .from("employee_workflows")
        .select("current_stage_id, organization_id")
        .eq("id", workflowId)
        .single();
      
      if (!workflow) throw new Error("Workflow not found");
      
      // Get current employee
      const { data: { user } } = await supabase.auth.getUser();
      let employeeId: string | null = null;
      if (user) {
        const { data: emp } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .single();
        employeeId = emp?.id || null;
      }

      // Get stage names for logging
      let oldStageName = "Unknown";
      let newStageName = "Completed";
      
      if (workflow.current_stage_id) {
        const { data: oldStage } = await supabase
          .from("workflow_stages")
          .select("name")
          .eq("id", workflow.current_stage_id)
          .single();
        oldStageName = oldStage?.name || "Unknown";
      }
      
      if (nextStageId) {
        const { data: newStage } = await supabase
          .from("workflow_stages")
          .select("name")
          .eq("id", nextStageId)
          .single();
        newStageName = newStage?.name || "Unknown";

        // Move to next stage
        const { error } = await supabase
          .from("employee_workflows")
          .update({ current_stage_id: nextStageId })
          .eq("id", workflowId);
        
        if (error) throw error;

        // Log stage change
        await supabase.from("workflow_activity_logs").insert([{
          workflow_id: workflowId,
          organization_id: workflow.organization_id,
          employee_id: employeeId,
          action_type: 'stage_changed',
          entity_type: 'stage',
          entity_id: nextStageId,
          old_value: { stage_id: workflow.current_stage_id, stage_name: oldStageName },
          new_value: { stage_id: nextStageId, stage_name: newStageName },
          description: `Moved from "${oldStageName}" to "${newStageName}"`,
        }]);
      } else {
        // Complete workflow
        const { error } = await supabase
          .from("employee_workflows")
          .update({ 
            current_stage_id: null,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq("id", workflowId);
        
        if (error) throw error;

        // Log workflow completion
        await supabase.from("workflow_activity_logs").insert([{
          workflow_id: workflowId,
          organization_id: workflow.organization_id,
          employee_id: employeeId,
          action_type: 'workflow_completed',
          entity_type: 'workflow',
          entity_id: workflowId,
          old_value: { stage_name: oldStageName },
          new_value: { status: 'completed' },
          description: `Workflow completed from "${oldStageName}"`,
        }]);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-activity-logs"] });
      
      if (variables.nextStageId) {
        toast.success("Moved to next stage");
      } else {
        toast.success("Workflow completed");
      }
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to move to next stage", {
        componentName: "useMoveToNextStage",
        actionAttempted: "Move workflow to next stage",
        errorType: "database",
      });
    },
  });
};

// Add a new task to an employee workflow
export const useAddWorkflowTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      employeeId,
      organizationId,
      stageId,
      title,
      description,
      category,
      assigneeId,
      dueDate,
      isRequired,
    }: {
      workflowId: string;
      employeeId: string;
      organizationId: string;
      stageId: string; // Now required
      title: string;
      description?: string;
      category: string;
      assigneeId?: string;
      dueDate?: string;
      isRequired?: boolean;
    }) => {
      // Get max sort_order for this workflow
      const { data: existingTasks } = await supabase
        .from("employee_workflow_tasks")
        .select("sort_order")
        .eq("workflow_id", workflowId)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSortOrder = (existingTasks?.[0]?.sort_order ?? 0) + 1;

      const { error } = await supabase
        .from("employee_workflow_tasks")
        .insert({
          workflow_id: workflowId,
          employee_id: employeeId,
          organization_id: organizationId,
          stage_id: stageId,
          title,
          description: description || null,
          category,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
          is_required: isRequired ?? true,
          status: 'pending',
          sort_order: nextSortOrder,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      toast.success("Task added successfully");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to add task", {
        componentName: "useAddWorkflowTask",
        actionAttempted: "Add workflow task",
        errorType: "database",
      });
    },
  });
};

// Edit an employee workflow task
export const useEditWorkflowTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      title,
      description,
      category,
      assigneeId,
      dueDate,
      isRequired,
      stageId,
      workflowId,
      employeeId,
    }: {
      taskId: string;
      title: string;
      description?: string | null;
      category: string;
      assigneeId?: string | null;
      dueDate?: string | null;
      isRequired: boolean;
      stageId: string; // Now required
      workflowId?: string;
      employeeId?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        title,
        description,
        category,
        assignee_id: assigneeId,
        due_date: dueDate,
        is_required: isRequired,
        stage_id: stageId,
        updated_at: new Date().toISOString(),
      };

      // If workflow is being changed, also update workflow_id and employee_id
      if (workflowId) {
        updateData.workflow_id = workflowId;
      }
      if (employeeId) {
        updateData.employee_id = employeeId;
      }

      const { error } = await supabase
        .from("employee_workflow_tasks")
        .update(updateData)
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      toast.success("Task updated");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to update task", {
        componentName: "useEditWorkflowTask",
        actionAttempted: "Edit workflow task",
        errorType: "database",
      });
    },
  });
};

// Delete an employee workflow task
export const useDeleteEmployeeWorkflowTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("employee_workflow_tasks")
        .delete()
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      toast.success("Task deleted");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to delete task", {
        componentName: "useDeleteEmployeeWorkflowTask",
        actionAttempted: "Delete employee workflow task",
        errorType: "database",
      });
    },
  });
};

// Complete all tasks in a stage and advance workflow to next stage
export const useCompleteStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      taskIds,
      completedBy,
      nextStageId,
    }: {
      workflowId: string;
      taskIds: string[];
      completedBy: string;
      nextStageId: string | null; // null means this is the final stage
    }) => {
      // 1. Complete all pending tasks in current stage
      if (taskIds.length > 0) {
        const { error: taskError } = await supabase
          .from("employee_workflow_tasks")
          .update({
            status: 'completed',
            completed_by: completedBy,
            completed_at: new Date().toISOString(),
          })
          .in("id", taskIds);
        
        if (taskError) throw taskError;
      }

      // 2. Move workflow to next stage (or complete it)
      if (nextStageId) {
        // Move to next stage
        const { error: workflowError } = await supabase
          .from("employee_workflows")
          .update({ current_stage_id: nextStageId })
          .eq("id", workflowId);
        
        if (workflowError) throw workflowError;
      } else {
        // Final stage - complete the entire workflow
        const { error: workflowError } = await supabase
          .from("employee_workflows")
          .update({ 
            current_stage_id: null,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq("id", workflowId);
        
        if (workflowError) throw workflowError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      
      if (variables.nextStageId) {
        toast.success("Stage completed - workflow moved to next stage");
      } else {
        toast.success("Workflow completed successfully");
      }
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to complete stage", {
        componentName: "useCompleteStage",
        actionAttempted: "Complete workflow stage",
        errorType: "database",
      });
    },
  });
};

// Exit Interviews
export const useExitInterview = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ["exit-interview", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const { data, error } = await supabase
        .from("exit_interviews")
        .select("*")
        .eq("employee_id", employeeId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ExitInterview | null;
    },
    enabled: !!employeeId,
  });
};

export const useUpdateExitInterview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ExitInterview>;
    }) => {
      const { error } = await supabase
        .from("exit_interviews")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-interview"] });
      toast.success("Exit interview updated");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to update exit interview", {
        componentName: "useUpdateExitInterview",
        actionAttempted: "Update exit interview",
        errorType: "database",
      });
    },
  });
};

// Asset Handovers
export const useAssetHandovers = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ["asset-handovers", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from("asset_handovers")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at");
      
      if (error) throw error;
      return data as AssetHandover[];
    },
    enabled: !!employeeId,
  });
};

export const useUpdateAssetHandover = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: AssetStatus;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      const updateData: Record<string, unknown> = { status };
      
      if (status === "returned") {
        updateData.returned_date = new Date().toISOString().split("T")[0];
        if (employee) updateData.verified_by = employee.id;
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      const { error } = await supabase
        .from("asset_handovers")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-handovers"] });
      toast.success("Asset status updated");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to update asset", {
        componentName: "useUpdateAssetHandover",
        actionAttempted: "Update asset handover status",
        errorType: "database",
      });
    },
  });
};

export const useAddAssetHandover = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({
      employeeId,
      workflowId,
      assetName,
      assetId,
      category,
    }: {
      employeeId: string;
      workflowId?: string;
      assetName: string;
      assetId?: string;
      category: string;
    }) => {
      if (!currentOrg?.id) throw new Error("No organization");
      
      const { error } = await supabase
        .from("asset_handovers")
        .insert({
          employee_id: employeeId,
          organization_id: currentOrg.id,
          workflow_id: workflowId || null,
          asset_name: assetName,
          asset_id: assetId || null,
          category,
          status: "assigned",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-handovers"] });
      toast.success("Asset added");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to add asset", {
        componentName: "useAddAssetHandover",
        actionAttempted: "Add asset handover",
        errorType: "database",
      });
    },
  });
};

// Knowledge Transfers
export const useKnowledgeTransfers = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ["knowledge-transfers", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from("knowledge_transfers")
        .select(`
          *,
          recipient:employees!knowledge_transfers_recipient_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("employee_id", employeeId)
        .order("scheduled_date");
      
      if (error) throw error;
      return data as KnowledgeTransferWithRecipient[];
    },
    enabled: !!employeeId,
  });
};

export const useUpdateKnowledgeTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: KnowledgeTransferStatus;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      const { error } = await supabase
        .from("knowledge_transfers")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-transfers"] });
      toast.success("Knowledge transfer updated");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to update knowledge transfer", {
        componentName: "useUpdateKnowledgeTransfer",
        actionAttempted: "Update knowledge transfer",
        errorType: "database",
      });
    },
  });
};

export const useAddKnowledgeTransfer = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({
      employeeId,
      workflowId,
      topic,
      description,
      recipientId,
      scheduledDate,
    }: {
      employeeId: string;
      workflowId?: string;
      topic: string;
      description?: string;
      recipientId?: string;
      scheduledDate?: string;
    }) => {
      if (!currentOrg?.id) throw new Error("No organization");
      
      const { error } = await supabase
        .from("knowledge_transfers")
        .insert({
          employee_id: employeeId,
          organization_id: currentOrg.id,
          workflow_id: workflowId || null,
          topic,
          description: description || null,
          recipient_id: recipientId || null,
          scheduled_date: scheduledDate || null,
          status: "scheduled",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-transfers"] });
      toast.success("Knowledge transfer scheduled");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to schedule knowledge transfer", {
        componentName: "useAddKnowledgeTransfer",
        actionAttempted: "Schedule knowledge transfer",
        errorType: "database",
      });
    },
  });
};

// Workflow Task Attachments
export const useWorkflowTaskAttachments = (taskId: string | null) => {
  return useQuery({
    queryKey: ["workflow-task-attachments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from("workflow_task_attachments")
        .select(`
          *,
          employee:employees!workflow_task_attachments_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
};

export const useUploadTaskAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, file, organizationId, employeeId, workflowId }: {
      taskId: string;
      file: File;
      organizationId: string;
      employeeId: string;
      workflowId?: string;
    }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${organizationId}/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('workflow-task-attachments')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { error: dbError } = await supabase
        .from('workflow_task_attachments')
        .insert({
          task_id: taskId,
          organization_id: organizationId,
          employee_id: employeeId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        });
      
      if (dbError) throw dbError;

      // Log activity if workflowId is provided
      if (workflowId) {
        await supabase.from("workflow_activity_logs").insert([{
          workflow_id: workflowId,
          organization_id: organizationId,
          employee_id: employeeId,
          action_type: 'attachment_added',
          entity_type: 'task',
          entity_id: taskId,
          new_value: { file_name: file.name, file_size: file.size },
          description: `Uploaded attachment "${file.name}"`,
        }]);
      }

      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-attachments", data.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-activity-logs", data.taskId] });
      toast.success("Attachment uploaded");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to upload attachment", {
        componentName: "useUploadTaskAttachment",
        actionAttempted: "Upload task attachment",
        errorType: "network",
      });
    },
  });
};

export const useDeleteTaskAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachmentId, filePath, taskId, fileName, workflowId, organizationId, employeeId }: {
      attachmentId: string;
      filePath: string;
      taskId: string;
      fileName?: string;
      workflowId?: string;
      organizationId?: string;
      employeeId?: string;
    }) => {
      await supabase.storage
        .from('workflow-task-attachments')
        .remove([filePath]);
      
      const { error } = await supabase
        .from('workflow_task_attachments')
        .delete()
        .eq('id', attachmentId);
      
      if (error) throw error;

      // Log activity if workflowId is provided
      if (workflowId && organizationId) {
        await supabase.from("workflow_activity_logs").insert([{
          workflow_id: workflowId,
          organization_id: organizationId,
          employee_id: employeeId || null,
          action_type: 'attachment_deleted',
          entity_type: 'task',
          entity_id: taskId,
          old_value: { file_name: fileName },
          description: `Deleted attachment "${fileName || 'Unknown'}"`,
        }]);
      }
      
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-attachments", data.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-activity-logs", data.taskId] });
      toast.success("Attachment deleted");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to delete attachment", {
        componentName: "useDeleteTaskAttachment",
        actionAttempted: "Delete task attachment",
        errorType: "database",
      });
    },
  });
};

export const useUpdateTaskTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const { error } = await supabase
        .from("employee_workflow_tasks")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      toast.success("Title updated");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to update title", {
        componentName: "useUpdateTaskTitle",
        actionAttempted: "Update task title",
        errorType: "database",
      });
    },
  });
};

// Task Checklists
export const useTaskChecklists = (taskId: string | null) => {
  return useQuery({
    queryKey: ["workflow-task-checklists", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from("workflow_task_checklists")
        .select("*")
        .eq("task_id", taskId)
        .order("sort_order");
      
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
};

export const useAddTaskChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      organizationId,
      title,
      workflowId,
      employeeId,
    }: {
      taskId: string;
      organizationId: string;
      title: string;
      workflowId?: string;
      employeeId?: string;
    }) => {
      // Get max sort_order for this task
      const { data: existingItems } = await supabase
        .from("workflow_task_checklists")
        .select("sort_order")
        .eq("task_id", taskId)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSortOrder = (existingItems?.[0]?.sort_order ?? 0) + 1;

      const { error } = await supabase
        .from("workflow_task_checklists")
        .insert({
          task_id: taskId,
          organization_id: organizationId,
          title,
          sort_order: nextSortOrder,
        });
      
      if (error) throw error;

      // Log activity
      if (workflowId) {
        await supabase.from("workflow_activity_logs").insert([{
          workflow_id: workflowId,
          organization_id: organizationId,
          employee_id: employeeId || null,
          action_type: 'checklist_added',
          entity_type: 'task',
          entity_id: taskId,
          new_value: { title },
          description: `Added checklist item "${title}"`,
        }]);
      }

      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-checklists", data.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-activity-logs", data.taskId] });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to add checklist item", {
        componentName: "useAddTaskChecklist",
        actionAttempted: "Add task checklist item",
        errorType: "database",
      });
    },
  });
};

export const useUpdateTaskChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checklistId,
      taskId,
      updates,
      title,
      workflowId,
      organizationId,
      employeeId,
      wasCompleted,
    }: {
      checklistId: string;
      taskId: string;
      updates: { title?: string; is_completed?: boolean };
      title?: string;
      workflowId?: string;
      organizationId?: string;
      employeeId?: string;
      wasCompleted?: boolean;
    }) => {
      const { error } = await supabase
        .from("workflow_task_checklists")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", checklistId);
      
      if (error) throw error;

      // Log activity for completion changes
      if (workflowId && organizationId && updates.is_completed !== undefined && updates.is_completed !== wasCompleted) {
        const actionType = updates.is_completed ? 'checklist_completed' : 'checklist_uncompleted';
        const description = updates.is_completed 
          ? `Completed checklist item "${title || 'Unknown'}"` 
          : `Reopened checklist item "${title || 'Unknown'}"`;
        
        await supabase.from("workflow_activity_logs").insert([{
          workflow_id: workflowId,
          organization_id: organizationId,
          employee_id: employeeId || null,
          action_type: actionType,
          entity_type: 'task',
          entity_id: taskId,
          old_value: { is_completed: wasCompleted },
          new_value: { is_completed: updates.is_completed, title },
          description,
        }]);
      }

      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-checklists", data.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-activity-logs", data.taskId] });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to update checklist item", {
        componentName: "useUpdateTaskChecklist",
        actionAttempted: "Update task checklist item",
        errorType: "database",
      });
    },
  });
};

export const useDeleteTaskChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checklistId,
      taskId,
      title,
      workflowId,
      organizationId,
      employeeId,
    }: {
      checklistId: string;
      taskId: string;
      title?: string;
      workflowId?: string;
      organizationId?: string;
      employeeId?: string;
    }) => {
      const { error } = await supabase
        .from("workflow_task_checklists")
        .delete()
        .eq("id", checklistId);
      
      if (error) throw error;

      // Log activity
      if (workflowId && organizationId) {
        await supabase.from("workflow_activity_logs").insert([{
          workflow_id: workflowId,
          organization_id: organizationId,
          employee_id: employeeId || null,
          action_type: 'checklist_deleted',
          entity_type: 'task',
          entity_id: taskId,
          old_value: { title },
          description: `Deleted checklist item "${title || 'Unknown'}"`,
        }]);
      }

      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-checklists", data.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-activity-logs", data.taskId] });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to delete checklist item", {
        componentName: "useDeleteTaskChecklist",
        actionAttempted: "Delete task checklist item",
        errorType: "database",
      });
    },
  });
};

// Proration Preview
export const useProrationPreview = (employeeId: string | undefined, lastWorkingDay: string | undefined) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["proration-preview", employeeId, lastWorkingDay],
    queryFn: async () => {
      if (!employeeId || !lastWorkingDay || !currentOrg?.id) return [];
      
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      
      // Get employee join date
      const { data: employee } = await supabase
        .from("employees")
        .select("join_date")
        .eq("id", employeeId)
        .single();
      
      if (!employee) return [];
      
      const effectiveStart = employee.join_date > yearStart ? employee.join_date : yearStart;
      
      // Get leave balances with leave types
      const { data: balances } = await supabase
        .from("leave_type_balances")
        .select(`
          id, balance, leave_type_id,
          leave_type:leave_types!inner(id, name, default_days, category)
        `)
        .eq("employee_id", employeeId)
        .eq("year", currentYear);
      
      if (!balances) return [];
      
      // Calculate proration for each balance
      return balances
        .filter((b: any) => b.leave_type?.category === "paid" && b.leave_type?.default_days > 0)
        .map((b: any) => {
          const defaultDays = b.leave_type.default_days;
          
          // Calculate months
          const startDate = new Date(effectiveStart);
          const endDate = new Date(lastWorkingDay);
          
          let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 
            + (endDate.getMonth() - startDate.getMonth());
          
          if (startDate.getDate() > endDate.getDate()) {
            months--;
          }
          months = Math.max(0, Math.min(12, months + 1));
          
          const proratedDays = Math.round((defaultDays / 12) * months * 100) / 100;
          const usedDays = defaultDays - b.balance;
          const exceeded = usedDays > proratedDays;
          
          return {
            leaveTypeName: b.leave_type.name,
            leaveTypeId: b.leave_type.id,
            defaultDays,
            proratedDays,
            usedDays,
            currentBalance: b.balance,
            newBalance: proratedDays - usedDays,
            exceeded,
            exceededBy: exceeded ? Math.round((usedDays - proratedDays) * 100) / 100 : 0,
          };
        });
    },
    enabled: !!employeeId && !!lastWorkingDay && !!currentOrg?.id,
  });
};

// Cancel/Archive a workflow (sets status to 'cancelled')
export const useCancelWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workflowId: string) => {
      // Get workflow details for logging
      const { data: workflow } = await supabase
        .from("employee_workflows")
        .select("organization_id")
        .eq("id", workflowId)
        .single();
      
      if (!workflow) throw new Error("Workflow not found");
      
      // Get current employee for logging
      const { data: { user } } = await supabase.auth.getUser();
      let employeeId: string | null = null;
      if (user) {
        const { data: emp } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .single();
        employeeId = emp?.id || null;
      }
      
      const { error } = await supabase
        .from("employee_workflows")
        .update({ status: 'cancelled' as const })
        .eq("id", workflowId);
      
      if (error) throw error;
      
      // Log the action
      await supabase.from("workflow_activity_logs").insert([{
        workflow_id: workflowId,
        organization_id: workflow.organization_id,
        employee_id: employeeId,
        action_type: 'workflow_completed',
        entity_type: 'workflow',
        entity_id: workflowId,
        old_value: { status: 'active' },
        new_value: { status: 'cancelled' },
        description: 'Workflow cancelled',
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-activity-logs"] });
      toast.success("Workflow cancelled successfully");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to cancel workflow", {
        componentName: "useCancelWorkflow",
        actionAttempted: "Cancel workflow",
        errorType: "database",
      });
    }
  });
};

// Reactivate a cancelled workflow (sets status to 'active')
export const useReactivateWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workflowId: string) => {
      // Get workflow details for logging
      const { data: workflow } = await supabase
        .from("employee_workflows")
        .select("organization_id, template_id")
        .eq("id", workflowId)
        .single();
      
      if (!workflow) throw new Error("Workflow not found");
      
      // Get first stage to set as current
      let firstStageId: string | null = null;
      if (workflow.template_id) {
        const { data: stages } = await supabase
          .from("workflow_stages")
          .select("id")
          .eq("template_id", workflow.template_id)
          .order("sort_order")
          .limit(1);
        firstStageId = stages?.[0]?.id || null;
      }
      
      // Get current employee for logging
      const { data: { user } } = await supabase.auth.getUser();
      let employeeId: string | null = null;
      if (user) {
        const { data: emp } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .single();
        employeeId = emp?.id || null;
      }
      
      const { error } = await supabase
        .from("employee_workflows")
        .update({ 
          status: 'active' as const,
          current_stage_id: firstStageId,
          completed_at: null,
        })
        .eq("id", workflowId);
      
      if (error) throw error;
      
      // Log the action
      await supabase.from("workflow_activity_logs").insert([{
        workflow_id: workflowId,
        organization_id: workflow.organization_id,
        employee_id: employeeId,
        action_type: 'workflow_started',
        entity_type: 'workflow',
        entity_id: workflowId,
        old_value: { status: 'cancelled' },
        new_value: { status: 'active' },
        description: 'Workflow reactivated',
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-activity-logs"] });
      toast.success("Workflow reactivated successfully");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to reactivate workflow", {
        componentName: "useReactivateWorkflow",
        actionAttempted: "Reactivate workflow",
        errorType: "database",
      });
    }
  });
};

// Permanently delete a workflow
export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workflowId: string) => {
      const { error } = await supabase
        .from("employee_workflows")
        .delete()
        .eq("id", workflowId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      toast.success("Workflow deleted permanently");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to delete workflow", {
        componentName: "useDeleteWorkflow",
        actionAttempted: "Delete workflow permanently",
        errorType: "database",
      });
    }
  });
};

// Close an application - complete all tasks and mark workflow as completed
export const useCloseApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      workflowId,
      completedBy,
      organizationId,
    }: {
      workflowId: string;
      completedBy: string;
      organizationId: string;
    }) => {
      // 1. Complete all non-completed tasks
      const { error: taskError } = await supabase
        .from("employee_workflow_tasks")
        .update({
          status: 'completed' as const,
          completed_by: completedBy,
          completed_at: new Date().toISOString(),
        })
        .eq("workflow_id", workflowId)
        .neq("status", "completed")
        .neq("status", "skipped");
      
      if (taskError) throw taskError;

      // 2. Mark workflow as completed
      const { error: workflowError } = await supabase
        .from("employee_workflows")
        .update({ 
          status: 'completed' as const,
          current_stage_id: null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", workflowId);
      
      if (workflowError) throw workflowError;

      // 3. Log activity
      await supabase.from("workflow_activity_logs").insert({
        workflow_id: workflowId,
        organization_id: organizationId,
        employee_id: completedBy,
        action_type: 'workflow_completed',
        entity_type: 'workflow',
        entity_id: workflowId,
        description: 'Application closed - all tasks marked as completed',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["my-workflow-tasks"] });
      toast.success("Application closed successfully");
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to close application", {
        componentName: "useCloseApplication",
        actionAttempted: "Close application",
        errorType: "database",
      });
    },
  });
};
