/**
 * Hook to fetch office attendance settings for the current employee.
 * Returns the employee's office-level attendance config, falling back to defaults.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

export interface MyOfficeAttendanceSettings {
  attendance_enabled: boolean;
  multi_session_enabled: boolean;
  max_sessions_per_day: number;
  early_checkout_reason_required: boolean;
  office_checkin_methods: string[];
  hybrid_checkin_methods: string[];
  remote_checkin_methods: string[];
  location_radius_meters: number;
  auto_checkout_enabled: boolean;
  auto_checkout_after_minutes: number;
}

const DEFAULTS: MyOfficeAttendanceSettings = {
  attendance_enabled: true,
  multi_session_enabled: true,
  max_sessions_per_day: 3,
  early_checkout_reason_required: true,
  office_checkin_methods: ['qr'],
  hybrid_checkin_methods: ['qr', 'remote'],
  remote_checkin_methods: ['remote'],
  location_radius_meters: 100,
  auto_checkout_enabled: false,
  auto_checkout_after_minutes: 60,
};

export const useMyOfficeAttendanceSettings = () => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['my-office-attendance-settings', user?.id, currentOrg?.id],
    queryFn: async (): Promise<MyOfficeAttendanceSettings> => {
      if (!user?.id || !currentOrg?.id) return DEFAULTS;

      // Get employee's office_id
      const { data: employee } = await supabase
        .from('employees')
        .select('id, office_id')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrg.id)
        .maybeSingle();

      if (!employee?.office_id) {
        // No office assigned — fall back to org-level settings
        const { data: org } = await supabase
          .from('organizations')
          .select('multi_session_enabled, max_sessions_per_day, early_checkout_reason_required')
          .eq('id', currentOrg.id)
          .single();

        return {
          ...DEFAULTS,
          multi_session_enabled: org?.multi_session_enabled ?? DEFAULTS.multi_session_enabled,
          max_sessions_per_day: org?.max_sessions_per_day ?? DEFAULTS.max_sessions_per_day,
          early_checkout_reason_required: org?.early_checkout_reason_required ?? DEFAULTS.early_checkout_reason_required,
        };
      }

      // Get office-level settings
      const { data: settings } = await supabase
        .from('office_attendance_settings')
        .select('*')
        .eq('office_id', employee.office_id)
        .maybeSingle();

      if (!settings) {
        // Office exists but no settings configured — fall back to org-level
        const { data: org } = await supabase
          .from('organizations')
          .select('multi_session_enabled, max_sessions_per_day, early_checkout_reason_required')
          .eq('id', currentOrg.id)
          .single();

        return {
          ...DEFAULTS,
          multi_session_enabled: org?.multi_session_enabled ?? DEFAULTS.multi_session_enabled,
          max_sessions_per_day: org?.max_sessions_per_day ?? DEFAULTS.max_sessions_per_day,
          early_checkout_reason_required: org?.early_checkout_reason_required ?? DEFAULTS.early_checkout_reason_required,
        };
      }

      return {
        attendance_enabled: settings.attendance_enabled ?? true,
        multi_session_enabled: settings.multi_session_enabled,
        max_sessions_per_day: settings.max_sessions_per_day,
        early_checkout_reason_required: settings.early_checkout_reason_required,
        office_checkin_methods: settings.office_checkin_methods || DEFAULTS.office_checkin_methods,
        hybrid_checkin_methods: settings.hybrid_checkin_methods || DEFAULTS.hybrid_checkin_methods,
        remote_checkin_methods: settings.remote_checkin_methods || DEFAULTS.remote_checkin_methods,
        location_radius_meters: settings.location_radius_meters,
        auto_checkout_enabled: settings.auto_checkout_enabled,
        auto_checkout_after_minutes: settings.auto_checkout_after_minutes,
      };
    },
    enabled: !!user?.id && !!currentOrg?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
