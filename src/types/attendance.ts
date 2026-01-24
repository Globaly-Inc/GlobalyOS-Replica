/**
 * Attendance tracking type definitions
 */

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  organization_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  work_hours: number | null;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 
  | 'present' 
  | 'absent' 
  | 'late' 
  | 'half_day' 
  | 'remote';

export interface AttendanceRecordWithEmployee extends AttendanceRecord {
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface AttendanceHourBalance {
  id: string;
  employee_id: string;
  organization_id: string;
  overtime_minutes: number;
  undertime_minutes: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceLeaveAdjustment {
  id: string;
  employee_id: string;
  organization_id: string;
  office_leave_type_id: string;
  adjustment_type: 'overtime_credit' | 'undertime_deduction';
  days_adjusted: number;
  minutes_converted: number;
  attendance_date: string;
  notes: string | null;
  created_at: string;
}

export interface OfficeQRCode {
  id: string;
  office_id: string;
  organization_id: string;
  code: string;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number | null;
  created_by: string;
  created_at: string;
}

// Daily summary
export interface AttendanceSummary {
  employee_id: string;
  month: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  avg_work_hours: number;
  total_work_hours: number;
}
