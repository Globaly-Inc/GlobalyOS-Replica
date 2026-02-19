/**
 * Scheduler Module Type Definitions
 */

export type SchedulerEventType = 'one_on_one' | 'group' | 'collective' | 'round_robin';
export type SchedulerLocationType = 'google_meet' | 'in_person' | 'custom' | 'phone';
export type SchedulerBookingStatus = 'scheduled' | 'completed' | 'no_show' | 'canceled';

export interface AvailabilityDay {
  enabled: boolean;
  start: string; // "09:00"
  end: string;   // "17:00"
}

export interface AvailabilityConfig {
  monday: AvailabilityDay;
  tuesday: AvailabilityDay;
  wednesday: AvailabilityDay;
  thursday: AvailabilityDay;
  friday: AvailabilityDay;
  saturday: AvailabilityDay;
  sunday: AvailabilityDay;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  min_notice_hours: number;
  max_days_in_advance: number;
}

export interface CustomQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox';
  options?: string[];
  required: boolean;
}

export interface NotificationConfig {
  confirmation_enabled: boolean;
  reminder_24h_enabled: boolean;
  reminder_1h_enabled: boolean;
}

export interface EventTypeConfig {
  availability: AvailabilityConfig;
  questions: CustomQuestion[];
  notifications: NotificationConfig;
  group_capacity?: number; // for group type
  routing_rule?: 'random' | 'equal_load' | 'strict_order'; // for round_robin
}

export interface SchedulerEventTypeRow {
  id: string;
  organization_id: string;
  creator_user_id: string;
  type: SchedulerEventType;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  location_type: SchedulerLocationType;
  location_value: string | null;
  is_active: boolean;
  config_json: EventTypeConfig;
  created_at: string;
  updated_at: string;
  hosts?: SchedulerEventHostRow[];
}

export interface SchedulerEventHostRow {
  id: string;
  event_type_id: string;
  employee_id: string;
  routing_weight: number;
  is_primary: boolean;
  created_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    job_title: string | null;
  };
}

export interface SchedulerBookingRow {
  id: string;
  organization_id: string;
  event_type_id: string;
  host_employee_id: string | null;
  invitee_contact_id: string | null;
  invitee_name: string;
  invitee_email: string;
  invitee_timezone: string;
  answers_json: Record<string, string> | null;
  start_at_utc: string;
  end_at_utc: string;
  status: SchedulerBookingStatus;
  cancel_token: string;
  google_event_id: string | null;
  google_meet_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  event_type?: SchedulerEventTypeRow;
  host_employee?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export interface SchedulerIntegrationSettings {
  id: string;
  organization_id: string;
  user_id: string;
  provider: 'google';
  is_google_meet_enabled: boolean;
  primary_calendar_id: string | null;
  availability_calendar_ids: string[];
  created_at: string;
  updated_at: string;
}

// Form shapes for wizard
export interface CreateEventTypeFormData {
  type: SchedulerEventType;
  name: string;
  slug: string;
  description: string;
  duration_minutes: number;
  location_type: SchedulerLocationType;
  location_value: string;
  host_employee_ids: string[];
  config: EventTypeConfig;
}

// Public booking page types
export interface PublicEventType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  location_type: SchedulerLocationType;
  location_value: string | null;
  type: SchedulerEventType;
  config_json: EventTypeConfig;
  organization_name: string;
  hosts: Array<{
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    job_title: string | null;
  }>;
}

export interface TimeSlot {
  start: string; // ISO UTC
  end: string;   // ISO UTC
  available: boolean;
}

export const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  monday:    { enabled: true,  start: '09:00', end: '17:00' },
  tuesday:   { enabled: true,  start: '09:00', end: '17:00' },
  wednesday: { enabled: true,  start: '09:00', end: '17:00' },
  thursday:  { enabled: true,  start: '09:00', end: '17:00' },
  friday:    { enabled: true,  start: '09:00', end: '17:00' },
  saturday:  { enabled: false, start: '09:00', end: '17:00' },
  sunday:    { enabled: false, start: '09:00', end: '17:00' },
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  min_notice_hours: 2,
  max_days_in_advance: 60,
};

export const DEFAULT_EVENT_CONFIG: EventTypeConfig = {
  availability: DEFAULT_AVAILABILITY,
  questions: [],
  notifications: {
    confirmation_enabled: true,
    reminder_24h_enabled: true,
    reminder_1h_enabled: false,
  },
};
