/**
 * Hook for auto-saving individual task fields with activity logging
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WorkflowTaskStatus } from "@/types/workflow";
import type { Json } from "@/integrations/supabase/types";

type FieldType = 'status' | 'description' | 'category' | 'assignee' | 'due_date' | 'is_required' | 'workflow_stage';

interface AutoSaveParams {
  taskId: string;
  workflowId: string;
  organizationId: string;
  employeeId?: string | null;
  field: FieldType;
  oldValue: unknown;
  newValue: unknown;
}

interface WorkflowStageChange {
  workflowId: string;
  stageId: string;
  workflowType?: string;
  stageName?: string;
}

// Get human-readable field descriptions
function getFieldDescription(
  field: FieldType, 
  oldValue: unknown, 
  newValue: unknown, 
  employees?: any[]
): string {
  switch (field) {
    case 'status':
      return `Changed status from "${oldValue || 'None'}" to "${newValue}"`;
    case 'description':
      return oldValue ? 'Updated task description' : 'Added task description';
    case 'category':
      return `Changed category from "${oldValue || 'None'}" to "${newValue}"`;
    case 'assignee': {
      if (!newValue) return 'Unassigned task';
      const assignee = employees?.find(e => e.id === newValue);
      const assigneeName = assignee?.profiles?.full_name || 'Unknown';
      return `Assigned task to ${assigneeName}`;
    }
    case 'due_date': {
      if (!newValue) return 'Removed due date';
      const dateStr = new Date(newValue as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return oldValue ? `Changed due date to ${dateStr}` : `Set due date to ${dateStr}`;
    }
    case 'is_required':
      return newValue ? 'Marked task as required' : 'Marked task as optional';
    case 'workflow_stage': {
      const oldChange = oldValue as WorkflowStageChange | null;
      const newChange = newValue as WorkflowStageChange;
      const oldWorkflowType = oldChange?.workflowType || 'Unknown';
      const oldStageName = oldChange?.stageName || 'Unknown';
      const newWorkflowType = newChange?.workflowType || 'Unknown';
      const newStageName = newChange?.stageName || 'Unknown';
      
      if (oldChange?.workflowId !== newChange.workflowId) {
        return `Moved task from ${oldWorkflowType}/${oldStageName} to ${newWorkflowType}/${newStageName}`;
      }
      return `Moved task to ${newStageName} stage`;
    }
    default:
      return `Updated ${field}`;
  }
}

export const useAutoSaveTaskField = (employees?: any[]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      workflowId,
      organizationId,
      employeeId,
      field,
      oldValue,
      newValue,
    }: AutoSaveParams) => {
      // Special handling for workflow_stage changes
      if (field === 'workflow_stage') {
        const newChange = newValue as WorkflowStageChange;
        
        const updateData: Record<string, unknown> = {
          workflow_id: newChange.workflowId,
          stage_id: newChange.stageId,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from("employee_workflow_tasks")
          .update(updateData)
          .eq("id", taskId);

        if (updateError) throw updateError;

        // Log activity
        const description = getFieldDescription(field, oldValue, newValue, employees);
        
        await supabase.from("workflow_activity_logs").insert([{
          workflow_id: newChange.workflowId,
          organization_id: organizationId,
          employee_id: employeeId || null,
          action_type: 'task_updated',
          entity_type: 'task',
          entity_id: taskId,
          old_value: oldValue as Json,
          new_value: newValue as Json,
          description,
        }]);

        return { field, newValue };
      }

      // Map field name to database column
      const columnMap: Record<Exclude<FieldType, 'workflow_stage'>, string> = {
        status: 'status',
        description: 'description',
        category: 'category',
        assignee: 'assignee_id',
        due_date: 'due_date',
        is_required: 'is_required',
      };

      const updateData: Record<string, unknown> = {
        [columnMap[field as Exclude<FieldType, 'workflow_stage'>]]: newValue,
        updated_at: new Date().toISOString(),
      };

      // Handle status completion
      if (field === 'status' && newValue === 'completed' && employeeId) {
        updateData.completed_by = employeeId;
        updateData.completed_at = new Date().toISOString();
      }

      // Update the task field
      const { error: updateError } = await supabase
        .from("employee_workflow_tasks")
        .update(updateData)
        .eq("id", taskId);

      if (updateError) throw updateError;

      // Log activity
      const description = getFieldDescription(field, oldValue, newValue, employees);
      
      await supabase.from("workflow_activity_logs").insert([{
        workflow_id: workflowId,
        organization_id: organizationId,
        employee_id: employeeId || null,
        action_type: 'task_updated',
        entity_type: 'task',
        entity_id: taskId,
        old_value: { [field]: oldValue } as Json,
        new_value: { [field]: newValue } as Json,
        description,
      }]);

      return { field, newValue };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["my-workflow-tasks"] });
      
      // Only show toast for significant changes (status, workflow_stage)
      if (result?.field === 'status') {
        toast.success(`Task ${result.newValue}`);
      } else if (result?.field === 'workflow_stage') {
        toast.success("Task moved successfully");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save change");
    },
  });
};
