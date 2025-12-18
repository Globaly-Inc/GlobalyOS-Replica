export type SupportRequestType = 'bug' | 'feature';
export type SupportRequestStatus = 'new' | 'triaging' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
export type SupportRequestPriority = 'low' | 'medium' | 'high' | 'critical';

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
  triaging: { label: 'Triaging', color: 'bg-yellow-500' },
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
