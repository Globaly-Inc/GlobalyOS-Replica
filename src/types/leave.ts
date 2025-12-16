/**
 * Leave management type definitions
 */

export interface LeaveType {
  id: string;
  organization_id: string;
  name: string;
  category: LeaveCategory;
  description: string | null;
  default_days: number | null;
  min_days_advance: number;
  applies_to_all_offices: boolean;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type LeaveCategory = 'paid' | 'unpaid';

export interface LeaveTypeBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  organization_id: string;
  balance: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveTypeBalanceWithType extends LeaveTypeBalance {
  leave_type: LeaveType;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  organization_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day_type: HalfDayType;
  reason: string;
  status: LeaveRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';
export type HalfDayType = 'full' | 'first_half' | 'second_half';

export interface LeaveRequestWithEmployee extends LeaveRequest {
  employee: {
    id: string;
    manager_id: string | null;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  reviewer?: {
    profiles: {
      full_name: string;
    };
  } | null;
}

export interface LeaveBalanceLog {
  id: string;
  employee_id: string;
  organization_id: string;
  leave_type: string;
  change_amount: number;
  previous_balance: number;
  new_balance: number;
  reason: string | null;
  created_by: string;
  created_at: string;
  effective_date: string | null;
}
