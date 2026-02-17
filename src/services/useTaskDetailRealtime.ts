/**
 * Real-time subscriptions for Task Detail + Task Lists
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_comments',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_attachments',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_checklists',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['task-checklists', taskId] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_activity_logs',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['task-activity-logs', taskId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_followers',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['task-followers', taskId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);
};

/** Realtime for task list (all tasks in a space) */
export const useTaskListRealtime = (spaceId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!spaceId) return;

    const channel = supabase
      .channel(`task-list-${spaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `space_id=eq.${spaceId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks', spaceId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, queryClient]);
};
