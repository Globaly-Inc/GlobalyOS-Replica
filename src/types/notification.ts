/**
 * Notification type definitions
 */

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  message: string;
  reference_type: NotificationReferenceType | null;
  reference_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
}

export type NotificationType = 
  | 'kudos' 
  | 'mention' 
  | 'leave_request' 
  | 'leave_decision' 
  | 'reaction'
  | 'announcement'
  | 'kpi_assigned'
  | 'acknowledgment_required'
  | 'acknowledgment_reminder'
  | 'system';

export type NotificationReferenceType = 
  | 'kudos' 
  | 'update' 
  | 'leave_request' 
  | 'employee'
  | 'kpi'
  | 'post';

export interface NotificationWithActor extends Notification {
  actor?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}
