/**
 * CRM Pipeline Management Type Definitions
 */

export type PipelineStageType = 'normal' | 'win';
export type DealStatus = 'active' | 'won' | 'lost' | 'cancelled';
export type DealPriority = 'low' | 'medium' | 'high';
export type DealSource = 'staff' | 'agent' | 'client_portal' | 'form';
export type RequirementType = 'task' | 'document' | 'field' | 'form' | 'note_question';
export type TargetRole = 'assignee' | 'contact' | 'agent';
export type RequirementStatus = 'pending' | 'completed' | 'skipped' | 'waived';
export type DealTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type DealDocStatus = 'pending' | 'approved' | 'rejected';
export type DealFeeStatus = 'pending' | 'invoiced' | 'paid' | 'waived';
export type InstalmentStatus = 'pending' | 'paid' | 'overdue';
export type ActorType = 'staff' | 'agent' | 'contact' | 'system';

export interface CRMPipeline {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  service_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  stages?: CRMPipelineStage[];
  deal_count?: number;
}

export interface CRMPipelineStage {
  id: string;
  pipeline_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  stage_type: PipelineStageType;
  auto_advance: boolean;
  created_at: string;
  updated_at: string;
  requirements?: CRMStageRequirement[];
}

export interface CRMStageRequirement {
  id: string;
  stage_id: string;
  pipeline_id: string;
  organization_id: string;
  requirement_type: RequirementType;
  title: string;
  description: string | null;
  is_required: boolean;
  target_role: TargetRole;
  config: Record<string, any>;
  sort_order: number;
  created_at: string;
}

export interface CRMDeal {
  id: string;
  organization_id: string;
  pipeline_id: string;
  current_stage_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  assignee_id: string | null;
  agent_partner_id: string | null;
  agent_user_id: string | null;
  title: string;
  status: DealStatus;
  priority: DealPriority;
  lost_reason: string | null;
  lost_notes: string | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  deal_value: number | null;
  currency: string;
  source: DealSource;
  custom_fields: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  pipeline?: CRMPipeline;
  current_stage?: CRMPipelineStage;
  contact?: { id: string; first_name: string; last_name: string | null; email: string | null; avatar_url: string | null };
  company?: { id: string; name: string };
  assignee?: { id: string; first_name: string; last_name: string; avatar_url: string | null };
  agent_partner?: { id: string; name: string };
  services?: CRMDealService[];
}

export interface CRMDealService {
  id: string;
  deal_id: string;
  service_id: string;
  organization_id: string;
  created_at: string;
  service?: { id: string; name: string };
}

export interface CRMDealRequirement {
  id: string;
  deal_id: string;
  stage_requirement_id: string;
  organization_id: string;
  status: RequirementStatus;
  completed_by: string | null;
  completed_at: string | null;
  response_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  stage_requirement?: CRMStageRequirement;
}

export interface CRMDealNote {
  id: string;
  deal_id: string;
  organization_id: string;
  author_type: ActorType;
  author_id: string | null;
  content: string;
  is_internal: boolean;
  requirement_id: string | null;
  created_at: string;
  author?: { id: string; first_name: string; last_name: string; avatar_url: string | null };
}

export interface CRMDealDocument {
  id: string;
  deal_id: string;
  organization_id: string;
  requirement_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by_type: ActorType;
  uploaded_by: string | null;
  status: DealDocStatus;
  reviewer_notes: string | null;
  created_at: string;
}

export interface CRMDealTask {
  id: string;
  deal_id: string;
  organization_id: string;
  stage_id: string | null;
  requirement_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  target_role: TargetRole;
  status: DealTaskStatus;
  due_date: string | null;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; first_name: string; last_name: string; avatar_url: string | null };
}

export interface CRMDealActivityLog {
  id: string;
  deal_id: string;
  organization_id: string;
  action_type: string;
  actor_type: ActorType;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  description: string | null;
  created_at: string;
  actor?: { id: string; first_name: string; last_name: string; avatar_url: string | null };
}

export interface CRMDealFee {
  id: string;
  deal_id: string;
  organization_id: string;
  fee_name: string;
  fee_option_id: string | null;
  amount: number;
  currency: string;
  tax_amount: number;
  discount_amount: number;
  status: DealFeeStatus;
  created_at: string;
  updated_at: string;
  instalments?: CRMDealFeeInstalment[];
}

export interface CRMDealFeeInstalment {
  id: string;
  deal_fee_id: string;
  organization_id: string;
  instalment_number: number;
  amount: number;
  due_date: string;
  status: InstalmentStatus;
  paid_at: string | null;
  created_at: string;
}

// Filter types
export interface DealFilters {
  search?: string;
  pipeline_id?: string;
  status?: DealStatus;
  assignee_id?: string;
  agent_partner_id?: string;
  priority?: DealPriority;
  page?: number;
  per_page?: number;
}
