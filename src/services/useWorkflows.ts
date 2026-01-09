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
} from "@/types/workflow";

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

// Update workflow task
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-workflow-tasks"] });
      toast.success("Task updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
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
