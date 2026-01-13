import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ErrorLog, 
  ErrorLogFilters, 
  ErrorLogStatus,
  ErrorAnalyticsSummary,
  ErrorTrendDataPoint,
  ErrorsByType,
  TopErrorMessage,
  ErrorsByOrg 
} from '@/types/errorLogs';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

/**
 * Fetch all error logs with filters
 */
export const useAllErrorLogs = (filters?: ErrorLogFilters) => {
  return useQuery({
    queryKey: ['error-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('user_error_logs')
        .select(`
          *,
          profiles(full_name, email, avatar_url),
          organizations(name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters?.errorType) {
        query = query.eq('error_type', filters.errorType);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }
      if (filters?.search) {
        query = query.ilike('error_message', `%${filters.search}%`);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data || []) as unknown as ErrorLog[];
    },
  });
};

/**
 * Get error log statistics summary
 */
export const useErrorLogStats = () => {
  return useQuery({
    queryKey: ['error-log-stats'],
    queryFn: async (): Promise<ErrorAnalyticsSummary> => {
      const now = new Date();
      const yesterday = subDays(now, 1);
      const twoDaysAgo = subDays(now, 2);

      // Get counts for last 24 hours
      const { count: total24h } = await supabase
        .from('user_error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      // Get counts for previous 24 hours (for comparison)
      const { count: totalPrevious } = await supabase
        .from('user_error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoDaysAgo.toISOString())
        .lt('created_at', yesterday.toISOString());

      // Get critical count
      const { count: critical } = await supabase
        .from('user_error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .gte('created_at', yesterday.toISOString());

      // Get affected users count
      const { data: usersData } = await supabase
        .from('user_error_logs')
        .select('user_id')
        .not('user_id', 'is', null)
        .gte('created_at', yesterday.toISOString());
      const affectedUsers = new Set(usersData?.map(d => d.user_id)).size;

      // Get affected orgs count
      const { data: orgsData } = await supabase
        .from('user_error_logs')
        .select('organization_id')
        .not('organization_id', 'is', null)
        .gte('created_at', yesterday.toISOString());
      const affectedOrgs = new Set(orgsData?.map(d => d.organization_id)).size;

      // Calculate change percentage
      const prev = totalPrevious || 0;
      const curr = total24h || 0;
      const totalChange = prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);

      return {
        total24h: curr,
        totalChange,
        critical: critical || 0,
        affectedUsers,
        affectedOrgs,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

/**
 * Get error trend data for charts
 */
export const useErrorTrendData = (days: number = 7) => {
  return useQuery({
    queryKey: ['error-trend', days],
    queryFn: async (): Promise<ErrorTrendDataPoint[]> => {
      const startDate = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from('user_error_logs')
        .select('created_at, severity')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped = new Map<string, { critical: number; error: number; warning: number }>();
      
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
        grouped.set(date, { critical: 0, error: 0, warning: 0 });
      }

      data?.forEach(log => {
        const date = format(new Date(log.created_at), 'yyyy-MM-dd');
        const existing = grouped.get(date);
        if (existing) {
          if (log.severity === 'critical') existing.critical++;
          else if (log.severity === 'error') existing.error++;
          else existing.warning++;
        }
      });

      return Array.from(grouped.entries()).map(([date, counts]) => ({
        date,
        ...counts,
      }));
    },
  });
};

/**
 * Get error distribution by type
 */
export const useErrorsByType = () => {
  return useQuery({
    queryKey: ['errors-by-type'],
    queryFn: async (): Promise<ErrorsByType[]> => {
      const yesterday = subDays(new Date(), 1);
      
      const { data, error } = await supabase
        .from('user_error_logs')
        .select('error_type')
        .gte('created_at', yesterday.toISOString());

      if (error) throw error;

      const counts = new Map<string, number>();
      data?.forEach(log => {
        counts.set(log.error_type, (counts.get(log.error_type) || 0) + 1);
      });

      const total = data?.length || 1;
      return Array.from(counts.entries()).map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / total) * 100),
      }));
    },
  });
};

/**
 * Get top error messages
 */
export const useTopErrorMessages = (limit: number = 10) => {
  return useQuery({
    queryKey: ['top-errors', limit],
    queryFn: async (): Promise<TopErrorMessage[]> => {
      const weekAgo = subDays(new Date(), 7);
      
      const { data, error } = await supabase
        .from('user_error_logs')
        .select('error_message, created_at')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by message (first 100 chars for grouping)
      const grouped = new Map<string, { count: number; lastOccurred: string }>();
      
      data?.forEach(log => {
        const key = log.error_message.substring(0, 100);
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, { count: 1, lastOccurred: log.created_at });
        } else {
          existing.count++;
          if (log.created_at > existing.lastOccurred) {
            existing.lastOccurred = log.created_at;
          }
        }
      });

      return Array.from(grouped.entries())
        .map(([message, data]) => ({ message, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
  });
};

/**
 * Get errors by organization
 */
export const useErrorsByOrganization = (limit: number = 10) => {
  return useQuery({
    queryKey: ['errors-by-org', limit],
    queryFn: async (): Promise<ErrorsByOrg[]> => {
      const weekAgo = subDays(new Date(), 7);
      
      const { data, error } = await supabase
        .from('user_error_logs')
        .select('organization_id, severity, organizations:organization_id(name)')
        .not('organization_id', 'is', null)
        .gte('created_at', weekAgo.toISOString());

      if (error) throw error;

      const grouped = new Map<string, { orgName: string; count: number; criticalCount: number }>();
      
      data?.forEach(log => {
        const orgId = log.organization_id!;
        const orgName = (log.organizations as any)?.name || 'Unknown';
        const existing = grouped.get(orgId);
        
        if (!existing) {
          grouped.set(orgId, {
            orgName,
            count: 1,
            criticalCount: log.severity === 'critical' ? 1 : 0,
          });
        } else {
          existing.count++;
          if (log.severity === 'critical') existing.criticalCount++;
        }
      });

      return Array.from(grouped.entries())
        .map(([orgId, data]) => ({ orgId, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
  });
};

/**
 * Update error log status
 */
export const useUpdateErrorLogStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      resolutionNotes 
    }: { 
      id: string; 
      status: ErrorLogStatus; 
      resolutionNotes?: string 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: Record<string, unknown> = { status };
      
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }
      
      if (resolutionNotes) {
        updates.resolution_notes = resolutionNotes;
      }

      const { error } = await supabase
        .from('user_error_logs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['error-log-stats'] });
    },
  });
};

/**
 * Bulk update error log statuses
 */
export const useBulkUpdateErrorLogStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      ids, 
      status 
    }: { 
      ids: string[]; 
      status: ErrorLogStatus 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: Record<string, unknown> = { status };
      
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from('user_error_logs')
        .update(updates)
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['error-log-stats'] });
    },
  });
};

/**
 * Real-time subscription for error logs
 * Invalidates all related queries on INSERT, UPDATE, DELETE
 */
export const useErrorLogsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('error-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_error_logs',
        },
        (payload) => {
          console.log('Error log realtime update:', payload.eventType);
          // Invalidate all error-related queries
          queryClient.invalidateQueries({ queryKey: ['error-logs'] });
          queryClient.invalidateQueries({ queryKey: ['error-log-stats'] });
          queryClient.invalidateQueries({ queryKey: ['error-trend'] });
          queryClient.invalidateQueries({ queryKey: ['errors-by-type'] });
          queryClient.invalidateQueries({ queryKey: ['top-errors'] });
          queryClient.invalidateQueries({ queryKey: ['errors-by-org'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
