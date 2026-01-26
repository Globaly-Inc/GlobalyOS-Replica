import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface LeaveTypeOption {
  id: string;
  name: string;
  category: string;
  max_negative_days?: number;
}

/**
 * Query hook to fetch leave types for an employee.
 * Prefers office_leave_types based on employee's office, falls back to legacy leave_types.
 */
export const useEmployeeLeaveTypesQuery = (employeeId: string | undefined) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["employee-leave-types-options", currentOrg?.id, employeeId],
    queryFn: async (): Promise<LeaveTypeOption[]> => {
      if (!currentOrg?.id) return [];

      let officeId: string | null = null;

      // Get employee's office
      if (employeeId) {
        const { data: emp } = await supabase
          .from("employees")
          .select("office_id")
          .eq("id", employeeId)
          .maybeSingle();
        officeId = emp?.office_id || null;
      }

      // Try office_leave_types first
      if (officeId) {
        const { data: officeTypes, error } = await supabase
          .from("office_leave_types")
          .select("id, name, category, max_negative_days")
          .eq("office_id", officeId)
          .eq("is_active", true)
          .order("name");

        if (!error && officeTypes && officeTypes.length > 0) {
          return officeTypes;
        }
      }

      // No office leave types found - return empty array
      // Employees should have office_leave_types configured via their office
      return [];
    },
    enabled: !!currentOrg?.id,
  });
};
