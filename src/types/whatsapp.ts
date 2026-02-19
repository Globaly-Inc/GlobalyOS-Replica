// WhatsApp Module Types

export type WaOptInStatus = 'opted_in' | 'opted_out' | 'pending';
export type WaConversationStatus = 'open' | 'assigned' | 'resolved' | 'closed';
export type WaMessageDirection = 'inbound' | 'outbound';
export type WaMessageType = 'text' | 'image' | 'video' | 'document' | 'template' | 'interactive' | 'flow';
export type WaMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type WaTemplateCategory = 'marketing' | 'utility' | 'authentication';
export type WaTemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type WaCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
export type WaAutomationStatus = 'draft' | 'active' | 'paused';
export type WaAutomationTrigger = 'message_received' | 'keyword' | 'new_contact' | 'tag_added' | 'flow_submitted';
export type WaFlowStatus = 'draft' | 'active' | 'archived';

export interface WaAccount {
  id: string;
  organization_id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone: string | null;
  display_name: string | null;
  status: string;
  webhook_secret: string | null;
  business_hours: Record<string, unknown>;
  frequency_cap_per_day: number;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaContact {
  id: string;
  organization_id: string;
  phone: string;
  name: string | null;
  crm_contact_id: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  opt_in_status: WaOptInStatus;
  opt_in_source: string | null;
  opt_in_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaConversation {
  id: string;
  organization_id: string;
  wa_contact_id: string;
  status: WaConversationStatus;
  assigned_to: string | null;
  assigned_at: string | null;
  window_open_until: string | null;
  last_message_at: string | null;
  unread_count: number;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  wa_contact?: WaContact;
}

export interface WaMessage {
  id: string;
  organization_id: string;
  conversation_id: string;
  direction: WaMessageDirection;
  msg_type: WaMessageType;
  content: Record<string, unknown>;
  wa_message_id: string | null;
  template_id: string | null;
  status: WaMessageStatus;
  status_updated_at: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

export interface WaTemplate {
  id: string;
  organization_id: string;
  name: string;
  category: WaTemplateCategory;
  language: string;
  components: unknown[];
  status: WaTemplateStatus;
  external_template_id: string | null;
  rejection_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WaCampaign {
  id: string;
  organization_id: string;
  name: string;
  template_id: string | null;
  variable_mapping: Record<string, unknown>;
  audience_source: string;
  audience_filters: Record<string, unknown>;
  status: WaCampaignStatus;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    replied: number;
  };
  throttle_per_second: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  wa_template?: WaTemplate;
}

export interface WaAutomation {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: WaAutomationTrigger;
  trigger_config: Record<string, unknown>;
  nodes: unknown[];
  edges: unknown[];
  status: WaAutomationStatus;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Flow types ──

export interface WaFlowField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'date' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select fields
  validation?: Record<string, unknown>;
}

export interface WaFlowScreen {
  id: string;
  title: string;
  description?: string;
  fields: WaFlowField[];
}

export interface WaFlowFieldMapping {
  field_id: string;
  target: 'contact_name' | 'contact_phone' | 'contact_tag' | 'contact_custom_field' | 'crm_contact_name' | 'crm_contact_email' | 'crm_deal_title';
  target_key?: string; // for custom fields
}

export interface WaFlow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  screens: WaFlowScreen[];
  field_mapping: WaFlowFieldMapping[];
  status: WaFlowStatus;
  external_flow_id: string | null;
  submission_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaFlowSubmission {
  id: string;
  organization_id: string;
  flow_id: string;
  wa_contact_id: string | null;
  conversation_id: string | null;
  data: Record<string, unknown>;
  mapped_fields: Record<string, unknown>;
  created_at: string;
}

export interface WaAuditLog {
  id: string;
  organization_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// Setup wizard step
export interface SetupStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
}
