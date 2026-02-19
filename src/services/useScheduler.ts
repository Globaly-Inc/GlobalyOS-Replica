/**
 * Scheduler Service Hooks
 * React Query hooks for CRUD operations on the Scheduler module
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  SchedulerEventTypeRow,
  SchedulerBookingRow,
  CreateEventTypeFormData,
  DEFAULT_EVENT_CONFIG,
} from '@/types/scheduler';

// ─────────────────────────────────────────────
// EVENT TYPES
// ─────────────────────────────────────────────

export const useSchedulerEventTypes = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['scheduler_event_types', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('scheduler_event_types')
        .select(`
          *,
          hosts:scheduler_event_hosts(
            *,
            employee:employees(id, user_id, position, profiles(full_name, avatar_url))
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SchedulerEventTypeRow[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useSchedulerEventType = (id: string | null) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['scheduler_event_type', id],
    queryFn: async () => {
      if (!id || !currentOrg?.id) return null;

      const { data, error } = await supabase
        .from('scheduler_event_types')
        .select(`
          *,
          hosts:scheduler_event_hosts(
            *,
            employee:employees(id, user_id, position, profiles(full_name, avatar_url))
          )
        `)
        .eq('id', id)
        .eq('organization_id', currentOrg.id)
        .single();

      if (error) throw error;
      return data as unknown as SchedulerEventTypeRow;
    },
    enabled: !!id && !!currentOrg?.id,
  });
};

export const useCreateEventType = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: CreateEventTypeFormData) => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');

      // 1. Create event type
      const { data: eventType, error: etError } = await supabase
        .from('scheduler_event_types')
        .insert({
          organization_id: currentOrg.id,
          creator_user_id: user.id,
          type: formData.type,
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          duration_minutes: formData.duration_minutes,
          location_type: formData.location_type,
          location_value: formData.location_value || null,
          is_active: true,
          config_json: formData.config as any,
        })
        .select()
        .single();

      if (etError) throw etError;

      // 2. Create hosts
      if (formData.host_employee_ids.length > 0) {
        const hosts = formData.host_employee_ids.map((empId, idx) => ({
          event_type_id: eventType.id,
          employee_id: empId,
          is_primary: idx === 0,
          routing_weight: 1,
        }));
        const { error: hostsError } = await supabase
          .from('scheduler_event_hosts')
          .insert(hosts);
        if (hostsError) throw hostsError;
      }

      return eventType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler_event_types'] });
      toast.success('Event type created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create event type');
    },
  });
};

export const useUpdateEventType = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: Partial<CreateEventTypeFormData> }) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('scheduler_event_types')
        .update({
          ...(formData.name && { name: formData.name }),
          ...(formData.slug && { slug: formData.slug }),
          description: formData.description ?? null,
          ...(formData.duration_minutes && { duration_minutes: formData.duration_minutes }),
          ...(formData.location_type && { location_type: formData.location_type }),
          location_value: formData.location_value ?? null,
          ...(formData.config && { config_json: formData.config as any }),
        })
        .eq('id', id)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      // Replace hosts if provided
      if (formData.host_employee_ids) {
        await supabase
          .from('scheduler_event_hosts')
          .delete()
          .eq('event_type_id', id);

        if (formData.host_employee_ids.length > 0) {
          const hosts = formData.host_employee_ids.map((empId, idx) => ({
            event_type_id: id,
            employee_id: empId,
            is_primary: idx === 0,
            routing_weight: 1,
          }));
          await supabase.from('scheduler_event_hosts').insert(hosts);
        }
      }

      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler_event_types'] });
      queryClient.invalidateQueries({ queryKey: ['scheduler_event_type', id] });
      toast.success('Event type updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update event type');
    },
  });
};

export const useToggleEventTypeActive = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('scheduler_event_types')
        .update({ is_active })
        .eq('id', id)
        .eq('organization_id', currentOrg.id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler_event_types'] });
      toast.success(is_active ? 'Event type enabled' : 'Event type disabled');
    },
  });
};

export const useDeleteEventType = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('scheduler_event_types')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrg.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler_event_types'] });
      toast.success('Event type deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete event type');
    },
  });
};

export const useDuplicateEventType = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');

      // Fetch source event type + its hosts
      const { data: source, error: fetchErr } = await supabase
        .from('scheduler_event_types')
        .select('*, hosts:scheduler_event_hosts(employee_id, routing_weight, is_primary)')
        .eq('id', id)
        .eq('organization_id', currentOrg.id)
        .single();

      if (fetchErr || !source) throw fetchErr || new Error('Event type not found');

      // Generate a unique slug: base-copy, base-copy-2, etc.
      const baseSlug = `${source.slug}-copy`;
      let slug = baseSlug;
      let attempt = 1;
      while (true) {
        const { data: existing } = await supabase
          .from('scheduler_event_types')
          .select('id')
          .eq('organization_id', currentOrg.id)
          .eq('slug', slug)
          .maybeSingle();
        if (!existing) break;
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      // Insert duplicate (starts inactive so user reviews before enabling)
      const { data: newEt, error: insertErr } = await supabase
        .from('scheduler_event_types')
        .insert({
          organization_id: currentOrg.id,
          creator_user_id: user.id,
          type: source.type,
          name: `${source.name} (Copy)`,
          slug,
          description: source.description,
          duration_minutes: source.duration_minutes,
          location_type: source.location_type,
          location_value: source.location_value,
          is_active: false,
          config_json: source.config_json,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Re-create hosts on the duplicate
      const hosts = (source as any).hosts as any[];
      if (hosts?.length > 0) {
        await supabase.from('scheduler_event_hosts').insert(
          hosts.map((h: any) => ({
            event_type_id: newEt.id,
            employee_id: h.employee_id,
            routing_weight: h.routing_weight,
            is_primary: h.is_primary,
          }))
        );
      }

      return newEt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler_event_types'] });
      toast.success("Event type duplicated — it's saved as inactive so you can review it first.");
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to duplicate event type');
    },
  });
};

// ─────────────────────────────────────────────
// INTEGRATION SETTINGS
// ─────────────────────────────────────────────

export const useIntegrationSettings = () => {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scheduler_integration_settings', currentOrg?.id, user?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from('scheduler_integration_settings')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && !!user?.id,
  });
};

export const useUpdateIntegrationSettings = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: { is_google_meet_enabled?: boolean }) => {
      if (!currentOrg?.id || !user?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('scheduler_integration_settings')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('scheduler_integration_settings')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scheduler_integration_settings')
          .insert({
            organization_id: currentOrg.id,
            user_id: user.id,
            provider: 'google',
            is_google_meet_enabled: updates.is_google_meet_enabled ?? false,
            availability_calendar_ids: [],
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler_integration_settings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });
};

// ─────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────

export type BookingStatusFilter = 'upcoming' | 'past' | 'canceled';

export const useSchedulerBookings = (statusFilter: BookingStatusFilter = 'upcoming') => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['scheduler_bookings', currentOrg?.id, statusFilter],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('scheduler_bookings')
        .select(`
          *,
          event_type:scheduler_event_types(id, name, type, duration_minutes, location_type),
          host_employee:employees(id, first_name, last_name, avatar_url)
        `)
        .eq('organization_id', currentOrg.id);

      const now = new Date().toISOString();

      if (statusFilter === 'upcoming') {
        query = query
          .in('status', ['scheduled'])
          .gte('start_at_utc', now)
          .order('start_at_utc', { ascending: true });
      } else if (statusFilter === 'past') {
        query = query
          .in('status', ['scheduled', 'completed', 'no_show'])
          .lt('start_at_utc', now)
          .order('start_at_utc', { ascending: false });
      } else {
        query = query
          .eq('status', 'canceled')
          .order('start_at_utc', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SchedulerBookingRow[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('scheduler_bookings')
        .update({ status })
        .eq('id', id)
        .eq('organization_id', currentOrg.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler_bookings'] });
      toast.success('Booking updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update booking');
    },
  });
};
