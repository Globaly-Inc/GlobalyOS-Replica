export type SupportRequestType = 'bug' | 'feature';
export type SupportRequestStatus = 'new' | 'triaging' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
export type SupportRequestPriority = 'low' | 'medium' | 'high' | 'critical';
export type SupportActivityActionType = 'status_change' | 'priority_change' | 'comment_added' | 'note_added' | 'subscriber_added' | 'subscriber_removed' | 'notes_updated' | 'created';

export interface SupportRequest {
  id: string;
  organization_id: string | null;
  user_id: string;
  type: SupportRequestType;
  status: SupportRequestStatus;
  priority: SupportRequestPriority;
  title: string;
  description: string;
  ai_improved_description: string | null;
  page_url: string;
  browser_info: string;
  device_type: string;
  screenshot_url: string | null;
  admin_notes: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  organizations?: {
    name: string | null;
    slug: string | null;
  };
  // Aggregated counts
  comment_count?: number;
}

export interface SupportRequestComment {
  id: string;
  request_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export interface SupportRequestSubscriber {
  id: string;
  request_id: string;
  user_id: string;
  subscribed_at: string;
  // Joined fields
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export interface SupportRequestActivityLog {
  id: string;
  request_id: string;
  user_id: string;
  action_type: SupportActivityActionType;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  // Joined fields
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export interface CreateSupportRequestInput {
  type: SupportRequestType;
  title: string;
  description: string;
  ai_improved_description?: string;
  page_url: string;
  browser_info: string;
  device_type: string;
  screenshot_url?: string;
}

export interface UpdateSupportRequestInput {
  status?: SupportRequestStatus;
  priority?: SupportRequestPriority;
  admin_notes?: string;
  assigned_to?: string | null;
  resolved_at?: string | null;
}

export const STATUS_CONFIG: Record<SupportRequestStatus, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-500' },
  triaging: { label: 'Planning', color: 'bg-yellow-500' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500' },
  resolved: { label: 'Resolved', color: 'bg-green-500' },
  closed: { label: 'Closed', color: 'bg-gray-500' },
  wont_fix: { label: "Won't Fix", color: 'bg-red-500' },
};

export const PRIORITY_CONFIG: Record<SupportRequestPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

export const KANBAN_COLUMNS: SupportRequestStatus[] = ['new', 'triaging', 'in_progress', 'resolved', 'closed'];

export const ACTION_TYPE_LABELS: Record<SupportActivityActionType, string> = {
  status_change: 'changed status',
  priority_change: 'changed priority',
  comment_added: 'added a comment',
  note_added: 'added an internal note',
  subscriber_added: 'added subscriber',
  subscriber_removed: 'removed subscriber',
  notes_updated: 'updated notes',
  created: 'created request',
};
