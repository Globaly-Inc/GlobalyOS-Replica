/**
 * Activity Timeline Types
 * Types for the unified employee activity log
 */

// Activity event categories
export type ActivityCategory = 
  | 'profile'
  | 'attendance'
  | 'leave'
  | 'kpi'
  | 'documents'
  | 'recognition'
  | 'learning'
  | 'workflow';

// Activity event types
export type ActivityEventType =
  // Profile
  | 'profile_activated'
  | 'joined_organization'
  | 'profile_updated'
  | 'position_changed'
  | 'department_changed'
  | 'manager_changed'
  // Attendance
  | 'attendance_checked_in'
  | 'attendance_checked_out'
  | 'attendance_adjusted'
  // Leave
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_cancelled'
  | 'leave_modified'
  // KPI & Performance
  | 'kpi_created'
  | 'kpi_updated'
  | 'kpi_milestone_reached'
  | 'review_started'
  | 'review_completed'
  // Learning & Development
  | 'training_assigned'
  | 'training_completed'
  | 'certification_earned'
  // Documents
  | 'document_uploaded'
  | 'document_deleted'
  | 'document_acknowledged'
  // Recognition
  | 'kudos_received'
  | 'achievement_unlocked'
  // Workflow
  | 'workflow_task_completed'
  | 'onboarding_completed';

// Access level for events
export type ActivityAccessLevel = 'public' | 'manager' | 'hr_admin' | 'self';

// Single timeline event
export interface ActivityTimelineEvent {
  event_id: string;
  event_type: ActivityEventType | string;
  event_category: ActivityCategory;
  title: string;
  description: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  event_timestamp: string;
  metadata: Record<string, unknown> | null;
  access_level: ActivityAccessLevel;
}

// Filter options for timeline
export interface ActivityTimelineFilters {
  eventTypes?: string[];
  startDate?: string;
  endDate?: string;
  category?: ActivityCategory;
}

// Hook options
export interface UseActivityTimelineOptions {
  employeeId: string;
  limit?: number;
  offset?: number;
  filters?: ActivityTimelineFilters;
}

// Date range presets
export type DateRangePreset = 
  | 'any'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'custom';

// Category display config
export interface CategoryConfig {
  id: ActivityCategory;
  label: string;
  color: string;
  icon: string;
}

// Category configurations
export const ACTIVITY_CATEGORIES: CategoryConfig[] = [
  { id: 'profile', label: 'Profile', color: 'bg-cyan-500', icon: 'UserCheck' },
  { id: 'attendance', label: 'Attendance', color: 'bg-blue-500', icon: 'Clock' },
  { id: 'leave', label: 'Leave', color: 'bg-amber-500', icon: 'Calendar' },
  { id: 'kpi', label: 'KPI', color: 'bg-green-500', icon: 'Target' },
  { id: 'documents', label: 'Documents', color: 'bg-purple-500', icon: 'FileText' },
  { id: 'recognition', label: 'Recognition', color: 'bg-pink-500', icon: 'Heart' },
  { id: 'learning', label: 'Learning', color: 'bg-indigo-500', icon: 'GraduationCap' },
  { id: 'workflow', label: 'Workflow', color: 'bg-teal-500', icon: 'Workflow' },
];

// Date range presets config
export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
];
