/**
 * KPI Updates service hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import type { KpiUpdate, KpiUpdateSettings, KpiWithUpdates, KpiReminderFrequency } from '@/types';

// Fetch a single KPI with all its details
export const useKpiDetail = (kpiId: string | undefined) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['kpi-detail', kpiId],
    queryFn: async (): Promise<KpiWithUpdates | null> => {
      if (!kpiId || !currentOrg?.id) return null;

      // Fetch KPI
      const { data: kpi, error: kpiError } = await supabase
        .from('kpis')
        .select(`
          *,
          employee:employees!kpis_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq('id', kpiId)
        .eq('organization_id', currentOrg.id)
        .maybeSingle();

      if (kpiError) throw kpiError;
      if (!kpi) return null;

      // Fetch updates
      const { data: updates } = await supabase
        .from('kpi_updates')
        .select(`
          *,
          employee:employees!kpi_updates_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq('kpi_id', kpiId)
        .order('created_at', { ascending: false });

      // Fetch settings
      const { data: settings } = await supabase
        .from('kpi_update_settings')
        .select('*')
        .eq('kpi_id', kpiId)
        .maybeSingle();

      return {
        ...kpi,
        updates: updates || [],
        update_settings: settings,
      } as unknown as KpiWithUpdates;
    },
    enabled: !!kpiId && !!currentOrg?.id,
  });
};

// Fetch updates for a KPI
export const useKpiUpdates = (kpiId: string | undefined) => {
  return useQuery({
    queryKey: ['kpi-updates', kpiId],
    queryFn: async (): Promise<KpiUpdate[]> => {
      if (!kpiId) return [];

      const { data, error } = await supabase
        .from('kpi_updates')
        .select(`
          *,
          employee:employees!kpi_updates_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq('kpi_id', kpiId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as KpiUpdate[];
    },
    enabled: !!kpiId,
  });
};

// Add a KPI update
interface AddKpiUpdateInput {
  kpiId: string;
  previousValue: number | null;
  newValue: number | null;
  notes: string;
  statusBefore: string | null;
  statusAfter: string | null;
}

export const useAddKpiUpdate = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: AddKpiUpdateInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('kpi_updates')
        .insert({
          kpi_id: input.kpiId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          previous_value: input.previousValue,
          new_value: input.newValue,
          notes: input.notes,
          status_before: input.statusBefore,
          status_after: input.statusAfter,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-updates', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['employee-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['team-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['pending-kpi-updates'] });
      toast.success('KPI updated successfully');
    },
    onError: () => {
      toast.error('Failed to add update');
    },
  });
};

// Delete a KPI update
export const useDeleteKpiUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updateId, kpiId }: { updateId: string; kpiId: string }) => {
      const { error } = await supabase
        .from('kpi_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;
      return kpiId;
    },
    onSuccess: (kpiId) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-updates', kpiId] });
      toast.success('Update deleted');
    },
    onError: () => {
      toast.error('Failed to delete update');
    },
  });
};

// Fetch KPI update settings
export const useKpiUpdateSettings = (kpiId: string | undefined) => {
  return useQuery({
    queryKey: ['kpi-update-settings', kpiId],
    queryFn: async (): Promise<KpiUpdateSettings | null> => {
      if (!kpiId) return null;

      const { data, error } = await supabase
        .from('kpi_update_settings')
        .select('*')
        .eq('kpi_id', kpiId)
        .maybeSingle();

      if (error) throw error;
      return data as KpiUpdateSettings | null;
    },
    enabled: !!kpiId,
  });
};

// Save KPI update settings
interface SaveSettingsInput {
  kpiId: string;
  frequency: KpiReminderFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  reminderTime: string;
  isEnabled: boolean;
}

export const useSaveKpiUpdateSettings = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: SaveSettingsInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      // Calculate next reminder based on settings
      const nextReminder = calculateNextReminder(
        input.frequency,
        input.dayOfWeek,
        input.dayOfMonth,
        input.reminderTime
      );

      const { error } = await supabase
        .from('kpi_update_settings')
        .upsert({
          kpi_id: input.kpiId,
          organization_id: currentOrg.id,
          frequency: input.frequency,
          day_of_week: input.dayOfWeek ?? null,
          day_of_month: input.dayOfMonth ?? null,
          reminder_time: input.reminderTime,
          is_enabled: input.isEnabled,
          next_reminder_at: input.isEnabled ? nextReminder : null,
          created_by: currentEmployee.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'kpi_id',
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-update-settings', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['pending-kpi-updates'] });
      toast.success('Reminder settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });
};

// Fetch pending KPI updates (for home sidebar)
export const usePendingKpiUpdates = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['pending-kpi-updates', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const now = new Date().toISOString();

      // Get KPIs with due reminders that the current user owns or is part of
      const { data: settings, error } = await supabase
        .from('kpi_update_settings')
        .select(`
          *,
          kpi:kpis!inner(
            id,
            title,
            description,
            current_value,
            target_value,
            unit,
            status,
            employee_id,
            scope_type,
            scope_department,
            scope_office_id,
            scope_project_id
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('is_enabled', true)
        .lte('next_reminder_at', now);

      if (error) throw error;

      // Filter to KPIs the current user should see reminders for
      const filtered = (settings || []).filter((s: any) => {
        const kpi = s.kpi;
        if (!kpi) return false;

        // Individual KPI owned by user
        if (kpi.employee_id === currentEmployee.id) return true;

        // Group KPI - check membership
        if (kpi.scope_type === 'department' && kpi.scope_department === currentEmployee.department) return true;
        if (kpi.scope_type === 'office' && kpi.scope_office_id === currentEmployee.office_id) return true;
        // For project KPIs, we'd need to check employee_projects table
        // Simplified: just show individual for now

        return false;
      });

      return filtered.map((s: any) => ({
        id: s.id,
        kpi_id: s.kpi_id,
        next_reminder_at: s.next_reminder_at,
        kpi: s.kpi,
      }));
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

// Snooze a KPI reminder
export const useSnoozeKpiReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kpiId, hours = 24 }: { kpiId: string; hours?: number }) => {
      const nextReminder = new Date();
      nextReminder.setHours(nextReminder.getHours() + hours);

      const { error } = await supabase
        .from('kpi_update_settings')
        .update({
          next_reminder_at: nextReminder.toISOString(),
        })
        .eq('kpi_id', kpiId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-kpi-updates'] });
      toast.success('Reminder snoozed for 24 hours');
    },
    onError: () => {
      toast.error('Failed to snooze reminder');
    },
  });
};

// Helper function to calculate next reminder
function calculateNextReminder(
  frequency: KpiReminderFrequency,
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined,
  reminderTime: string
): string {
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      if (next <= now) next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      const targetDay = dayOfWeek ?? 1; // Default Monday
      const currentDay = next.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0 || (daysToAdd === 0 && next <= now)) {
        daysToAdd += 7;
      }
      next.setDate(next.getDate() + daysToAdd);
      break;
    case 'biweekly':
      const biweeklyTargetDay = dayOfWeek ?? 1;
      const biweeklyCurrentDay = next.getDay();
      let biweeklyDaysToAdd = biweeklyTargetDay - biweeklyCurrentDay;
      if (biweeklyDaysToAdd <= 0 || (biweeklyDaysToAdd === 0 && next <= now)) {
        biweeklyDaysToAdd += 14;
      }
      next.setDate(next.getDate() + biweeklyDaysToAdd);
      break;
    case 'monthly':
      const targetDate = dayOfMonth ?? 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
  }

  return next.toISOString();
}
