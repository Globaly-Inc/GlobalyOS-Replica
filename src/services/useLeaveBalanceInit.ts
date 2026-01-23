/**
 * Service for initializing yearly leave balances with carry forward logic
 * Uses the 3-transaction audit model: year_allocation, carry_forward_out, carry_forward_in
 * 
 * OFFICE-AWARE: Uses office_leave_types table for per-office leave configurations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

/**
 * Calculate carried forward amount based on mode
 */
const getCarriedForwardAmount = (
  mode: string,
  previousBalance: number
): number => {
  switch (mode) {
    case 'positive_only':
      return Math.max(0, previousBalance);
    case 'negative_only':
      return Math.min(0, previousBalance);
    case 'all':
      return previousBalance;
    case 'none':
    default:
      return 0;
  }
};

interface InitResult {
  employeesProcessed: number;
  balancesCreated: number;
  balancesCarriedForward: number;
  errors: string[];
}

interface LogEntry {
  employee_id: string;
  organization_id: string;
  leave_type: string;
  leave_type_id: string;
  office_leave_type_id?: string;
  change_amount: number;
  previous_balance: number;
  new_balance: number;
  reason: string;
  created_by: string;
  effective_date: string;
  action: string;
  year?: number;
}

/**
 * Initialize leave balances for a specific year for all active employees
 * OFFICE-AWARE: Uses office_leave_types table
 */
export const useInitializeYearBalances = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (year: number): Promise<InitResult> => {
      if (!currentOrg?.id) throw new Error("No organization");

      const previousYear = year - 1;
      const result: InitResult = {
        employeesProcessed: 0,
        balancesCreated: 0,
        balancesCarriedForward: 0,
        errors: [],
      };

      // 1. Get all offices with leave settings
      const { data: offices, error: officesError } = await supabase
        .from("offices")
        .select("id, name, leave_enabled, leave_year_start_month, leave_year_start_day")
        .eq("organization_id", currentOrg.id);

      if (officesError) throw officesError;
      if (!offices?.length) return result;

      // 2. Get current user's employee ID for logging
      const { data: { user } } = await supabase.auth.getUser();
      let creatorEmployeeId: string | null = null;

      if (user?.id) {
        const { data: creatorEmployee } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .eq("organization_id", currentOrg.id)
          .single();
        
        creatorEmployeeId = creatorEmployee?.id || null;
      }

      if (!creatorEmployeeId) throw new Error("No authenticated employee found");

      const logsToInsert: LogEntry[] = [];
      const leaveYearStartStr = `${year}-01-01`;

      // 3. Process each office
      for (const office of offices) {
        if (office.leave_enabled === false) continue;

        // Get active employees in this office
        const { data: employees, error: empError } = await supabase
          .from("employees")
          .select("id, office_id, gender, employment_type")
          .eq("organization_id", currentOrg.id)
          .eq("office_id", office.id)
          .eq("status", "active");

        if (empError) {
          result.errors.push(`Office ${office.name}: ${empError.message}`);
          continue;
        }

        if (!employees?.length) continue;

        // Get office leave types
        const { data: officeLeaveTypes, error: oltError } = await supabase
          .from("office_leave_types")
          .select("id, name, default_days, applies_to_gender, applies_to_employment_types, carry_forward_mode")
          .eq("office_id", office.id)
          .eq("is_active", true);

        if (oltError) {
          result.errors.push(`Office ${office.name}: ${oltError.message}`);
          continue;
        }

        if (!officeLeaveTypes?.length) continue;

        // Get existing balances for this office
        const { data: existingBalances } = await supabase
          .from("leave_type_balances")
          .select("employee_id, office_leave_type_id")
          .eq("organization_id", currentOrg.id)
          .eq("year", year)
          .in("employee_id", employees.map((e: any) => e.id));

        const existingKey = (empId: string, oltId: string) => `${empId}-${oltId}`;
        const existingSet = new Set(
          existingBalances?.filter((b: any) => b.office_leave_type_id).map((b: any) => 
            existingKey(b.employee_id, b.office_leave_type_id)
          ) || []
        );

        // Get previous year balances
        const { data: prevBalances } = await supabase
          .from("leave_type_balances")
          .select("employee_id, office_leave_type_id, balance")
          .eq("organization_id", currentOrg.id)
          .eq("year", previousYear)
          .in("employee_id", employees.map((e: any) => e.id));

        const prevBalanceMap = new Map<string, number>();
        prevBalances?.forEach((b: any) => {
          if (b.office_leave_type_id) {
            prevBalanceMap.set(existingKey(b.employee_id, b.office_leave_type_id), b.balance);
          }
        });

        // Process each employee
        for (const employee of employees) {
          result.employeesProcessed++;

          for (const leaveType of officeLeaveTypes) {
            if (existingSet.has(existingKey((employee as any).id, leaveType.id))) continue;

            const genderRestriction = leaveType.applies_to_gender || 'all';
            if (genderRestriction !== 'all' && (employee as any).gender !== genderRestriction) continue;

            const empTypes = leaveType.applies_to_employment_types as string[] | null;
            if (empTypes && empTypes.length > 0 && (employee as any).employment_type && !empTypes.includes((employee as any).employment_type)) continue;

            const defaultDays = leaveType.default_days || 0;

            // Calculate carry forward
            let carriedForward = 0;
            const carryMode = leaveType.carry_forward_mode || 'none';
            const prevBalance = prevBalanceMap.get(existingKey((employee as any).id, leaveType.id));
            
            if (carryMode !== 'none' && prevBalance !== undefined) {
              carriedForward = getCarriedForwardAmount(carryMode, prevBalance);
              if (carriedForward !== 0) result.balancesCarriedForward++;
            }

            logsToInsert.push({
              employee_id: (employee as any).id,
              organization_id: currentOrg.id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              office_leave_type_id: leaveType.id,
              change_amount: defaultDays,
              previous_balance: 0,
              new_balance: defaultDays,
              reason: `${year} annual allocation`,
              created_by: creatorEmployeeId,
              effective_date: leaveYearStartStr,
              action: "year_allocation",
              year: year,
            });

            if (carriedForward !== 0 && prevBalance !== undefined) {
              logsToInsert.push({
                employee_id: (employee as any).id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                leave_type_id: leaveType.id,
                office_leave_type_id: leaveType.id,
                change_amount: carriedForward,
                previous_balance: defaultDays,
                new_balance: defaultDays + carriedForward,
                reason: `Carried from ${previousYear}`,
                created_by: creatorEmployeeId,
                effective_date: leaveYearStartStr,
                action: "carry_forward_in",
                year: year,
              });
            }

            result.balancesCreated++;
          }
        }
      }

      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase.from("leave_balance_logs").insert(logsToInsert);
        if (logError) result.errors.push(`Failed to insert logs: ${logError.message}`);
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["employee-leave-types"] });
      
      if (result.errors.length > 0) {
        toast.error(`Initialization completed with errors: ${result.errors.join(", ")}`);
      } else {
        const carryMsg = result.balancesCarriedForward > 0 ? `, ${result.balancesCarriedForward} carried forward` : "";
        toast.success(`Initialized ${result.balancesCreated} balances for ${result.employeesProcessed} employees${carryMsg}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initialize year balances");
    },
  });
};

/**
 * Initialize leave balances for a single employee for the current year
 */
export const useInitializeEmployeeBalances = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string): Promise<number> => {
      if (!currentOrg?.id) throw new Error("No organization");

      const year = new Date().getFullYear();

      // Get employee with office info
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id, office_id, gender, employment_type")
        .eq("id", employeeId)
        .single();

      if (empError || !employee) throw new Error("Employee not found");
      if (!employee.office_id) return 0; // No office = no office leave types

      // Get office leave types
      const { data: officeLeaveTypes, error: oltError } = await supabase
        .from("office_leave_types")
        .select("id, name, default_days, applies_to_gender, applies_to_employment_types")
        .eq("office_id", employee.office_id)
        .eq("is_active", true);

      if (oltError) throw oltError;
      if (!officeLeaveTypes?.length) return 0;

      // Get existing balances
      const { data: existingBalances } = await supabase
        .from("leave_type_balances")
        .select("office_leave_type_id")
        .eq("employee_id", employeeId)
        .eq("year", year);

      const existingSet = new Set(
        existingBalances?.filter((b: any) => b.office_leave_type_id).map((b: any) => b.office_leave_type_id) || []
      );

      // Get current user for logging
      const { data: { user } } = await supabase.auth.getUser();
      const { data: creatorEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user?.id || "")
        .eq("organization_id", currentOrg.id)
        .single();

      const creatorId = creatorEmployee?.id || employeeId;
      const logsToInsert: LogEntry[] = [];

      for (const leaveType of officeLeaveTypes) {
        if (existingSet.has(leaveType.id)) continue;

        const genderRestriction = leaveType.applies_to_gender || 'all';
        if (genderRestriction !== 'all' && employee.gender !== genderRestriction) continue;

        const empTypes = leaveType.applies_to_employment_types as string[] | null;
        if (empTypes && empTypes.length > 0 && employee.employment_type && !empTypes.includes(employee.employment_type)) continue;

        const defaultDays = leaveType.default_days || 0;

        logsToInsert.push({
          employee_id: employeeId,
          organization_id: currentOrg.id,
          leave_type: leaveType.name,
          leave_type_id: leaveType.id,
          office_leave_type_id: leaveType.id,
          change_amount: defaultDays,
          previous_balance: 0,
          new_balance: defaultDays,
          reason: `${year} annual allocation`,
          created_by: creatorId,
          effective_date: `${year}-01-01`,
          action: "year_allocation",
          year: year,
        });
      }

      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase.from("leave_balance_logs").insert(logsToInsert);
        if (logError) throw logError;
      }

      return logsToInsert.length;
    },
    onSuccess: (_count, employeeId) => {
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances-profile", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employee-leave-types", employeeId] });
    },
    onError: (error: Error) => {
      console.error("Failed to initialize employee balances:", error);
    },
  });
};

/**
 * Initialize leave balances for selected employees
 */
export const useInitializeSelectedEmployeesBalances = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeIds, year }: { employeeIds: string[]; year: number }): Promise<InitResult> => {
      if (!currentOrg?.id) throw new Error("No organization");
      if (!employeeIds.length) throw new Error("No employees selected");

      const result: InitResult = { employeesProcessed: 0, balancesCreated: 0, balancesCarriedForward: 0, errors: [] };

      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, office_id, gender, employment_type")
        .eq("organization_id", currentOrg.id)
        .in("id", employeeIds)
        .eq("status", "active");

      if (empError) throw empError;
      if (!employees?.length) return result;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: creatorEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user?.id || "")
        .eq("organization_id", currentOrg.id)
        .single();

      if (!creatorEmployee?.id) throw new Error("No authenticated employee");

      const logsToInsert: LogEntry[] = [];

      // Group by office
      const employeesByOffice = new Map<string, any[]>();
      for (const emp of employees) {
        if (!emp.office_id) continue;
        if (!employeesByOffice.has(emp.office_id)) employeesByOffice.set(emp.office_id, []);
        employeesByOffice.get(emp.office_id)!.push(emp);
      }

      for (const [officeId, officeEmployees] of employeesByOffice) {
        const { data: officeLeaveTypes } = await supabase
          .from("office_leave_types")
          .select("id, name, default_days, applies_to_gender, applies_to_employment_types")
          .eq("office_id", officeId)
          .eq("is_active", true);

        if (!officeLeaveTypes?.length) continue;

        const { data: existingBalances } = await supabase
          .from("leave_type_balances")
          .select("employee_id, office_leave_type_id")
          .eq("organization_id", currentOrg.id)
          .eq("year", year)
          .in("employee_id", officeEmployees.map((e: any) => e.id));

        const existingKey = (empId: string, oltId: string) => `${empId}-${oltId}`;
        const existingSet = new Set(
          existingBalances?.filter((b: any) => b.office_leave_type_id).map((b: any) => existingKey(b.employee_id, b.office_leave_type_id)) || []
        );

        for (const employee of officeEmployees) {
          result.employeesProcessed++;
          for (const leaveType of officeLeaveTypes) {
            if (existingSet.has(existingKey(employee.id, leaveType.id))) continue;
            const genderRestriction = leaveType.applies_to_gender || 'all';
            if (genderRestriction !== 'all' && employee.gender !== genderRestriction) continue;
            const empTypes = leaveType.applies_to_employment_types as string[] | null;
            if (empTypes && empTypes.length > 0 && employee.employment_type && !empTypes.includes(employee.employment_type)) continue;

            logsToInsert.push({
              employee_id: employee.id,
              organization_id: currentOrg.id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              office_leave_type_id: leaveType.id,
              change_amount: leaveType.default_days || 0,
              previous_balance: 0,
              new_balance: leaveType.default_days || 0,
              reason: `${year} annual allocation`,
              created_by: creatorEmployee.id,
              effective_date: `${year}-01-01`,
              action: "year_allocation",
              year: year,
            });
            result.balancesCreated++;
          }
        }
      }

      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase.from("leave_balance_logs").insert(logsToInsert);
        if (logError) result.errors.push(`Failed to insert logs: ${logError.message}`);
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["employee-leave-types"] });
      queryClient.invalidateQueries({ queryKey: ["missing-leave-balances"] });

      if (result.errors.length > 0) {
        toast.error(`Completed with errors: ${result.errors.join(", ")}`);
      } else {
        toast.success(`Initialized ${result.balancesCreated} balances for ${result.employeesProcessed} employees`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initialize selected employees");
    },
  });
};
