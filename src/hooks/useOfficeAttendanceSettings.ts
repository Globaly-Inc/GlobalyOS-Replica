 /**
  * Hook for managing office-level attendance settings
  */
 
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 export interface OfficeAttendanceSettings {
   id: string;
   office_id: string;
   organization_id: string;
   attendance_enabled: boolean;
   multi_session_enabled: boolean;
   max_sessions_per_day: number;
   early_checkout_reason_required: boolean;
   auto_adjustments_enabled: boolean;
   overtime_credit_leave_type_id: string | null;
   undertime_debit_leave_type_id: string | null;
   undertime_fallback_leave_type_id: string | null;
   max_dil_days: number | null;
   min_overtime_minutes: number;
   min_undertime_minutes: number;
   auto_checkout_enabled: boolean;
   auto_checkout_after_minutes: number;
   auto_checkout_status: string;
   office_checkin_methods: string[];
   hybrid_checkin_methods: string[];
   remote_checkin_methods: string[];
   require_location_for_office: boolean;
   require_location_for_hybrid: boolean;
   location_radius_meters: number;
   created_at: string;
   updated_at: string;
 }
 
 export interface OfficeAttendanceExemption {
   id: string;
   office_id: string;
   employee_id: string;
   organization_id: string;
   exempted_at: string;
   exempted_by: string | null;
   reason: string | null;
   created_at: string;
   employee?: {
     id: string;
     position: string | null;
     profiles: {
       full_name: string;
       avatar_url: string | null;
     };
   };
 }
 
 export const useOfficeAttendanceSettings = (officeId: string | undefined) => {
   return useQuery({
     queryKey: ['office-attendance-settings', officeId],
     queryFn: async (): Promise<OfficeAttendanceSettings | null> => {
       if (!officeId) return null;
 
       const { data, error } = await supabase
         .from('office_attendance_settings')
         .select('*')
         .eq('office_id', officeId)
         .maybeSingle();
 
       if (error) throw error;
       return data as OfficeAttendanceSettings | null;
     },
     enabled: !!officeId,
   });
 };
 
 export const useUpdateOfficeAttendanceSettings = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ 
       officeId, 
       settings 
     }: { 
       officeId: string; 
       settings: Partial<Omit<OfficeAttendanceSettings, 'id' | 'office_id' | 'organization_id' | 'created_at' | 'updated_at'>> 
     }) => {
       const { error } = await supabase
         .from('office_attendance_settings')
         .update(settings)
         .eq('office_id', officeId);
 
       if (error) throw error;
     },
     onSuccess: (_, { officeId }) => {
       queryClient.invalidateQueries({ queryKey: ['office-attendance-settings', officeId] });
       toast.success('Attendance settings saved');
     },
     onError: (error: Error) => {
       toast.error(error.message || 'Failed to save attendance settings');
     },
   });
 };
 
 export const useOfficeAttendanceExemptions = (officeId: string | undefined) => {
   return useQuery({
     queryKey: ['office-attendance-exemptions', officeId],
     queryFn: async (): Promise<OfficeAttendanceExemption[]> => {
       if (!officeId) return [];
 
       const { data, error } = await supabase
         .from('office_attendance_exemptions')
         .select(`
           *,
           employee:employees!office_attendance_exemptions_employee_id_fkey(
             id,
             position,
             profiles!inner(
               full_name,
               avatar_url
             )
           )
         `)
         .eq('office_id', officeId)
         .order('exempted_at', { ascending: false });
 
       if (error) throw error;
       return data as OfficeAttendanceExemption[];
     },
     enabled: !!officeId,
   });
 };
 
 export const useAddAttendanceExemption = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ 
       officeId, 
       employeeId, 
       organizationId,
       exemptedBy,
       reason 
     }: { 
       officeId: string;
       employeeId: string;
       organizationId: string;
       exemptedBy?: string;
       reason?: string;
     }) => {
       const { error } = await supabase
         .from('office_attendance_exemptions')
         .insert({
           office_id: officeId,
           employee_id: employeeId,
           organization_id: organizationId,
           exempted_by: exemptedBy,
           reason,
         });
 
       if (error) throw error;
     },
     onSuccess: (_, { officeId }) => {
       queryClient.invalidateQueries({ queryKey: ['office-attendance-exemptions', officeId] });
       toast.success('Employee exempted from check-in');
     },
     onError: (error: Error) => {
       if (error.message.includes('duplicate')) {
         toast.error('Employee is already exempted');
       } else {
         toast.error(error.message || 'Failed to add exemption');
       }
     },
   });
 };
 
 export const useRemoveAttendanceExemption = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ exemptionId, officeId }: { exemptionId: string; officeId: string }) => {
       const { error } = await supabase
         .from('office_attendance_exemptions')
         .delete()
         .eq('id', exemptionId);
 
       if (error) throw error;
       return officeId;
     },
     onSuccess: (officeId) => {
       queryClient.invalidateQueries({ queryKey: ['office-attendance-exemptions', officeId] });
       toast.success('Exemption removed');
     },
     onError: (error: Error) => {
       toast.error(error.message || 'Failed to remove exemption');
     },
   });
 };