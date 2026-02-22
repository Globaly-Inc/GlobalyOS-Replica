/**
 * Consolidated organization-wide realtime subscription
 * 
 * Merges multiple per-domain realtime channels into ONE channel per org,
 * drastically reducing WebSocket connections per user.
 * 
 * Previously each domain (leave, KPI, WFH, workflow, social feed) opened
 * its own channel — up to 5+ WebSocket subscriptions per user.
 * Now a single channel handles all org-scoped postgres_changes events.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export const useOrgRealtime = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (!currentOrg?.id) return;

    const orgId = currentOrg.id;

    const channel = supabase
      .channel(`org-realtime-${orgId}`)

      // ── Leave ──────────────────────────────────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_type_balances',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
        queryClient.invalidateQueries({ queryKey: ['leave-type-balances'] });
        queryClient.invalidateQueries({ queryKey: ['leave-type-balances-profile'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_balance_logs',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['leave-balance-logs'] });
        queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
        queryClient.invalidateQueries({ queryKey: ['employee-leave-requests'] });
        queryClient.invalidateQueries({ queryKey: ['pending-leave-approvals'] });
      })

      // ── Social Feed ────────────────────────────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'post_comments',
        filter: `organization_id=eq.${orgId}`,
      }, (payload) => {
        const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
        if (postId) {
          queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
          queryClient.invalidateQueries({ queryKey: ['post-comment-count', postId] });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'post_reactions',
        filter: `organization_id=eq.${orgId}`,
      }, (payload) => {
        const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
        if (postId) {
          queryClient.invalidateQueries({ queryKey: ['post-reactions', postId] });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comment_reactions',
        filter: `organization_id=eq.${orgId}`,
      }, (payload) => {
        const commentId = (payload.new as any)?.comment_id || (payload.old as any)?.comment_id;
        if (commentId) {
          queryClient.invalidateQueries({ queryKey: ['comment-reactions', commentId] });
        }
      })

      // ── KPI ────────────────────────────────────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kpi_update_settings',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['pending-kpi-updates'] });
        queryClient.invalidateQueries({ queryKey: ['kpi-update-settings'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kpi_updates',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['pending-kpi-updates'] });
        queryClient.invalidateQueries({ queryKey: ['kpi-updates'] });
        queryClient.invalidateQueries({ queryKey: ['kpi-detail'] });
      })

      // ── WFH ────────────────────────────────────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wfh_requests',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['pending-wfh-requests'] });
        queryClient.invalidateQueries({ queryKey: ['own-pending-wfh-requests'] });
        queryClient.invalidateQueries({ queryKey: ['has-approved-wfh-today'] });
        queryClient.invalidateQueries({ queryKey: ['wfh-days'] });
      })

      // ── Workflows ──────────────────────────────────────────
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'employee_workflows',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-workflows'] });
        queryClient.invalidateQueries({ queryKey: ['employee-workflows'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'employee_workflow_tasks',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-workflows'] });
        queryClient.invalidateQueries({ queryKey: ['employee-workflow-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['my-workflow-tasks'] });
      })

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);
};
