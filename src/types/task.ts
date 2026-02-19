/**
 * Task Management Types
 * Derived from DB schema + enriched for UI use
 */

import type { Database } from '@/integrations/supabase/types';

// Base DB row types
export type TaskSpaceRow = Database['public']['Tables']['task_spaces']['Row'];
export type TaskListRow = Database['public']['Tables']['task_lists']['Row'];
export type TaskStatusRow = Database['public']['Tables']['task_statuses']['Row'];
export type TaskCategoryRow = Database['public']['Tables']['task_categories']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskChecklistRow = Database['public']['Tables']['task_checklists']['Row'];
export type TaskCommentRow = Database['public']['Tables']['task_comments']['Row'];
export type TaskAttachmentRow = Database['public']['Tables']['task_attachments']['Row'];
export type TaskFollowerRow = Database['public']['Tables']['task_followers']['Row'];
export type TaskActivityLogRow = Database['public']['Tables']['task_activity_logs']['Row'];

// Insert types
export type TaskSpaceInsert = Database['public']['Tables']['task_spaces']['Insert'];
export type TaskListInsert = Database['public']['Tables']['task_lists']['Insert'];
export type TaskStatusInsert = Database['public']['Tables']['task_statuses']['Insert'];
export type TaskCategoryInsert = Database['public']['Tables']['task_categories']['Insert'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskChecklistInsert = Database['public']['Tables']['task_checklists']['Insert'];
export type TaskCommentInsert = Database['public']['Tables']['task_comments']['Insert'];
export type TaskAttachmentInsert = Database['public']['Tables']['task_attachments']['Insert'];
export type TaskFollowerInsert = Database['public']['Tables']['task_followers']['Insert'];
export type TaskActivityLogInsert = Database['public']['Tables']['task_activity_logs']['Insert'];

// Update types
export type TaskSpaceUpdate = Database['public']['Tables']['task_spaces']['Update'];
export type TaskListUpdate = Database['public']['Tables']['task_lists']['Update'];
export type TaskStatusUpdate = Database['public']['Tables']['task_statuses']['Update'];
export type TaskCategoryUpdate = Database['public']['Tables']['task_categories']['Update'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type TaskChecklistUpdate = Database['public']['Tables']['task_checklists']['Update'];

// Enriched types for UI
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type StatusGroup = 'todo' | 'in_progress' | 'in_review' | 'completed';

export interface TaskSpaceTreeNode extends TaskSpaceRow {
  children: TaskSpaceTreeNode[];
}

export interface TaskWithRelations extends TaskRow {
  status?: TaskStatusRow | null;
  category?: TaskCategoryRow | null;
  assignee?: { id: string; full_name: string; avatar_url: string | null } | null;
  reporter?: { id: string; full_name: string; avatar_url: string | null } | null;
  comment_count?: number;
  attachment_count?: number;
  follower_count?: number;
  checklist_total?: number;
  checklist_done?: number;
  followers?: { id: string; employee_id: string; full_name?: string; avatar_url?: string | null }[];
}

export interface TaskCommentWithAuthor extends TaskCommentRow {
  employee?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface TaskActivityLogWithActor extends TaskActivityLogRow {
  actor?: { id: string; full_name: string; avatar_url: string | null } | null;
}

// Filter types
export interface TaskFilters {
  list_id?: string;
  status_ids?: string[];
  assignee_ids?: string[];
  priority?: TaskPriority[];
  category_ids?: string[];
  tags?: string[];
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}
