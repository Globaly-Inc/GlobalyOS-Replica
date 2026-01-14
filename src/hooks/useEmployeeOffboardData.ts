import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface WikiPage {
  id: string;
  title: string;
  folder_id: string | null;
}

export interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface PendingTask {
  id: string;
  title: string;
  status: string;
  workflow_id: string;
  due_date: string | null;
}

export interface DirectReport {
  id: string;
  full_name: string;
  position: string | null;
  avatar_url: string | null;
}

export interface LedProject {
  id: string;
  name: string;
  icon: string;
  color: string;
  role: 'lead' | 'secondary';
}

export interface IndividualKpi {
  id: string;
  title: string;
  status: string;
  quarter: number;
  year: number;
}

export interface OwnedKpi {
  id: string;
  title: string;
  status: string;
  scope_type: string;
  is_primary: boolean;
  quarter: number;
  year: number;
}

export interface OffboardData {
  wiki_pages: WikiPage[];
  wiki_folders: WikiFolder[];
  pending_tasks: PendingTask[];
  direct_reports: DirectReport[];
  led_projects: LedProject[];
  individual_kpis: IndividualKpi[];
  owned_kpis: OwnedKpi[];
}

export function useEmployeeOffboardData(employeeId: string | null) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["employee-offboard-data", employeeId, currentOrg?.id],
    queryFn: async (): Promise<OffboardData> => {
      if (!employeeId || !currentOrg?.id) {
        throw new Error("Missing employee ID or organization");
      }
      
      const { data, error } = await supabase.rpc("get_employee_offboard_data", {
        p_employee_id: employeeId,
        p_organization_id: currentOrg.id,
      });
      
      if (error) throw error;
      return data as unknown as OffboardData;
    },
    enabled: !!employeeId && !!currentOrg?.id,
  });
}

export function useOffboardTransferActions() {
  const { currentOrg } = useOrganization();

  const transferWikiItems = async (
    pageIds: string[],
    folderIds: string[],
    newOwnerId: string
  ) => {
    if (!currentOrg?.id) throw new Error("No organization");
    
    const { error } = await supabase.rpc("bulk_transfer_wiki_items", {
      p_page_ids: pageIds,
      p_folder_ids: folderIds,
      p_new_owner_id: newOwnerId,
      p_organization_id: currentOrg.id,
    });
    
    if (error) throw error;
    return true;
  };

  const reassignTasks = async (taskIds: string[], newAssigneeId: string | null) => {
    if (!currentOrg?.id) throw new Error("No organization");
    
    const { error } = await supabase.rpc("bulk_reassign_tasks", {
      p_task_ids: taskIds,
      p_new_assignee_id: newAssigneeId,
      p_organization_id: currentOrg.id,
    });
    
    if (error) throw error;
    return true;
  };

  const reassignDirectReports = async (employeeIds: string[], newManagerId: string | null) => {
    if (!currentOrg?.id) throw new Error("No organization");
    
    const { error } = await supabase.rpc("bulk_reassign_direct_reports", {
      p_employee_ids: employeeIds,
      p_new_manager_id: newManagerId,
      p_organization_id: currentOrg.id,
    });
    
    if (error) throw error;
    return true;
  };

  const transferProjectLeads = async (
    projectIds: string[],
    role: 'lead' | 'secondary',
    newLeadId: string | null
  ) => {
    if (!currentOrg?.id) throw new Error("No organization");
    
    const { error } = await supabase.rpc("bulk_transfer_project_leads", {
      p_project_ids: projectIds,
      p_role: role,
      p_new_lead_id: newLeadId,
      p_organization_id: currentOrg.id,
    });
    
    if (error) throw error;
    return true;
  };

  const transferIndividualKpis = async (
    kpiIds: string[],
    newOwnerId: string
  ) => {
    if (!currentOrg?.id) throw new Error("No organization");
    
    const { error } = await supabase.rpc("bulk_transfer_individual_kpis", {
      p_kpi_ids: kpiIds,
      p_new_owner_id: newOwnerId,
      p_organization_id: currentOrg.id,
    });
    
    if (error) throw error;
    return true;
  };

  const transferKpiOwnership = async (
    kpiIds: string[],
    oldOwnerId: string,
    newOwnerId: string
  ) => {
    if (!currentOrg?.id) throw new Error("No organization");
    
    const { error } = await supabase.rpc("bulk_transfer_kpi_ownership", {
      p_kpi_ids: kpiIds,
      p_old_owner_id: oldOwnerId,
      p_new_owner_id: newOwnerId,
      p_organization_id: currentOrg.id,
    });
    
    if (error) throw error;
    return true;
  };

  return { 
    transferWikiItems, 
    reassignTasks, 
    reassignDirectReports,
    transferProjectLeads,
    transferIndividualKpis,
    transferKpiOwnership,
  };
}
