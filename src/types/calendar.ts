/**
 * Calendar and events type definitions
 */

export interface CalendarEvent {
  id: string;
  organization_id: string;
  title: string;
  event_type: CalendarEventType;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  applies_to_all_offices: boolean;
  is_recurring: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CalendarEventType = 
  | 'holiday' 
  | 'event' 
  | 'meeting' 
  | 'training' 
  | 'other';

export interface CalendarEventWithRelations extends CalendarEvent {
  offices?: CalendarEventOffice[];
  created_by_employee?: {
    id: string;
    profiles: {
      full_name: string;
    };
  };
}

export interface CalendarEventOffice {
  id: string;
  calendar_event_id: string;
  office_id: string;
  created_at: string;
  office?: {
    id: string;
    name: string;
  };
}

// Calendar display item (combined from multiple sources)
export interface CalendarDisplayItem {
  id: string;
  date: string;
  title: string;
  type: CalendarDisplayType;
  subtype?: string;
  color: string;
  icon: string;
  employee_id?: string;
  employee_name?: string;
  avatar_url?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_days?: number;
}

export type CalendarDisplayType = 
  | 'holiday' 
  | 'leave' 
  | 'birthday' 
  | 'anniversary' 
  | 'event'
  | 'review'
  | 'meeting';
