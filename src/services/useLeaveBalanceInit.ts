/**
 * Service for initializing yearly leave balances with carry forward logic
 * Uses the 3-transaction audit model: year_allocation, carry_forward_out, carry_forward_in
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
 * - Credits default_days for each leave type (year_allocation)
 * - Carries forward previous year balance with separate logs (carry_forward_out, carry_forward_in)
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

      // 1. Get all active employees
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, office_id, gender, employment_type")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");

      if (empError) throw empError;
      if (!employees?.length) {
        return result;
      }

      // 2. Get all active leave types with carry_forward_mode setting
      const { data: leaveTypes, error: ltError } = await supabase
        .from("leave_types")
        .select("id, name, default_days, applies_to_all_offices, applies_to_gender, applies_to_employment_types, carry_forward_mode")
        .eq("organization_id", currentOrg.id)
        .eq("is_active", true);

      if (ltError) throw ltError;
      if (!leaveTypes?.length) {
        return result;
      }

      // 3. Get all existing balances for the target year (to skip)
      const { data: existingBalances } = await supabase
        .from("leave_type_balances")
        .select("employee_id, leave_type_id")
        .eq("organization_id", currentOrg.id)
        .eq("year", year);

      const existingKey = (empId: string, ltId: string) => `${empId}-${ltId}`;
      const existingSet = new Set(
        existingBalances?.map((b) => existingKey(b.employee_id, b.leave_type_id)) || []
      );

      // 4. Get previous year balances for carry forward
      const { data: prevBalances } = await supabase
        .from("leave_type_balances")
        .select("employee_id, leave_type_id, balance")
        .eq("organization_id", currentOrg.id)
        .eq("year", previousYear);

      const prevBalanceMap = new Map<string, number>();
      prevBalances?.forEach((b) => {
        prevBalanceMap.set(existingKey(b.employee_id, b.leave_type_id), b.balance);
      });

      // 5. Get leave type office mappings
      const { data: officeMappings } = await supabase
        .from("leave_type_offices")
        .select("leave_type_id, office_id");

      const officeMappingsByType = new Map<string, Set<string>>();
      officeMappings?.forEach((m) => {
        if (!officeMappingsByType.has(m.leave_type_id)) {
          officeMappingsByType.set(m.leave_type_id, new Set());
        }
        officeMappingsByType.get(m.leave_type_id)!.add(m.office_id);
      });

      // 6. Process each employee
      const balancesToInsert: Array<{
        employee_id: string;
        leave_type_id: string;
        organization_id: string;
        balance: number;
        year: number;
      }> = [];

      const logsToInsert: LogEntry[] = [];

      // Get current user's employee ID for logging
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

      for (const employee of employees) {
        result.employeesProcessed++;

        for (const leaveType of leaveTypes) {
          // Check if balance already exists
          if (existingSet.has(existingKey(employee.id, leaveType.id))) {
            continue;
          }

          // Check if leave type applies to this employee
          // Gender check
          const genderRestriction = leaveType.applies_to_gender || 'all';
          if (genderRestriction !== 'all' && employee.gender !== genderRestriction) {
            continue;
          }

          // Employment type check - only check if employee has a type set
          const empTypes = leaveType.applies_to_employment_types;
          if (empTypes && empTypes.length > 0 && employee.employment_type && !empTypes.includes(employee.employment_type)) {
            continue;
          }

          // Office check
          if (!leaveType.applies_to_all_offices && employee.office_id) {
            const officeSet = officeMappingsByType.get(leaveType.id);
            if (!officeSet || !officeSet.has(employee.office_id)) {
              continue;
            }
          }

          // Calculate new balance
          const defaultDays = leaveType.default_days || 0;
          let carriedForward = 0;

          // Check for carry forward based on mode
          const carryMode = leaveType.carry_forward_mode || 'none';
          const prevBalance = prevBalanceMap.get(existingKey(employee.id, leaveType.id));
          
          if (carryMode !== 'none' && prevBalance !== undefined) {
            carriedForward = getCarriedForwardAmount(carryMode, prevBalance);
            if (carriedForward !== 0) {
              result.balancesCarriedForward++;
            }
          }

          const newBalance = defaultDays + carriedForward;

          balancesToInsert.push({
            employee_id: employee.id,
            leave_type_id: leaveType.id,
            organization_id: currentOrg.id,
            balance: newBalance,
            year: year,
          });

          // Create audit trail logs (3-transaction model)
          if (creatorEmployeeId) {
            // Log 1: Year allocation (default days)
            logsToInsert.push({
              employee_id: employee.id,
              organization_id: currentOrg.id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: defaultDays,
              previous_balance: 0,
              new_balance: defaultDays,
              reason: `${year} annual allocation`,
              created_by: creatorEmployeeId,
              effective_date: `${year}-01-01`,
              action: "year_allocation",
              year: year,
            });

            // Log 2 & 3: Carry forward (if applicable)
            if (carriedForward !== 0 && prevBalance !== undefined) {
              // carry_forward_out: Deduction from previous year
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                leave_type_id: leaveType.id,
                change_amount: -carriedForward,
                previous_balance: prevBalance,
                new_balance: prevBalance - carriedForward,
                reason: `Carried forward to ${year}`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "carry_forward_out",
                year: previousYear,
              });

              // carry_forward_in: Addition to new year
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                leave_type_id: leaveType.id,
                change_amount: carriedForward,
                previous_balance: defaultDays,
                new_balance: defaultDays + carriedForward,
                reason: `Carried from ${previousYear}`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "carry_forward_in",
                year: year,
              });
            }
          }

          result.balancesCreated++;
        }
      }

      // 7. Batch insert balances
      if (balancesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("leave_type_balances")
          .insert(balancesToInsert);

        if (insertError) {
          result.errors.push(`Failed to insert balances: ${insertError.message}`);
        }
      }

      // 8. Batch insert logs
      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase
          .from("leave_balance_logs")
          .insert(logsToInsert);

        if (logError) {
          result.errors.push(`Failed to insert logs: ${logError.message}`);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance-logs"] });
      
      if (result.errors.length > 0) {
        toast.error(`Initialization completed with errors: ${result.errors.join(", ")}`);
      } else {
        toast.success(
          `Initialized ${result.balancesCreated} balances for ${result.employeesProcessed} employees` +
            (result.balancesCarriedForward > 0
              ? ` (${result.balancesCarriedForward} carried forward)`
              : "")
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initialize year balances");
    },
  });
};

/**
 * Initialize leave balances for a specific set of employees for a given year
 * Used by the selective initialization dialog
 */
export const useInitializeSelectedEmployeesBalances = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeIds,
      year,
    }: {
      employeeIds: string[];
      year: number;
    }): Promise<InitResult> => {
      if (!currentOrg?.id) throw new Error("No organization");
      if (!employeeIds.length) throw new Error("No employees selected");

      const previousYear = year - 1;
      const result: InitResult = {
        employeesProcessed: 0,
        balancesCreated: 0,
        balancesCarriedForward: 0,
        errors: [],
      };

      // 1. Get selected employees with their attributes
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, office_id, gender, employment_type")
        .eq("organization_id", currentOrg.id)
        .in("id", employeeIds)
        .eq("status", "active");

      if (empError) throw empError;
      if (!employees?.length) {
        return result;
      }

      // 2. Get all active leave types
      const { data: leaveTypes, error: ltError } = await supabase
        .from("leave_types")
        .select("id, name, default_days, applies_to_all_offices, applies_to_gender, applies_to_employment_types, carry_forward_mode")
        .eq("organization_id", currentOrg.id)
        .eq("is_active", true);

      if (ltError) throw ltError;
      if (!leaveTypes?.length) {
        return result;
      }

      // 3. Get existing balances for target year (to skip)
      const { data: existingBalances } = await supabase
        .from("leave_type_balances")
        .select("employee_id, leave_type_id")
        .eq("organization_id", currentOrg.id)
        .eq("year", year)
        .in("employee_id", employeeIds);

      const existingKey = (empId: string, ltId: string) => `${empId}-${ltId}`;
      const existingSet = new Set(
        existingBalances?.map((b) => existingKey(b.employee_id, b.leave_type_id)) || []
      );

      // 4. Get previous year balances for carry forward
      const { data: prevBalances } = await supabase
        .from("leave_type_balances")
        .select("employee_id, leave_type_id, balance")
        .eq("organization_id", currentOrg.id)
        .eq("year", previousYear)
        .in("employee_id", employeeIds);

      const prevBalanceMap = new Map<string, number>();
      prevBalances?.forEach((b) => {
        prevBalanceMap.set(existingKey(b.employee_id, b.leave_type_id), b.balance);
      });

      // 5. Get leave type office mappings
      const { data: officeMappings } = await supabase
        .from("leave_type_offices")
        .select("leave_type_id, office_id");

      const officeMappingsByType = new Map<string, Set<string>>();
      officeMappings?.forEach((m) => {
        if (!officeMappingsByType.has(m.leave_type_id)) {
          officeMappingsByType.set(m.leave_type_id, new Set());
        }
        officeMappingsByType.get(m.leave_type_id)!.add(m.office_id);
      });

      // 6. Get current user's employee ID for logging
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

      // 7. Process each employee
      const balancesToInsert: Array<{
        employee_id: string;
        leave_type_id: string;
        organization_id: string;
        balance: number;
        year: number;
      }> = [];

      const logsToInsert: LogEntry[] = [];

      for (const employee of employees) {
        result.employeesProcessed++;

        for (const leaveType of leaveTypes) {
          // Skip if balance already exists
          if (existingSet.has(existingKey(employee.id, leaveType.id))) {
            continue;
          }

          // Check eligibility - Gender
          const genderRestriction = leaveType.applies_to_gender || 'all';
          if (genderRestriction !== 'all' && employee.gender !== genderRestriction) {
            continue;
          }

          // Check eligibility - Employment type
          const empTypes = leaveType.applies_to_employment_types;
          if (empTypes && empTypes.length > 0 && employee.employment_type && !empTypes.includes(employee.employment_type)) {
            continue;
          }

          // Check eligibility - Office
          if (!leaveType.applies_to_all_offices && employee.office_id) {
            const officeSet = officeMappingsByType.get(leaveType.id);
            if (!officeSet || !officeSet.has(employee.office_id)) {
              continue;
            }
          }

          // Calculate new balance
          const defaultDays = leaveType.default_days || 0;
          let carriedForward = 0;

          const carryMode = leaveType.carry_forward_mode || 'none';
          const prevBalance = prevBalanceMap.get(existingKey(employee.id, leaveType.id));
          
          if (carryMode !== 'none' && prevBalance !== undefined) {
            carriedForward = getCarriedForwardAmount(carryMode, prevBalance);
            if (carriedForward !== 0) {
              result.balancesCarriedForward++;
            }
          }

          const newBalance = defaultDays + carriedForward;

          balancesToInsert.push({
            employee_id: employee.id,
            leave_type_id: leaveType.id,
            organization_id: currentOrg.id,
            balance: newBalance,
            year: year,
          });

          // Create audit trail logs (3-transaction model)
          if (creatorEmployeeId) {
            // Log 1: Year allocation (default days)
            logsToInsert.push({
              employee_id: employee.id,
              organization_id: currentOrg.id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: defaultDays,
              previous_balance: 0,
              new_balance: defaultDays,
              reason: `${year} annual allocation`,
              created_by: creatorEmployeeId,
              effective_date: `${year}-01-01`,
              action: "year_allocation",
              year: year,
            });

            // Log 2 & 3: Carry forward (if applicable)
            if (carriedForward !== 0 && prevBalance !== undefined) {
              // carry_forward_out: Deduction from previous year
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                leave_type_id: leaveType.id,
                change_amount: -carriedForward,
                previous_balance: prevBalance,
                new_balance: prevBalance - carriedForward,
                reason: `Carried forward to ${year}`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "carry_forward_out",
                year: previousYear,
              });

              // carry_forward_in: Addition to new year
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                leave_type_id: leaveType.id,
                change_amount: carriedForward,
                previous_balance: defaultDays,
                new_balance: defaultDays + carriedForward,
                reason: `Carried from ${previousYear}`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "carry_forward_in",
                year: year,
              });
            }
          }

          result.balancesCreated++;
        }
      }

      // 8. Batch insert balances
      if (balancesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("leave_type_balances")
          .insert(balancesToInsert);

        if (insertError) {
          result.errors.push(`Failed to insert balances: ${insertError.message}`);
        }
      }

      // 9. Batch insert logs
      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase
          .from("leave_balance_logs")
          .insert(logsToInsert);

        if (logError) {
          result.errors.push(`Failed to insert logs: ${logError.message}`);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["missing-leave-balances"] });
      
      if (result.errors.length > 0) {
        toast.error(`Initialization completed with errors: ${result.errors.join(", ")}`);
      } else {
        toast.success(
          `Initialized ${result.balancesCreated} balances for ${result.employeesProcessed} employees` +
            (result.balancesCarriedForward > 0
              ? ` (${result.balancesCarriedForward} carried forward)`
              : "")
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initialize balances");
    },
  });
};

/**
 * Initialize balances for a single employee for the current year (auto-fallback)
 * Called when an employee views their leave page or tries to apply for leave
 */
export const useInitializeEmployeeBalances = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string): Promise<number> => {
      if (!currentOrg?.id) throw new Error("No organization");

      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      let balancesCreated = 0;

      // Get employee data
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id, office_id, gender, employment_type")
        .eq("id", employeeId)
        .eq("organization_id", currentOrg.id)
        .single();

      if (empError || !employee) return 0;

      // Get active leave types
      const { data: leaveTypes, error: ltError } = await supabase
        .from("leave_types")
        .select("id, name, default_days, applies_to_all_offices, applies_to_gender, applies_to_employment_types, carry_forward_mode")
        .eq("organization_id", currentOrg.id)
        .eq("is_active", true);

      if (ltError || !leaveTypes?.length) return 0;

      // Get existing balances for current year
      const { data: existingBalances } = await supabase
        .from("leave_type_balances")
        .select("leave_type_id")
        .eq("employee_id", employeeId)
        .eq("year", currentYear);

      const existingSet = new Set(existingBalances?.map((b) => b.leave_type_id) || []);

      // Get previous year balances
      const { data: prevBalances } = await supabase
        .from("leave_type_balances")
        .select("leave_type_id, balance")
        .eq("employee_id", employeeId)
        .eq("year", previousYear);

      const prevBalanceMap = new Map<string, number>(
        prevBalances?.map((b) => [b.leave_type_id, b.balance]) || []
      );

      // Get office mappings
      const { data: officeMappings } = await supabase
        .from("leave_type_offices")
        .select("leave_type_id, office_id");

      const officeMappingsByType = new Map<string, Set<string>>();
      officeMappings?.forEach((m) => {
        if (!officeMappingsByType.has(m.leave_type_id)) {
          officeMappingsByType.set(m.leave_type_id, new Set());
        }
        officeMappingsByType.get(m.leave_type_id)!.add(m.office_id);
      });

      // Get current user's employee ID for logging
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

      for (const leaveType of leaveTypes) {
        if (existingSet.has(leaveType.id)) continue;

        // Check eligibility
        const genderRestriction = leaveType.applies_to_gender || 'all';
        if (genderRestriction !== 'all' && employee.gender !== genderRestriction) continue;

        // Employment type check - only check if employee has a type set
        const empTypes = leaveType.applies_to_employment_types;
        if (empTypes && empTypes.length > 0 && employee.employment_type && !empTypes.includes(employee.employment_type)) continue;

        if (!leaveType.applies_to_all_offices && employee.office_id) {
          const officeSet = officeMappingsByType.get(leaveType.id);
          if (!officeSet || !officeSet.has(employee.office_id)) continue;
        }

        // Calculate balance
        const defaultDays = leaveType.default_days || 0;
        let carriedForward = 0;

        const carryMode = leaveType.carry_forward_mode || 'none';
        const prevBalance = prevBalanceMap.get(leaveType.id);
        
        if (carryMode !== 'none' && prevBalance !== undefined) {
          carriedForward = getCarriedForwardAmount(carryMode, prevBalance);
        }

        const newBalance = defaultDays + carriedForward;

        // Insert balance
        const { error: insertError } = await supabase
          .from("leave_type_balances")
          .insert({
            employee_id: employeeId,
            leave_type_id: leaveType.id,
            organization_id: currentOrg.id,
            balance: newBalance,
            year: currentYear,
          });

        if (!insertError) {
          balancesCreated++;

          // Create audit trail logs (3-transaction model)
          if (creatorEmployeeId) {
            // Log 1: Year allocation (default days)
            await supabase.from("leave_balance_logs").insert({
              employee_id: employeeId,
              organization_id: currentOrg.id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: defaultDays,
              previous_balance: 0,
              new_balance: defaultDays,
              reason: `${currentYear} annual allocation (auto)`,
              created_by: creatorEmployeeId,
              effective_date: `${currentYear}-01-01`,
              action: "year_allocation",
              year: currentYear,
            });

            // Log 2 & 3: Carry forward (if applicable)
            if (carriedForward !== 0 && prevBalance !== undefined) {
              // carry_forward_out: Deduction from previous year
              await supabase.from("leave_balance_logs").insert({
                employee_id: employeeId,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                leave_type_id: leaveType.id,
                change_amount: -carriedForward,
                previous_balance: prevBalance,
                new_balance: prevBalance - carriedForward,
                reason: `Carried forward to ${currentYear}`,
                created_by: creatorEmployeeId,
                effective_date: `${currentYear}-01-01`,
                action: "carry_forward_out",
                year: previousYear,
              });

              // carry_forward_in: Addition to new year
              await supabase.from("leave_balance_logs").insert({
                employee_id: employeeId,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                leave_type_id: leaveType.id,
                change_amount: carriedForward,
                previous_balance: defaultDays,
                new_balance: defaultDays + carriedForward,
                reason: `Carried from ${previousYear}`,
                created_by: creatorEmployeeId,
                effective_date: `${currentYear}-01-01`,
                action: "carry_forward_in",
                year: currentYear,
              });
            }
          }
        }
      }

      return balancesCreated;
    },
    onSuccess: (count) => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
        queryClient.invalidateQueries({ queryKey: ["leave-types-for-employee"] });
      }
    },
  });
};
