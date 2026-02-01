/**
 * Employee Activity Timeline Hook
 * Fetches unified activity timeline for an employee with access control
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ActivityTimelineEvent, 
  UseActivityTimelineOptions 
} from '@/types/activity';
import type { Json } from '@/integrations/supabase/types';

const DEFAULT_PAGE_SIZE = 50;

/**
 * Fetch employee activity timeline with pagination
 */
export const useEmployeeActivityTimeline = (options: UseActivityTimelineOptions) => {
  const { employeeId, limit = DEFAULT_PAGE_SIZE, offset = 0, filters } = options;

  return useQuery({
    queryKey: ['employee-activity-timeline', employeeId, limit, offset, filters],
    queryFn: async () => {
      if (!employeeId) return [];

      // Use raw SQL query via RPC
      const { data, error } = await supabase.rpc(
        'get_employee_activity_timeline' as any,
        {
          target_employee_id: employeeId,
          p_limit: limit,
          p_offset: offset,
          p_event_types: filters?.eventTypes || null,
          p_start_date: filters?.startDate || null,
          p_end_date: filters?.endDate || null,
        }
      );

      if (error) {
        console.error('Error fetching activity timeline:', error);
        throw error;
      }

      return (data || []) as unknown as ActivityTimelineEvent[];
    },
    enabled: !!employeeId,
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Fetch employee activity timeline with infinite scroll
 */
export const useInfiniteEmployeeActivityTimeline = (
  employeeId: string | undefined,
  filters?: UseActivityTimelineOptions['filters']
) => {
  return useInfiniteQuery({
    queryKey: ['employee-activity-timeline-infinite', employeeId, filters],
    queryFn: async ({ pageParam = 0 }) => {
      if (!employeeId) return { events: [], nextOffset: null };

      const { data, error } = await supabase.rpc(
        'get_employee_activity_timeline' as any,
        {
          target_employee_id: employeeId,
          p_limit: DEFAULT_PAGE_SIZE,
          p_offset: pageParam,
          p_event_types: filters?.eventTypes || null,
          p_start_date: filters?.startDate || null,
          p_end_date: filters?.endDate || null,
        }
      );

      if (error) {
        console.error('Error fetching activity timeline:', error);
        throw error;
      }

      const events = (data || []) as unknown as ActivityTimelineEvent[];
      const nextOffset = events.length === DEFAULT_PAGE_SIZE ? pageParam + DEFAULT_PAGE_SIZE : null;

      return { events, nextOffset };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
};

/**
 * Log an activity event to user_activity_logs
 * Use this helper in services to log employee activities
 */
export async function logEmployeeActivity({
  userId,
  organizationId,
  activityType,
  entityType,
  entityId,
  metadata = {},
}: {
  userId: string;
  organizationId: string;
  activityType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.from('user_activity_logs').insert([{
      user_id: userId,
      organization_id: organizationId,
      activity_type: activityType,
      entity_type: entityType || 'employee',
      entity_id: entityId,
      metadata: metadata as Json,
    }]);
  } catch (e) {
    // Non-fatal: don't interrupt the main operation
    console.error('Activity logging error:', e);
  }
}
