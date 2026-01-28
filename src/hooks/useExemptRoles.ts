import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type UserRole = 'owner' | 'admin' | 'hr' | 'member';

interface EmployeeRole {
  employeeId: string;
  role: UserRole;
}

// Fetch system roles for employees
export const useEmployeeSystemRoles = (employeeIds: string[], orgId: string | null) => {
  return useQuery({
    queryKey: ['employee-system-roles', employeeIds, orgId],
    queryFn: async (): Promise<Map<string, UserRole>> => {
      if (!orgId || employeeIds.length === 0) return new Map();

      // Get user_id for each employee
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, user_id')
        .in('id', employeeIds);

      if (empError) throw empError;
      if (!employees?.length) return new Map();

      const userIdToEmployeeId = new Map<string, string>();
      const userIds: string[] = [];
      employees.forEach(emp => {
        userIdToEmployeeId.set(emp.user_id, emp.id);
        userIds.push(emp.user_id);
      });

      // Get roles from user_roles table
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .eq('organization_id', orgId);

      if (roleError) throw roleError;

      const roleMap = new Map<string, UserRole>();
      // Default all employees to 'member'
      employeeIds.forEach(id => roleMap.set(id, 'member'));

      // Override with actual roles from user_roles
      roles?.forEach((r) => {
        const employeeId = userIdToEmployeeId.get(r.user_id);
        if (employeeId) {
          roleMap.set(employeeId, r.role as UserRole);
        }
      });

      return roleMap;
    },
    enabled: !!orgId && employeeIds.length > 0,
    staleTime: 30000, // Cache for 30 seconds
  });
};

// Helper to check if a role is exempt from auto-sync
export const isExemptFromAutoSync = (role: UserRole): boolean => {
  return role === 'owner' || role === 'admin' || role === 'hr';
};

// Hook to get only exempt employee IDs from a list
export const useExemptEmployeeIds = (employeeIds: string[], orgId: string | null) => {
  const { data: roleMap, isLoading } = useEmployeeSystemRoles(employeeIds, orgId);

  const exemptIds = new Set<string>();
  if (roleMap) {
    roleMap.forEach((role, empId) => {
      if (isExemptFromAutoSync(role)) {
        exemptIds.add(empId);
      }
    });
  }

  return {
    exemptIds,
    isLoading,
    roleMap,
  };
};
