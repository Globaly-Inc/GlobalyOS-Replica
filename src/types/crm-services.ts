/**
 * CRM Services Marketplace Type Definitions
 */

export interface CRMService {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  short_description: string | null;
  long_description: string | null;
  service_type: 'direct' | 'represented_provider' | 'internal_only';
  provider_partner_id: string | null;
  visibility: 'internal' | 'client_portal' | 'agent_portal' | 'both_portals';
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  eligibility_notes: string | null;
  required_docs_template: RequiredDocTemplate[];
  workflow_stages: WorkflowStage[];
  sla_target_days: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  provider_partner?: CRMPartner | null;
  offices?: CRMServiceOffice[];
}

export interface RequiredDocTemplate {
  name: string;
  description?: string;
  required: boolean;
}

export interface WorkflowStage {
  name: string;
  order: number;
  description?: string;
}

export interface CRMServiceOffice {
  id: string;
  service_id: string;
  office_id: string;
  organization_id: string;
  office?: { id: string; name: string };
}

export interface CRMPartner {
  id: string;
  organization_id: string;
  type: 'agent' | 'provider' | 'both';
  name: string;
  trading_name: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postcode: string | null;
  address_country: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  contract_status: 'active' | 'inactive';
  tags: string[];
  compliance_docs: Record<string, any> | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMPartnerBranch {
  id: string;
  partner_id: string;
  organization_id: string;
  name: string;
  city: string | null;
  country: string | null;
  created_at: string;
}

export interface PartnerUser {
  id: string;
  organization_id: string;
  partner_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: 'active' | 'suspended' | 'invited';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceApplication {
  id: string;
  organization_id: string;
  service_id: string;
  office_id: string | null;
  created_by_type: 'client' | 'agent' | 'staff';
  client_portal_user_id: string | null;
  crm_contact_id: string | null;
  partner_customer_id: string | null;
  agent_partner_id: string | null;
  agent_user_id: string | null;
  provider_partner_id: string | null;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high';
  form_responses: Record<string, any> | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  service?: CRMService | null;
  office?: { id: string; name: string } | null;
  agent_partner?: CRMPartner | null;
  crm_contact?: { id: string; first_name: string; last_name: string | null } | null;
}

export interface CRMServiceFilters {
  search?: string;
  category?: string;
  visibility?: string;
  status?: string;
  service_type?: string;
  page?: number;
  per_page?: number;
}

export interface CRMPartnerFilters {
  search?: string;
  type?: string;
  contract_status?: string;
  page?: number;
  per_page?: number;
}
