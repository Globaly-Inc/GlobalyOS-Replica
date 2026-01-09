/**
 * Real-time subscriptions for leave management
 * Handles live updates for leave balances, requests, and logs
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * Unified real-time subscription for all leave updates (org-wide)
 * Use for admin/HR views
 */
export const useLeaveRealtime = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel('leave-unified-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_type_balances',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
          queryClient.invalidateQueries({ queryKey: ['leave-type-balances'] });
          queryClient.invalidateQueries({ queryKey: ['leave-type-balances-profile'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_balance_logs',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leave-balance-logs'] });
          queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
          queryClient.invalidateQueries({ queryKey: ['employee-leave-requests'] });
          queryClient.invalidateQueries({ queryKey: ['pending-leave-approvals'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);
};

/**
 * Employee-specific balance subscription
 * Use for individual employee views (Leave page, profile)
 */
export const useLeaveBalanceRealtime = (employeeId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!employeeId) return;

    const channel = supabase
      .channel(`leave-balance-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_type_balances',
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leave-balances', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['leave-type-balances', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['leave-type-balances-profile', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_balance_logs',
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leave-balance-logs', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['leave-balance-logs'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leave-requests', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['employee-leave-requests', employeeId] });
          queryClient.invalidateQueries({ queryKey: ['employee-leave-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, queryClient]);
};
