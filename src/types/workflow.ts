/**
 * Workflow management type definitions
 */

export type WorkflowType = 'onboarding' | 'offboarding' | 'recruiting' | 'promotion' | 'transfer' | 'custom';
export type WorkflowStatus = 'active' | 'completed' | 'cancelled';
export type WorkflowTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type WorkflowTaskCategory = 
  | 'documentation' 
  | 'equipment' 
  | 'training' 
  | 'access' 
  | 'exit_interview' 
  | 'asset_return' 
  | 'knowledge_transfer' 
  | 'other';
export type AssigneeType = 'employee' | 'manager' | 'hr' | 'it' | 'specific_person';
export type AssetCategory = 'hardware' | 'software' | 'access' | 'documents' | 'other';
export type AssetStatus = 'assigned' | 'returned' | 'damaged' | 'missing';
export type KnowledgeTransferStatus = 'scheduled' | 'completed' | 'cancelled';
export type TriggerCondition = 'equals' | 'is_set' | 'is_not_null' | 'changed_to';

export interface WorkflowStage {
  id: string;
  template_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTrigger {
  id: string;
  organization_id: string;
  workflow_type: string;
  trigger_event: string;
  trigger_field: string;
  trigger_condition: TriggerCondition;
  trigger_value: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplate {
  id: string;
  organization_id: string;
  name: string;
  type: WorkflowType;
  description: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateTask {
  id: string;
  template_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: WorkflowTaskCategory;
  assignee_type: AssigneeType;
  assignee_id: string | null;
  due_days_offset: number;
  is_required: boolean;
  sort_order: number;
  stage_id: string | null;
  created_at: string;
}

export interface EmployeeWorkflow {
  id: string;
  employee_id: string;
  organization_id: string;
  template_id: string | null;
  type: WorkflowType;
  status: WorkflowStatus;
  start_date: string;
  target_date: string;
  completed_at: string | null;
  created_by: string | null;
  current_stage_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWorkflowTask {
  id: string;
  workflow_id: string;
  organization_id: string;
  employee_id: string;
  title: string;
  description: string | null;
  category: WorkflowTaskCategory;
  assignee_id: string | null;
  due_date: string | null;
  is_required: boolean;
  status: WorkflowTaskStatus;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  sort_order: number;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWorkflowTaskWithAssignee extends EmployeeWorkflowTask {
  assignee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
  completed_by_employee?: {
    profiles: {
      full_name: string;
    };
  } | null;
}

export interface WorkflowWithDetails extends EmployeeWorkflow {
  employee: {
    id: string;
    position: string | null;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  template?: {
    name: string;
  } | null;
  tasks: {
    id: string;
    status: WorkflowTaskStatus;
    stage_id: string | null;
  }[];
}

export interface ExitInterview {
  id: string;
  employee_id: string;
  organization_id: string;
  workflow_id: string | null;
  conducted_by: string | null;
  conducted_at: string | null;
  reason_for_leaving: string | null;
  feedback_management: string | null;
  feedback_culture: string | null;
  feedback_role: string | null;
  feedback_compensation: string | null;
  suggestions: string | null;
  would_recommend: boolean | null;
  would_return: boolean | null;
  overall_rating: number | null;
  is_confidential: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetHandover {
  id: string;
  employee_id: string;
  organization_id: string;
  workflow_id: string | null;
  asset_name: string;
  asset_id: string | null;
  category: AssetCategory;
  status: AssetStatus;
  assigned_date: string | null;
  returned_date: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeTransfer {
  id: string;
  employee_id: string;
  organization_id: string;
  workflow_id: string | null;
  topic: string;
  description: string | null;
  recipient_id: string | null;
  scheduled_date: string | null;
  status: KnowledgeTransferStatus;
  wiki_page_id: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeTransferWithRecipient extends KnowledgeTransfer {
  recipient?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
}

// For proration calculations
export interface ProrationPreview {
  leaveTypeName: string;
  leaveTypeId: string;
  defaultDays: number;
  proratedDays: number;
  usedDays: number;
  currentBalance: number;
  newBalance: number;
  exceeded: boolean;
  exceededBy: number;
}
