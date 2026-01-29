/**
 * Secure Data Access Utility Functions
 * 
 * SECURITY: Use these functions for ALL employee data access.
 * NEVER directly query the employees table for sensitive fields.
 * 
 * This module provides centralized, secure access to employee data
 * with proper field-level security enforced at the database level.
 * 
 * @see docs/SECURITY_DATA_ACCESS.md for full documentation
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Get employee profile data with field-level security
 * Returns sensitive fields only if viewer is authorized (self, HR, admin, or manager)
 * 
 * @param employeeId - The ID of the employee to view
 * @returns Employee data with sensitive fields masked based on viewer permissions
 */
export async function getEmployeeForViewer(employeeId: string) {
  const { data, error } = await supabase
    .rpc('get_employee_for_viewer', { target_employee_id: employeeId });
  
  if (error) throw error;
  return data?.[0] || null;
}

/**
 * Get position history with salary field-level security
 * Salary is only visible to self, HR, or admin users
 * 
 * @param employeeId - The ID of the employee whose history to view
 * @returns Position history with salary masked for unauthorized viewers
 */
export async function getPositionHistoryForViewer(employeeId: string) {
  const { data, error } = await supabase
    .rpc('get_position_history_for_viewer', { target_employee_id: employeeId });
  
  if (error) throw error;
  return data || [];
}

/**
 * Get birthday/anniversary calendar data
 * Returns only month/day for birthdays (not full DOB with year)
 * This prevents age exposure via API responses
 * 
 * @param organizationId - The organization to fetch data for
 * @returns Employee data with birthday_month_day (MM-DD format) instead of full DOB
 */
export async function getBirthdayCalendarData(organizationId: string) {
  const { data, error } = await supabase
    .rpc('get_birthday_calendar_data', { org_id: organizationId });
  
  if (error) throw error;
  return data || [];
}

/**
 * Get employee directory data (non-sensitive fields only)
 * Use this for lists, directories, and public-facing employee displays
 * 
 * This view excludes: salary, DOB, phone, personal_email, address, 
 * tax_number, id_number, bank_details, emergency contacts
 * 
 * @param organizationId - The organization to fetch data for
 * @param status - Optional status filter ('active', 'inactive', etc.)
 * @returns Employee directory data without sensitive fields
 */
export async function getEmployeeDirectory(organizationId: string, status?: string) {
  let query = supabase
    .from('employee_directory')
    .select('*')
    .eq('organization_id', organizationId);
  
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * SENSITIVE FIELD CLASSIFICATIONS
 * 
 * Tier 1 - Public (accessible to all org members):
 *   - name, avatar, position, department, office, join_date
 * 
 * Tier 2 - Personal (accessible to self, HR, admin, manager):
 *   - phone, personal_email, date_of_birth, address (street, city, state, postcode)
 *   - emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
 * 
 * Tier 3 - Financial (accessible to self, HR, admin ONLY):
 *   - salary, remuneration, remuneration_currency
 *   - id_number, tax_number, bank_details
 * 
 * PROHIBITED PATTERNS:
 *   - Direct .from('employees').select('salary...')
 *   - Direct .from('employees').select('date_of_birth...')
 *   - Direct .from('position_history').select('salary...')
 * 
 * APPROVED PATTERNS:
 *   - Use employee_directory view for lists
 *   - Use getEmployeeForViewer() for full profiles
 *   - Use getPositionHistoryForViewer() for career history
 *   - Use getBirthdayCalendarData() for birthday calendars
 */
