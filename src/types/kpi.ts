/**
 * KPI and performance management type definitions
 */

export interface Kpi {
  id: string;
  employee_id: string;
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
}

export type KpiStatus = 'on_track' | 'at_risk' | 'behind' | 'achieved';

export interface KpiWithEmployee extends Kpi {
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
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
  focus_areas: string[];
  recommendations: string[];
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
