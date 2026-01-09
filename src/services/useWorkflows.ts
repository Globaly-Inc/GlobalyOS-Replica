/**
 * React Query hooks for workflow management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import type {
  WorkflowTemplate,
  WorkflowTemplateTask,
  EmployeeWorkflow,
  EmployeeWorkflowTaskWithAssignee,
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

// Workflow Templates
export const useWorkflowTemplates = (type?: 'onboarding' | 'offboarding') => {
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
      return data as WorkflowTemplate[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useWorkflowTemplateTasks = (templateId: string | undefined) => {
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
      return data as WorkflowTemplateTask[];
    },
    enabled: !!templateId,
  });
};

// Employee Workflows
export const useEmployeeWorkflows = (employeeId: string | undefined) => {
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
      return data as EmployeeWorkflow[];
    },
    enabled: !!employeeId,
  });
};

export const useEmployeeWorkflowTasks = (workflowId: string | undefined) => {
  return useQuery({
    queryKey: ["employee-workflow-tasks", workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      
      const { data, error } = await supabase
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
      
      if (error) throw error;
      return data as EmployeeWorkflowTaskWithAssignee[];
    },
    enabled: !!workflowId,
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
          workflow:employee_workflows!inner(
            id, type, target_date,
            employee:employees!inner(
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
      toast.error(error.message || "Failed to complete task");
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
      toast.error(error.message || "Failed to delete task");
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
      toast.error(error.message || "Failed to update task");
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
      toast.error(error.message || "Failed to update task");
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
      if (nextStageId) {
        // Move to next stage
        const { error } = await supabase
          .from("employee_workflows")
          .update({ current_stage_id: nextStageId })
          .eq("id", workflowId);
        
        if (error) throw error;
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
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      
      if (variables.nextStageId) {
        toast.success("Moved to next stage");
      } else {
        toast.success("Workflow completed");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to move to next stage");
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
      toast.error(error.message || "Failed to add task");
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
      toast.error(error.message || "Failed to update task");
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
      toast.error(error.message || "Failed to delete task");
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
      toast.error(error.message || "Failed to complete stage");
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
      toast.error(error.message || "Failed to update exit interview");
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
      toast.error(error.message || "Failed to update asset");
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
      toast.error(error.message || "Failed to add asset");
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
      toast.error(error.message || "Failed to update knowledge transfer");
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
      toast.error(error.message || "Failed to schedule knowledge transfer");
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
    mutationFn: async ({ taskId, file, organizationId, employeeId }: {
      taskId: string;
      file: File;
      organizationId: string;
      employeeId: string;
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
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-attachments", taskId] });
      toast.success("Attachment uploaded");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload attachment");
    },
  });
};

export const useDeleteTaskAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachmentId, filePath, taskId }: {
      attachmentId: string;
      filePath: string;
      taskId: string;
    }) => {
      await supabase.storage
        .from('workflow-task-attachments')
        .remove([filePath]);
      
      const { error } = await supabase
        .from('workflow_task_attachments')
        .delete()
        .eq('id', attachmentId);
      
      if (error) throw error;
      
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-attachments", data.taskId] });
      toast.success("Attachment deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete attachment");
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
      toast.error(error.message || "Failed to update title");
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
