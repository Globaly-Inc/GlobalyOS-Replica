/**
 * Real-time subscription hooks for workflow system
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

/**
 * Organization-wide workflow realtime subscription
 * Use for the Workflows list page
 */
export const useWorkflowRealtime = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel(`workflows-org-${currentOrg.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_workflows',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
          queryClient.invalidateQueries({ queryKey: ["employee-workflows"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_workflow_tasks',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
          queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["my-workflow-tasks"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);
};

/**
 * Specific workflow realtime subscription
 * Use for the WorkflowDetail page
 */
export const useWorkflowDetailRealtime = (workflowId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workflowId) return;

    const channel = supabase
      .channel(`workflow-detail-${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_workflows',
          filter: `id=eq.${workflowId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["workflow-detail", workflowId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_workflow_tasks',
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks", workflowId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_activity_logs',
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["workflow-activity-logs", workflowId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId, queryClient]);
};
