/**
 * React Query hooks for workflow activity logging
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowActivityType, WorkflowActivityLog } from "@/types/workflow";
import type { Json } from "@/integrations/supabase/types";

export const useWorkflowActivityLogs = (workflowId: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-activity-logs", workflowId],
    queryFn: async () => {
      if (!workflowId) return [];

      const { data, error } = await supabase
        .from("workflow_activity_logs")
        .select(`
          *,
          employee:employees(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WorkflowActivityLog[];
    },
    enabled: !!workflowId,
  });
};

export const useLogWorkflowActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      organizationId,
      employeeId,
      actionType,
      entityType,
      entityId,
      oldValue,
      newValue,
      description,
    }: {
      workflowId: string;
      organizationId: string;
      employeeId?: string | null;
      actionType: WorkflowActivityType;
      entityType?: 'workflow' | 'task' | 'stage' | null;
      entityId?: string | null;
      oldValue?: Record<string, unknown> | null;
      newValue?: Record<string, unknown> | null;
      description?: string | null;
    }) => {
      const { error } = await supabase.from("workflow_activity_logs").insert([{
        workflow_id: workflowId,
        organization_id: organizationId,
        employee_id: employeeId || null,
        action_type: actionType,
        entity_type: entityType || null,
        entity_id: entityId || null,
        old_value: (oldValue || null) as Json,
        new_value: (newValue || null) as Json,
        description: description || null,
      }]);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflow-activity-logs", variables.workflowId],
      });
    },
  });
};

// Helper function for logging activities inline within other mutations
export async function logWorkflowActivity({
  workflowId,
  organizationId,
  employeeId,
  actionType,
  entityType,
  entityId,
  oldValue,
  newValue,
  description,
}: {
  workflowId: string;
  organizationId: string;
  employeeId?: string | null;
  actionType: WorkflowActivityType;
  entityType?: 'workflow' | 'task' | 'stage' | null;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  description?: string | null;
}) {
  await supabase.from("workflow_activity_logs").insert([{
    workflow_id: workflowId,
    organization_id: organizationId,
    employee_id: employeeId || null,
    action_type: actionType,
    entity_type: entityType || null,
    entity_id: entityId || null,
    old_value: (oldValue || null) as Json,
    new_value: (newValue || null) as Json,
    description: description || null,
  }]);
}
