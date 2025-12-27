/**
 * Employee-related type definitions
 */

import type { Profile, Office, Project } from './organization';

export type EmployeeStatus = 'invited' | 'active' | 'inactive';

export interface Employee {
  id: string;
  user_id: string;
  organization_id: string;
  position: string;
  department: string;
  office_id: string | null;
  manager_id: string | null;
  join_date: string;
  status: EmployeeStatus;
  superpowers: string[] | null;
  
  // Personal info
  phone: string | null;
  personal_email: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  
  // Address
  street: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  
  // Financial (sensitive - role-restricted)
  salary: number | null;
  remuneration: number | null;
  remuneration_currency: string | null;
  id_number: string | null;
  tax_number: string | null;
  bank_details: string | null;
  
  // Emergency contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  
  // Position tracking
  position_effective_date: string | null;
  
  created_at: string;
  updated_at: string;
}

// Extended employee with relations
export interface EmployeeWithProfile extends Employee {
  profiles: Profile;
}

export interface EmployeeWithRelations extends EmployeeWithProfile {
  office?: Office | null;
  manager?: EmployeeWithProfile | null;
  direct_reports?: EmployeeWithProfile[];
  projects?: Project[];
}

// For directory listing (limited data)
export interface EmployeeDirectoryItem {
  id: string;
  position: string;
  department: string;
  status: EmployeeStatus;
  join_date: string;
  office_id: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  office?: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
  } | null;
}

// Position history
export interface PositionHistory {
  id: string;
  employee_id: string;
  organization_id: string;
  position: string;
  department: string;
  salary: number | null;
  manager_id: string | null;
  effective_date: string;
  end_date: string | null;
  change_type: PositionChangeType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PositionChangeType = 
  | 'hire' 
  | 'promotion' 
  | 'lateral_move' 
  | 'salary_increase' 
  | 'demotion' 
  | 'transfer';

// Employee schedule
export interface EmployeeSchedule {
  id: string;
  employee_id: string;
  organization_id: string;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  created_at: string;
  updated_at: string;
}

// Learning & Development
export interface LearningDevelopment {
  id: string;
  employee_id: string;
  organization_id: string;
  type: LearningType;
  title: string;
  provider: string | null;
  status: LearningStatus;
  description: string | null;
  completion_date: string | null;
  expiry_date: string | null;
  cost: number | null;
  created_at: string;
  updated_at: string;
}

export type LearningType = 
  | 'course' 
  | 'certification' 
  | 'workshop' 
  | 'conference' 
  | 'book' 
  | 'other';

export type LearningStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'expired';

// Achievement
export interface Achievement {
  id: string;
  employee_id: string;
  organization_id: string;
  title: string;
  description: string;
  achieved_at: string;
  created_at: string;
}
