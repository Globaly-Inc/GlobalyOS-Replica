import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface LeaveTypeInfo {
  id: string;
  name: string;
  max_negative_days: number;
  office_id?: string;
}

/**
 * Hook to fetch leave types for balance lookups.
 * Prefers office_leave_types when employee has an office, falls back to legacy leave_types.
 */
export const useOfficeLeaveTypesMap = () => {
  const { currentOrg } = useOrganization();

  /**
   * Fetch leave types map for an employee (or all org leave types if no employeeId)
   * Returns Map<lowercase_name, LeaveTypeInfo>
   */
  const fetchLeaveTypesMap = useCallback(async (
    employeeId?: string
  ): Promise<Map<string, LeaveTypeInfo>> => {
    if (!currentOrg) return new Map();

    let officeId: string | null = null;

    // Get employee's office if employeeId provided
    if (employeeId) {
      const { data: emp } = await supabase
        .from("employees")
        .select("office_id")
        .eq("id", employeeId)
        .maybeSingle();
      officeId = emp?.office_id || null;
    }

    const map = new Map<string, LeaveTypeInfo>();

    // Try office_leave_types first
    if (officeId) {
      const { data: officeTypes } = await supabase
        .from("office_leave_types")
        .select("id, name, max_negative_days, office_id")
        .eq("office_id", officeId)
        .eq("is_active", true);

      if (officeTypes && officeTypes.length > 0) {
        officeTypes.forEach(lt => {
          map.set(lt.name.toLowerCase(), lt);
        });
        return map;
      }
    }

    // Return empty map if no office or no office leave types found
    // (Legacy leave_types table has been deprecated)
    return map;
  }, [currentOrg]);

  /**
   * Batch fetch leave types for multiple employees
   * Returns Map<employeeId, Map<lowercase_name, LeaveTypeInfo>>
   */
  const fetchLeaveTypesMapBatch = useCallback(async (
    employeeIds: string[]
  ): Promise<Map<string, Map<string, LeaveTypeInfo>>> => {
    if (!currentOrg || employeeIds.length === 0) return new Map();

    // Get all employee offices in one query
    const { data: employees } = await supabase
      .from("employees")
      .select("id, office_id")
      .in("id", employeeIds);

    const officeByEmployee = new Map<string, string | null>();
    const uniqueOfficeIds = new Set<string>();
    
    (employees || []).forEach(emp => {
      officeByEmployee.set(emp.id, emp.office_id);
      if (emp.office_id) uniqueOfficeIds.add(emp.office_id);
    });

    // Fetch office_leave_types for all relevant offices
    const officeTypesMap = new Map<string, LeaveTypeInfo[]>();
    if (uniqueOfficeIds.size > 0) {
      const { data: officeTypes } = await supabase
        .from("office_leave_types")
        .select("id, name, max_negative_days, office_id")
        .in("office_id", Array.from(uniqueOfficeIds))
        .eq("is_active", true);

      (officeTypes || []).forEach(lt => {
        const existing = officeTypesMap.get(lt.office_id) || [];
        existing.push(lt);
        officeTypesMap.set(lt.office_id, existing);
      });
    }

    // Return empty map for employees without office types
    // (Legacy leave_types table has been deprecated)
    const legacyMap = new Map<string, LeaveTypeInfo>();

    // Build result map per employee
    const result = new Map<string, Map<string, LeaveTypeInfo>>();

    employeeIds.forEach(empId => {
      const officeId = officeByEmployee.get(empId);
      const empMap = new Map<string, LeaveTypeInfo>();

      if (officeId && officeTypesMap.has(officeId)) {
        officeTypesMap.get(officeId)!.forEach(lt => {
          empMap.set(lt.name.toLowerCase(), lt);
        });
      } else {
        // Use legacy fallback
        legacyMap.forEach((lt, key) => {
          empMap.set(key, lt);
        });
      }

      result.set(empId, empMap);
    });

    return result;
  }, [currentOrg]);

  /**
   * Look up a leave type by name for a specific employee
   * Prefers office_leave_types, falls back to legacy
   */
  const findLeaveTypeByName = useCallback(async (
    employeeId: string,
    leaveTypeName: string
  ): Promise<LeaveTypeInfo | null> => {
    if (!currentOrg || !leaveTypeName) return null;

    // Get employee's office
    const { data: emp } = await supabase
      .from("employees")
      .select("office_id")
      .eq("id", employeeId)
      .maybeSingle();

    const officeId = emp?.office_id;

    // Try office_leave_types first
    if (officeId) {
      const { data: officeType } = await supabase
        .from("office_leave_types")
        .select("id, name, max_negative_days, office_id")
        .eq("office_id", officeId)
        .ilike("name", leaveTypeName)
        .eq("is_active", true)
        .maybeSingle();

      if (officeType) return officeType;
    }

    // Return null if not found in office leave types
    // (Legacy leave_types table has been deprecated)
    return null;
  }, [currentOrg]);

  return {
    fetchLeaveTypesMap,
    fetchLeaveTypesMapBatch,
    findLeaveTypeByName,
  };
};
