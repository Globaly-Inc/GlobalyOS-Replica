/**
 * Real-time subscriptions for Task Detail Sheet
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTaskDetailRealtime = (taskId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-detail-${taskId}`)
      // Listen for task updates
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'employee_workflow_tasks',
        filter: `id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      })
      // Listen for new comments
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workflow_task_comments',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["workflow-task-comments", taskId] });
      })
      // Listen for attachments
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workflow_task_attachments',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["workflow-task-attachments", taskId] });
      })
      // Listen for checklists
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workflow_task_checklists',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["workflow-task-checklists", taskId] });
      })
      // Listen for activity logs
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'workflow_activity_logs',
        filter: `entity_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["task-activity-logs", taskId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);
};
