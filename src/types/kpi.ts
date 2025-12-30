/**
 * KPI and performance management type definitions
 */

export type KpiScopeType = 'individual' | 'department' | 'office' | 'project' | 'organization';

// Attachment type for KPI updates
export interface KpiAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

// Milestone type for progress tracking
export interface KpiMilestone {
  percent: number;
  label: string;
  reached: boolean;
  reached_at: string | null;
}

export interface Kpi {
  id: string;
  employee_id: string | null;
  organization_id: string;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  status: KpiStatus;
  quarter: number;
  year: number;
  created_at: string;
  updated_at: string;
  // Group KPI fields
  scope_type: KpiScopeType;
  scope_department: string | null;
  scope_office_id: string | null;
  scope_project_id: string | null;
  // Milestones
  milestones?: KpiMilestone[];
  // Hierarchy fields
  parent_kpi_id: string | null;
  child_contribution_weight: number;
  auto_rollup: boolean;
}

export type KpiStatus = 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'completed';

export interface KpiWithEmployee extends Kpi {
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
}

export interface GroupKpi extends Kpi {
  scope_type: 'department' | 'office' | 'project';
  // Computed fields for display
  scope_name?: string;
  member_count?: number;
}

export interface GroupKpiWithScope extends GroupKpi {
  office?: { id: string; name: string } | null;
  project?: { 
    id: string; 
    name: string;
    icon?: string | null;
    color?: string | null;
    logo_url?: string | null;
  } | null;
}

// Child KPI with optional employee data for display
export interface KpiChild extends Kpi {
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
}

// KPI with hierarchy information
export interface KpiWithHierarchy extends Kpi {
  parent?: Kpi | null;
  children?: KpiChild[];
  child_count?: number;
  aggregated_progress?: number;
}

// Organisation KPI type
export interface OrganizationKpi extends Kpi {
  scope_type: 'organization';
  children?: Kpi[];
  child_count?: number;
  aggregated_progress?: number;
}

export interface KpiTemplate {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  target_value: number | null;
  unit: string | null;
  category: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KpiAiInsight {
  id: string;
  employee_id: string;
  organization_id: string;
  quarter: number;
  year: number;
  insights: KpiInsightData;
  generated_at: string;
}

export interface KpiInsightData {
  trend: 'improving' | 'stable' | 'declining';
  summary: string;
}

// KPI Updates
export interface KpiUpdate {
  id: string;
  kpi_id: string;
  employee_id: string;
  organization_id: string;
  previous_value: number | null;
  new_value: number | null;
  notes: string;
  status_before: KpiStatus | null;
  status_after: KpiStatus | null;
  attachments: KpiAttachment[];
  created_at: string;
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export type KpiReminderFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface KpiUpdateSettings {
  id: string;
  kpi_id: string;
  organization_id: string;
  frequency: KpiReminderFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  reminder_time: string;
  is_enabled: boolean;
  last_reminder_at: string | null;
  next_reminder_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KpiWithUpdates extends Kpi {
  updates?: KpiUpdate[];
  update_settings?: KpiUpdateSettings | null;
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
  project?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    logo_url: string | null;
  } | null;
}

// Performance Review
export interface PerformanceReview {
  id: string;
  employee_id: string;
  organization_id: string;
  reviewer_id: string;
  review_period_start: string;
  review_period_end: string;
  status: ReviewStatus;
  overall_rating: number | null;
  what_went_well: string | null;
  needs_improvement: string | null;
  goals_next_period: string | null;
  ai_draft: AiReviewDraft | null;
  ai_draft_generated_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = 'draft' | 'self_assessment_pending' | 'in_progress' | 'pending_acknowledgment' | 'completed';

export interface AiReviewDraft {
  what_went_well: string;
  needs_improvement: string;
  goals_next_period: string;
  suggested_rating: number;
}

export interface PerformanceReviewWithRelations extends PerformanceReview {
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  reviewer: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface PerformanceReviewWithRelations extends PerformanceReview {
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  reviewer: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}
