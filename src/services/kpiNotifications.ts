/**
 * KPI notification helper functions
 */

import { supabase } from '@/integrations/supabase/client';

interface SendKpiNotificationParams {
  kpiId: string;
  kpiTitle: string;
  scopeType: 'individual' | 'department' | 'office' | 'project' | 'organization';
  organizationId: string;
  actorEmployeeId: string;
  // For individual KPIs
  targetEmployeeId?: string;
  // For group KPIs
  scopeDepartment?: string;
  scopeOfficeId?: string;
  scopeProjectId?: string;
  // Optional scope name for better messages
  scopeName?: string;
}

/**
 * Send KPI assignment notifications to affected employees
 * - Individual KPIs: notify the assigned employee
 * - Department KPIs: notify all employees in that department
 * - Office KPIs: notify all employees in that office
 * - Project KPIs: notify all employees assigned to that project
 * - Organization KPIs: skip (everyone is affected, too noisy)
 */
export async function sendKpiNotifications(params: SendKpiNotificationParams): Promise<void> {
  const {
    kpiId,
    kpiTitle,
    scopeType,
    organizationId,
    actorEmployeeId,
    targetEmployeeId,
    scopeDepartment,
    scopeOfficeId,
    scopeProjectId,
    scopeName,
  } = params;

  try {
    // Skip organization-level KPIs (too noisy)
    if (scopeType === 'organization') {
      return;
    }

    let targetUserIds: string[] = [];
    let notificationTitle = 'New KPI Assigned';
    let notificationMessage = `A new KPI has been added: ${kpiTitle}`;

    if (scopeType === 'individual' && targetEmployeeId) {
      // Individual KPI - notify the single employee
      const { data: employee } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', targetEmployeeId)
        .eq('status', 'active')
        .single();

      if (employee?.user_id) {
        targetUserIds = [employee.user_id];
        notificationTitle = 'New KPI Assigned';
        notificationMessage = `You have been assigned a new KPI: ${kpiTitle}`;
      }
    } else if (['department', 'office', 'project'].includes(scopeType)) {
      // For group KPIs, fetch owners from kpi_owners table first
      const { data: owners } = await supabase
        .from('kpi_owners')
        .select('employee_id')
        .eq('kpi_id', kpiId);

      if (owners && owners.length > 0) {
        // Get user IDs for the owners
        const ownerEmployeeIds = owners.map(o => o.employee_id);
        const { data: ownerEmployees } = await supabase
          .from('employees')
          .select('user_id')
          .in('id', ownerEmployeeIds)
          .eq('status', 'active');

        if (ownerEmployees) {
          targetUserIds = ownerEmployees
            .map(e => e.user_id)
            .filter(Boolean) as string[];
        }

        if (scopeType === 'department') {
          notificationTitle = 'New Department KPI';
          notificationMessage = `You have been assigned as owner of a new KPI for ${scopeName || scopeDepartment}: ${kpiTitle}`;
        } else if (scopeType === 'office') {
          notificationTitle = 'New Office KPI';
          notificationMessage = `You have been assigned as owner of a new KPI for ${scopeName || 'your office'}: ${kpiTitle}`;
        } else if (scopeType === 'project') {
          notificationTitle = 'New Project KPI';
          notificationMessage = `You have been assigned as owner of a new KPI for ${scopeName || 'your project'}: ${kpiTitle}`;
        }
      }

      // Fallback: if no owners assigned, notify scope members (legacy behavior)
      if (targetUserIds.length === 0) {
        if (scopeType === 'department' && scopeDepartment) {
          const { data: employees } = await supabase
            .from('employees')
            .select('user_id')
            .eq('organization_id', organizationId)
            .eq('department', scopeDepartment)
            .eq('status', 'active');

          targetUserIds = (employees || [])
            .map(e => e.user_id)
            .filter(Boolean) as string[];
          
          notificationTitle = 'New Department KPI';
          notificationMessage = `A new KPI has been added for ${scopeName || scopeDepartment}: ${kpiTitle}`;
        } else if (scopeType === 'office' && scopeOfficeId) {
          const { data: employees } = await supabase
            .from('employees')
            .select('user_id')
            .eq('organization_id', organizationId)
            .eq('office_id', scopeOfficeId)
            .eq('status', 'active');

          targetUserIds = (employees || [])
            .map(e => e.user_id)
            .filter(Boolean) as string[];
          
          notificationTitle = 'New Office KPI';
          notificationMessage = `A new KPI has been added for ${scopeName || 'your office'}: ${kpiTitle}`;
        } else if (scopeType === 'project' && scopeProjectId) {
          const { data: projectEmployees } = await supabase
            .from('employee_projects')
            .select('employee_id')
            .eq('project_id', scopeProjectId);

          if (projectEmployees && projectEmployees.length > 0) {
            const employeeIds = projectEmployees.map(ep => ep.employee_id);
            
            const { data: employees } = await supabase
              .from('employees')
              .select('user_id')
              .in('id', employeeIds)
              .eq('status', 'active');

            targetUserIds = (employees || [])
              .map(e => e.user_id)
              .filter(Boolean) as string[];
          }
          
          notificationTitle = 'New Project KPI';
          notificationMessage = `A new KPI has been added for ${scopeName || 'your project'}: ${kpiTitle}`;
        }
      }
    }

    // Don't notify if no targets or empty array
    if (targetUserIds.length === 0) {
      return;
    }

    // Create notifications in batch
    const notifications = targetUserIds.map(userId => ({
      user_id: userId,
      organization_id: organizationId,
      type: 'kpi_assigned' as const,
      title: notificationTitle,
      message: notificationMessage,
      reference_type: 'kpi' as const,
      reference_id: kpiId,
      actor_id: actorEmployeeId,
    }));

    // Insert all notifications (batch)
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('Error sending KPI notifications:', error);
    }
  } catch (err) {
    console.error('Error in sendKpiNotifications:', err);
  }
}
