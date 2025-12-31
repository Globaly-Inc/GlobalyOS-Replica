/**
 * Attendance domain service hooks
 * Handles all attendance-related data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';
import { format } from 'date-fns';
import type { 
  AttendanceRecord, 
  AttendanceRecordWithEmployee,
  AttendanceHourBalance,
} from '@/types';

// Fetch today's attendance for current employee
export const useTodayAttendance = () => {
  const { data: currentEmployee } = useCurrentEmployee();
  // Use UTC date to match database storage (which uses CURRENT_DATE in UTC)
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['today-attendance', currentEmployee?.id, today],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (!currentEmployee?.id) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', currentEmployee.id)
        .eq('date', today)
        .order('check_in_time', { ascending: true });

      if (error) throw error;

      return data as AttendanceRecord[];
    },
    enabled: !!currentEmployee?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Fetch attendance records for an employee
interface UseAttendanceRecordsOptions {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}

export const useAttendanceRecords = (options: UseAttendanceRecordsOptions = {}) => {
  const { currentOrg } = useOrganization();
  const { employeeId, startDate, endDate } = options;

  return useQuery({
    queryKey: ['attendance-records', currentOrg?.id, employeeId, startDate, endDate],
    queryFn: async (): Promise<AttendanceRecordWithEmployee[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          employee:employees!attendance_records_employee_id_fkey(
            id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as AttendanceRecordWithEmployee[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Fetch hour balances for an employee
export const useAttendanceHourBalance = (employeeId: string | undefined, year?: number) => {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['attendance-hour-balance', employeeId, currentYear],
    queryFn: async (): Promise<AttendanceHourBalance | null> => {
      if (!employeeId) return null;

      const { data, error } = await supabase
        .from('attendance_hour_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) throw error;

      return data as AttendanceHourBalance | null;
    },
    enabled: !!employeeId,
  });
};

// QR Code check-in/check-out
interface QRAttendanceInput {
  action: 'check_in' | 'check_out';
  qrCode: string;
  latitude?: number;
  longitude?: number;
}

export const useQRAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, qrCode, latitude, longitude }: QRAttendanceInput) => {
      const { data, error } = await supabase
        .rpc('validate_qr_and_record_attendance', {
          _action: action,
          _qr_code: qrCode,
          _user_latitude: latitude,
          _user_longitude: longitude,
        });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; action?: string; time?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to record attendance');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      toast.success(`${result.action === 'check_in' ? 'Checked in' : 'Checked out'} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Manual attendance update (HR/Admin)
interface ManualAttendanceInput {
  employeeId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  notes?: string;
}

export const useManualAttendance = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (input: ManualAttendanceInput) => {
      if (!currentOrg?.id) throw new Error('Not authenticated');

      // Check if record exists
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('employee_id', input.employeeId)
        .eq('date', input.date)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('attendance_records')
          .update({
            check_in_time: input.checkInTime,
            check_out_time: input.checkOutTime,
            status: input.status,
            notes: input.notes,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: input.employeeId,
            organization_id: currentOrg.id,
            date: input.date,
            check_in_time: input.checkInTime,
            check_out_time: input.checkOutTime,
            status: input.status,
            notes: input.notes,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      toast.success('Attendance record updated');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update attendance');
      toast.error(message);
      console.error('Manual attendance error:', error);
    },
  });
};

// Get active check-in status
export const useCheckInStatus = () => {
  const { data: currentEmployee } = useCurrentEmployee();
  // Use UTC date to match database storage (which uses CURRENT_DATE in UTC)
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['check-in-status', currentEmployee?.id, today],
    queryFn: async () => {
      if (!currentEmployee?.id) return { isCheckedIn: false, sessions: 0 };

      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, check_in_time, check_out_time')
        .eq('employee_id', currentEmployee.id)
        .eq('date', today);

      if (error) throw error;

      const activeSession = data?.find(r => r.check_in_time && !r.check_out_time);
      
      return {
        isCheckedIn: !!activeSession,
        activeSessionId: activeSession?.id,
        checkInTime: activeSession?.check_in_time,
        sessions: data?.length || 0,
      };
    },
    enabled: !!currentEmployee?.id,
    refetchInterval: 30000,
  });
};
