/**
 * Hiring & Recruitment Module Types
 * TypeScript types for the ATS system
 */

// ============================================
// ENUMS
// ============================================

export type JobStatus = 'draft' | 'submitted' | 'approved' | 'open' | 'paused' | 'closed';

export type WorkModel = 'onsite' | 'hybrid' | 'remote';

export type HiringEmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary';

export type CandidateSource = 'careers_site' | 'internal' | 'referral' | 'manual' | 'job_board' | 'linkedin' | 'other';

export type ApplicationStage = 
  | 'applied' 
  | 'screening' 
  | 'assignment' 
  | 'interview_1' 
  | 'interview_2' 
  | 'interview_3' 
  | 'offer' 
  | 'hired' 
  | 'rejected';

export type ApplicationStatus = 'active' | 'on_hold' | 'withdrawn' | 'rejected' | 'hired';

export type AssignmentType = 'coding' | 'writing' | 'design' | 'case_study' | 'general';

export type AssignmentStatus = 'assigned' | 'in_progress' | 'submitted' | 'overdue' | 'reviewed';

export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type InterviewRecommendation = 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';

export type OfferStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'declined' | 'expired';

export type HiringActivityAction = 
  | 'job_created'
  | 'job_submitted'
  | 'job_approved'
  | 'job_published'
  | 'job_paused'
  | 'job_closed'
  | 'candidate_created'
  | 'application_created'
  | 'stage_changed'
  | 'assignment_assigned'
  | 'assignment_submitted'
  | 'assignment_reviewed'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'scorecard_submitted'
  | 'offer_created'
  | 'offer_approved'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_declined'
  | 'hired'
  | 'email_sent'
  | 'note_added';

// ============================================
// CORE ENTITIES
// ============================================

export interface Job {
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  department_id: string | null;
  office_id: string | null;
  location: string | null;
  work_model: WorkModel;
  employment_type: HiringEmploymentType;
  headcount: number;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_visible: boolean;
  salary_visible_internal: boolean;
  hiring_manager_id: string | null;
  recruiter_id: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  target_start_date: string | null;
  justification: string | null;
  status: JobStatus;
  is_internal_visible: boolean;
  is_public_visible: boolean;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  closed_at: string | null;
  closed_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobWithRelations extends Job {
  department?: { id: string; name: string } | null;
  office?: { id: string; name: string; city: string | null } | null;
  hiring_manager?: { id: string; user_id: string; profiles: { full_name: string; avatar_url: string | null } } | null;
  recruiter?: { id: string; user_id: string; profiles: { full_name: string; avatar_url: string | null } } | null;
  _count?: {
    candidate_applications: number;
  };
}

export interface JobStage {
  id: string;
  organization_id: string;
  job_id: string;
  name: string;
  stage_key: ApplicationStage;
  sort_order: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  other_urls: string[];
  source: CandidateSource;
  source_details: string | null;
  tags: string[];
  employee_id: string | null;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateWithRelations extends Candidate {
  employee?: { 
    id: string; 
    position: string | null;
    department: string | null;
    user_id: string;
    profiles: { full_name: string; avatar_url: string | null };
  } | null;
  candidate_applications?: CandidateApplication[];
}

export interface CandidateApplication {
  id: string;
  organization_id: string;
  candidate_id: string;
  job_id: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
  cv_file_path: string | null;
  cover_letter: string | null;
  application_answers: Record<string, unknown>;
  custom_fields: Record<string, unknown>;
  is_internal: boolean;
  source_of_application: string | null;
  rating: number | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateApplicationWithRelations extends CandidateApplication {
  candidate?: Candidate;
  job?: Job;
  assignment_instances?: AssignmentInstance[];
  hiring_interviews?: HiringInterview[];
  hiring_offers?: HiringOffer[];
}

// ============================================
// ASSIGNMENTS
// ============================================

export interface ExpectedDeliverables {
  files: boolean;
  text_questions: string[];
  url_fields: string[];
}

export interface SubmissionData {
  files: { name: string; path: string; size: number }[];
  text_answers: { question: string; answer: string }[];
  urls: { label: string; url: string }[];
}

export interface AssignmentTemplate {
  id: string;
  organization_id: string;
  name: string;
  type: AssignmentType;
  role_tags: string[];
  instructions: string;
  expected_deliverables: ExpectedDeliverables;
  recommended_effort: string | null;
  default_deadline_hours: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentInstance {
  id: string;
  organization_id: string;
  candidate_application_id: string;
  template_id: string | null;
  title: string;
  instructions: string;
  expected_deliverables: ExpectedDeliverables;
  deadline: string;
  status: AssignmentStatus;
  secure_token: string;
  submission_data: SubmissionData;
  submitted_at: string | null;
  rating: number | null;
  reviewer_comments: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reminder_sent_at: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentInstanceWithRelations extends AssignmentInstance {
  candidate_application?: CandidateApplicationWithRelations;
  template?: AssignmentTemplate | null;
  reviewer?: { id: string; profiles: { full_name: string; avatar_url: string | null } } | null;
}

// ============================================
// INTERVIEWS
// ============================================

export interface HiringInterview {
  id: string;
  organization_id: string;
  application_id: string;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  interviewer_ids: string[];
  status: InterviewStatus;
  notes: string | null;
  calendar_event_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HiringInterviewWithRelations extends HiringInterview {
  candidate_application?: CandidateApplicationWithRelations;
  interview_scorecards?: InterviewScorecard[];
}

export interface ScorecardRating {
  score: number;
  comment: string;
}

export interface InterviewScorecard {
  id: string;
  organization_id: string;
  interview_id: string;
  interviewer_id: string;
  ratings: Record<string, ScorecardRating>;
  overall_rating: number | null;
  recommendation: InterviewRecommendation | null;
  strengths: string | null;
  concerns: string | null;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewScorecardWithRelations extends InterviewScorecard {
  interviewer?: { id: string; user_id: string; profiles: { full_name: string; avatar_url: string | null } };
}

// ============================================
// OFFERS
// ============================================

export interface HiringOffer {
  id: string;
  organization_id: string;
  application_id: string;
  title: string;
  level: string | null;
  base_salary: number | null;
  currency: string;
  bonuses: { name: string; amount: number; type: string }[];
  equity: string | null;
  start_date: string | null;
  office_id: string | null;
  employment_type: HiringEmploymentType;
  notes: string | null;
  status: OfferStatus;
  offer_letter_path: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  expires_at: string | null;
  responded_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HiringOfferWithRelations extends HiringOffer {
  candidate_application?: CandidateApplicationWithRelations;
  office?: { id: string; name: string } | null;
  approver?: { id: string; profiles: { full_name: string } } | null;
}

// ============================================
// ACTIVITY & EMAILS
// ============================================

export interface HiringActivityLog {
  id: string;
  organization_id: string;
  entity_type: 'job' | 'candidate' | 'application' | 'assignment' | 'interview' | 'offer';
  entity_id: string;
  action: HiringActivityAction;
  actor_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface HiringActivityLogWithRelations extends HiringActivityLog {
  actor?: { id: string; user_id: string; profiles: { full_name: string; avatar_url: string | null } } | null;
}

export interface HiringEmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  template_type: 'application_received' | 'interview_invite' | 'assignment_invite' | 'reminder' | 'rejection' | 'offer' | 'custom';
  subject: string;
  body: string;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// INPUT TYPES
// ============================================

export interface CreateJobInput {
  title: string;
  department_id?: string | null;
  office_id?: string | null;
  location?: string | null;
  work_model?: WorkModel;
  employment_type?: HiringEmploymentType;
  headcount?: number;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  salary_visible?: boolean;
  salary_visible_internal?: boolean;
  hiring_manager_id?: string | null;
  recruiter_id?: string | null;
  description?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  target_start_date?: string | null;
  justification?: string | null;
}

export interface UpdateJobInput extends Partial<CreateJobInput> {
  status?: JobStatus;
  is_internal_visible?: boolean;
  is_public_visible?: boolean;
}

export interface CreateCandidateInput {
  email: string;
  name: string;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  other_urls?: string[];
  source?: CandidateSource;
  source_details?: string | null;
  tags?: string[];
  employee_id?: string | null;
}

export interface CreateApplicationInput {
  candidate_id: string;
  job_id: string;
  cv_file_path?: string | null;
  cover_letter?: string | null;
  application_answers?: Record<string, unknown>;
  is_internal?: boolean;
  source_of_application?: string | null;
}

export interface CreateAssignmentTemplateInput {
  name: string;
  type?: AssignmentType;
  role_tags?: string[];
  instructions: string;
  expected_deliverables?: ExpectedDeliverables;
  recommended_effort?: string | null;
  default_deadline_hours?: number;
}

export interface AssignAssignmentInput {
  candidate_application_id: string;
  template_id?: string | null;
  title: string;
  instructions: string;
  expected_deliverables: ExpectedDeliverables;
  deadline: string;
}

export interface SubmitAssignmentInput {
  submission_data: SubmissionData;
}

export interface ScheduleInterviewInput {
  application_id: string;
  interview_type: string;
  scheduled_at: string;
  duration_minutes?: number;
  location?: string | null;
  meeting_link?: string | null;
  interviewer_ids: string[];
}

export interface SubmitScorecardInput {
  interview_id: string;
  ratings: Record<string, ScorecardRating>;
  overall_rating?: number;
  recommendation?: InterviewRecommendation;
  strengths?: string | null;
  concerns?: string | null;
  notes?: string | null;
}

export interface CreateOfferInput {
  application_id: string;
  title: string;
  level?: string | null;
  base_salary?: number | null;
  currency?: string;
  bonuses?: { name: string; amount: number; type: string }[];
  equity?: string | null;
  start_date?: string | null;
  office_id?: string | null;
  employment_type?: HiringEmploymentType;
  notes?: string | null;
  expires_at?: string | null;
}

// ============================================
// FILTER & QUERY TYPES
// ============================================

export interface JobFilters {
  status?: JobStatus | JobStatus[];
  department_id?: string;
  office_id?: string;
  hiring_manager_id?: string;
  search?: string;
}

export interface CandidateFilters {
  source?: CandidateSource | CandidateSource[];
  tags?: string[];
  search?: string;
}

export interface ApplicationFilters {
  job_id?: string;
  stage?: ApplicationStage | ApplicationStage[];
  status?: ApplicationStatus | ApplicationStatus[];
  is_internal?: boolean;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface HiringMetrics {
  open_jobs: number;
  total_candidates: number;
  candidates_by_stage: Record<ApplicationStage, number>;
  hires_last_30_days: number;
  hires_last_90_days: number;
  avg_time_to_fill_days: number | null;
  source_of_hire: Record<CandidateSource, number>;
  assignment_completion_rate: number;
  avg_assignment_rating: number | null;
}

export interface PipelineFunnel {
  stage: ApplicationStage;
  count: number;
  conversion_rate: number | null;
}

// ============================================
// DISPLAY HELPERS
// ============================================

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  submitted: 'Pending Approval',
  approved: 'Approved',
  open: 'Open',
  paused: 'Paused',
  closed: 'Closed',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  closed: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
};

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  assignment: 'Assignment',
  interview_1: 'Interview 1',
  interview_2: 'Interview 2',
  interview_3: 'Interview 3',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export const APPLICATION_STAGE_COLORS: Record<ApplicationStage, string> = {
  applied: '#94A3B8',
  screening: '#60A5FA',
  assignment: '#A78BFA',
  interview_1: '#34D399',
  interview_2: '#22D3EE',
  interview_3: '#F472B6',
  offer: '#FBBF24',
  hired: '#10B981',
  rejected: '#EF4444',
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  overdue: 'Overdue',
  reviewed: 'Reviewed',
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const INTERVIEW_RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = {
  strong_yes: 'Strong Yes',
  yes: 'Yes',
  neutral: 'Neutral',
  no: 'No',
  strong_no: 'Strong No',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
  hired: 'Hired',
};

export const WORK_MODEL_LABELS: Record<WorkModel, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

export const EMPLOYMENT_TYPE_LABELS: Record<HiringEmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  temporary: 'Temporary',
};

export const CANDIDATE_SOURCE_LABELS: Record<CandidateSource, string> = {
  careers_site: 'Careers Site',
  internal: 'Internal',
  referral: 'Referral',
  manual: 'Manual Entry',
  job_board: 'Job Board',
  linkedin: 'LinkedIn',
  other: 'Other',
};

// Helper functions
export function getJobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_LABELS[status] || status;
}

export function getJobStatusColor(status: JobStatus): string {
  return JOB_STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
}

export function getApplicationStageLabel(stage: ApplicationStage): string {
  return APPLICATION_STAGE_LABELS[stage] || stage;
}

export function getCandidateSourceLabel(source: CandidateSource | undefined | null): string {
  return source ? CANDIDATE_SOURCE_LABELS[source] || source : 'Unknown';
}

export function getAssignmentStatusLabel(status: AssignmentStatus): string {
  return ASSIGNMENT_STATUS_LABELS[status] || status;
}

// Utility function to generate a URL-friendly slug
export function generateJobSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Utility function to generate a secure token
export function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
