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
  attachments?: { url: string; name: string; type: string; size: number }[];
}

interface AddKpiUpdateResult {
  milestoneReached?: {
    percent: number;
    label: string;
  } | null;
}

export const useAddKpiUpdate = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: AddKpiUpdateInput): Promise<AddKpiUpdateResult> => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      // Insert the update
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
          attachments: input.attachments || [],
        });

      if (error) throw error;

      // Update KPI current value
      if (input.newValue !== null) {
        await supabase
          .from('kpis')
          .update({ 
            current_value: input.newValue,
            status: input.statusAfter || input.statusBefore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.kpiId);
      }

      // Log the activity
      await supabase.from('kpi_activity_logs').insert({
        kpi_id: input.kpiId,
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        action_type: 'progress_updated',
        description: input.notes 
          ? `Updated progress: ${input.notes}` 
          : `Updated value from ${input.previousValue ?? 0} to ${input.newValue ?? 0}`,
        old_value: { value: input.previousValue, status: input.statusBefore },
        new_value: { value: input.newValue, status: input.statusAfter },
      });

      // Check for milestone achievement
      const { data: kpi } = await supabase
        .from('kpis')
        .select('target_value, milestones')
        .eq('id', input.kpiId)
        .single();

      if (kpi && kpi.target_value && input.newValue !== null) {
        const oldProgress = input.previousValue !== null 
          ? Math.round((input.previousValue / kpi.target_value) * 100)
          : 0;
        const newProgress = Math.round((input.newValue / kpi.target_value) * 100);

        // Check if we crossed any milestone
        const milestones = (kpi.milestones as any[]) || [
          { percent: 25, label: 'Getting Started', reached: false, reached_at: null },
          { percent: 50, label: 'Halfway There', reached: false, reached_at: null },
          { percent: 75, label: 'Almost Done', reached: false, reached_at: null },
          { percent: 100, label: 'Goal Achieved!', reached: false, reached_at: null },
        ];

        const crossedMilestone = milestones.find(
          m => !m.reached && oldProgress < m.percent && newProgress >= m.percent
        );

        if (crossedMilestone) {
          // Update milestones in KPI
          const updatedMilestones = milestones.map(m => 
            m.percent === crossedMilestone.percent
              ? { ...m, reached: true, reached_at: new Date().toISOString() }
              : m
          );

          await supabase
            .from('kpis')
            .update({ milestones: updatedMilestones })
            .eq('id', input.kpiId);

          // Log milestone achievement
          await supabase.from('kpi_activity_logs').insert({
            kpi_id: input.kpiId,
            employee_id: currentEmployee.id,
            organization_id: currentOrg.id,
            action_type: 'milestone_reached',
            description: `Reached ${crossedMilestone.percent}% milestone: ${crossedMilestone.label}`,
            new_value: { percent: crossedMilestone.percent, label: crossedMilestone.label },
          });

          return { 
            milestoneReached: { 
              percent: crossedMilestone.percent, 
              label: crossedMilestone.label 
            } 
          };
        }
      }

      return { milestoneReached: null };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-updates', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-activity-logs', variables.kpiId] });
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
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ updateId, kpiId }: { updateId: string; kpiId: string }) => {
      // Get the update details before deleting for the activity log
      const { data: updateData } = await supabase
        .from('kpi_updates')
        .select('previous_value, new_value, notes')
        .eq('id', updateId)
        .single();

      const { error } = await supabase
        .from('kpi_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      // Log the deletion
      if (currentOrg?.id && currentEmployee?.id) {
        await supabase.from('kpi_activity_logs').insert({
          kpi_id: kpiId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          action_type: 'update_deleted',
          description: 'Deleted a progress update',
          old_value: updateData ? { 
            previous_value: updateData.previous_value, 
            new_value: updateData.new_value,
            notes: updateData.notes 
          } : null,
        });
      }

      return kpiId;
    },
    onSuccess: (kpiId) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-updates', kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-activity-logs', kpiId] });
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

      // Get existing settings for the activity log
      const { data: existingSettings } = await supabase
        .from('kpi_update_settings')
        .select('frequency, day_of_week, day_of_month, reminder_time, is_enabled')
        .eq('kpi_id', input.kpiId)
        .maybeSingle();

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

      // Log the activity
      const description = input.isEnabled 
        ? `Set ${input.frequency} reminder at ${input.reminderTime}`
        : 'Disabled reminders';
      
      await supabase.from('kpi_activity_logs').insert({
        kpi_id: input.kpiId,
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        action_type: 'reminder_changed',
        description,
        old_value: existingSettings ? {
          frequency: existingSettings.frequency,
          day_of_week: existingSettings.day_of_week,
          day_of_month: existingSettings.day_of_month,
          reminder_time: existingSettings.reminder_time,
          is_enabled: existingSettings.is_enabled,
        } : null,
        new_value: {
          frequency: input.frequency,
          day_of_week: input.dayOfWeek,
          day_of_month: input.dayOfMonth,
          reminder_time: input.reminderTime,
          is_enabled: input.isEnabled,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-update-settings', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-detail', variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi-activity-logs', variables.kpiId] });
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
