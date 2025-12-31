/**
 * Team data service hook with React Query caching
 * Consolidates team page data fetching with parallel execution
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface Employee {
  id: string;
  user_id: string;
  position: string;
  department: string;
  join_date: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  manager_id: string | null;
  status: 'invited' | 'active' | 'inactive';
  office_id: string | null;
  work_location?: 'office' | 'hybrid' | 'remote' | null;
  full_name: string;
  email: string;
  avatar_url: string | null;
  office_name: string | null;
}

interface Project {
  id: string;
  name: string;
  color: string | null;
}

interface EmployeeProject {
  employee_id: string;
  project_id: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface TeamData {
  employees: Employee[];
  projects: Project[];
  employeeProjects: EmployeeProject[];
  userRoles: Record<string, string>;
}

export const useTeamData = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['team-data', currentOrg?.id],
    queryFn: async (): Promise<TeamData> => {
      if (!currentOrg?.id) {
        return { employees: [], projects: [], employeeProjects: [], userRoles: {} };
      }

      // Execute all queries in parallel
      const [employeeResult, projectsResult, employeeProjectsResult] = await Promise.all([
        supabase
          .from("employee_directory")
          .select("*")
          .eq("organization_id", currentOrg.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("id, name, color")
          .eq("organization_id", currentOrg.id)
          .order("name"),
        supabase
          .from("employee_projects")
          .select("employee_id, project_id")
          .eq("organization_id", currentOrg.id)
      ]);

      const employees = (employeeResult.data || []).map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        position: e.position,
        department: e.department,
        join_date: e.join_date,
        phone: null,
        city: e.city,
        country: e.country,
        manager_id: e.manager_id,
        status: e.status,
        office_id: e.office_id,
        work_location: e.work_location,
        full_name: e.full_name,
        email: e.email,
        avatar_url: e.avatar_url,
        office_name: e.office_name,
      })) as Employee[];

      const projects = (projectsResult.data || []) as Project[];
      const employeeProjects = (employeeProjectsResult.data || []) as EmployeeProject[];

      // Fetch user roles for all employees
      const userIds = employees.map(e => e.user_id);
      let userRoles: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("organization_id", currentOrg.id)
          .in("user_id", userIds);
        
        if (rolesData) {
          rolesData.forEach((r: UserRole) => {
            userRoles[r.user_id] = r.role;
          });
        }
      }

      return { employees, projects, employeeProjects, userRoles };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    enabled: !!currentOrg?.id,
  });
};

// Hook for online presence - separate query with shorter staleTime
export const useTeamPresence = (employeeIds: string[]) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['team-presence', currentOrg?.id, employeeIds.length],
    queryFn: async (): Promise<Record<string, boolean>> => {
      if (!employeeIds.length) return {};
      
      const { data: presences } = await supabase
        .from('chat_presence')
        .select('employee_id, is_online, last_seen_at')
        .in('employee_id', employeeIds);
      
      if (!presences) return {};

      const now = new Date();
      const statusMap: Record<string, boolean> = {};
      presences.forEach((p: any) => {
        if (p.is_online && p.last_seen_at) {
          const lastSeen = new Date(p.last_seen_at);
          const isStale = (now.getTime() - lastSeen.getTime()) > 60000; // 60 seconds
          statusMap[p.employee_id] = !isStale;
        }
      });
      return statusMap;
    },
    staleTime: 30 * 1000, // 30 seconds - presence needs freshness
    enabled: employeeIds.length > 0 && !!currentOrg?.id,
  });
};
