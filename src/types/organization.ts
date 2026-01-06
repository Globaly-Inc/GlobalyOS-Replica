/**
 * Organization-related type definitions
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  logo_url: string | null;
  workday_hours: number;
  max_day_in_lieu_days: number | null;
  auto_attendance_adjustments_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
}

export type OrganizationRole = 'owner' | 'admin' | 'member';

export type AppRole = 'owner' | 'admin' | 'hr' | 'member';

export interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Office {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
