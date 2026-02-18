/**
 * CRM Module Type Definitions
 */

export interface CRMCompany {
  id: string;
  organization_id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postcode: string | null;
  address_country: string | null;
  logo_url: string | null;
  notes: string | null;
  rating: 'hot' | 'warm' | 'cold' | null;
  source: string | null;
  custom_fields: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  contacts_count?: number;
}

export interface CRMContact {
  id: string;
  organization_id: string;
  company_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postcode: string | null;
  address_country: string | null;
  notes: string | null;
  rating: 'hot' | 'warm' | 'cold' | null;
  source: string | null;
  is_archived: boolean;
  tags: string[] | null;
  date_of_birth: string | null;
  custom_fields: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company?: CRMCompany | null;
}

export interface CRMActivity {
  id: string;
  organization_id: string;
  contact_id: string | null;
  company_id: string | null;
  employee_id: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task';
  content: string | null;
  subject: string | null;
  duration_minutes: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export interface CRMTag {
  id: string;
  organization_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface CRMContactFilters {
  search?: string;
  rating?: string;
  source?: string;
  is_archived?: boolean;
  company_id?: string;
  tags?: string[];
  page?: number;
  per_page?: number;
}

export interface CRMCompanyFilters {
  search?: string;
  rating?: string;
  industry?: string;
  page?: number;
  per_page?: number;
}

export type CRMSidebarCategory = 'all' | 'enquiries' | 'prospects' | 'clients' | 'archived';
export type CRMView = 'contacts' | 'companies';
