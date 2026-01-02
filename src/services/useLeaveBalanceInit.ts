/**
 * Service for initializing yearly leave balances with carry forward logic
 * Uses separate transaction types for complete audit trail:
 * - year_allocation: Default days allocated for new year
 * - carry_forward_out: Deduct from previous year (closing)
 * - carry_forward_in: Add to new year (incoming)
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
  change_amount: number;
  previous_balance: number;
  new_balance: number;
  reason: string;
  created_by: string;
  effective_date: string;
  action: string;
}

/**
 * Initialize leave balances for a specific year for all active employees
 * Creates separate transaction logs for year_allocation and carry_forward
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
        .select("id, employee_id, leave_type_id, balance")
        .eq("organization_id", currentOrg.id)
        .eq("year", previousYear);

      const prevBalanceMap = new Map<string, { id: string; balance: number }>();
      prevBalances?.forEach((b) => {
        prevBalanceMap.set(existingKey(b.employee_id, b.leave_type_id), { 
          id: b.id, 
          balance: b.balance 
        });
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
      const prevBalanceUpdates: Array<{ id: string; newBalance: number }> = [];

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
          let runningBalance = 0;

          // Check for carry forward based on mode
          const carryMode = leaveType.carry_forward_mode || 'none';
          const prevBalanceData = prevBalanceMap.get(existingKey(employee.id, leaveType.id));
          
          if (carryMode !== 'none' && prevBalanceData) {
            carriedForward = getCarriedForwardAmount(carryMode, prevBalanceData.balance);
            if (carriedForward !== 0) {
              result.balancesCarriedForward++;
            }
          }

          const totalBalance = defaultDays + carriedForward;

          balancesToInsert.push({
            employee_id: employee.id,
            leave_type_id: leaveType.id,
            organization_id: currentOrg.id,
            balance: totalBalance,
            year: year,
          });

          // Create separate log entries for complete audit trail
          if (creatorEmployeeId) {
            // 1. Year allocation log (if default_days > 0)
            if (defaultDays > 0) {
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                change_amount: defaultDays,
                previous_balance: runningBalance,
                new_balance: runningBalance + defaultDays,
                reason: `${year} default allocation`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "year_allocation",
              });
              runningBalance += defaultDays;
            }

            // 2. Carry forward logs (if applicable)
            if (carriedForward !== 0 && prevBalanceData) {
              // carry_forward_out on previous year (deduct from previous year balance)
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                change_amount: -carriedForward,
                previous_balance: prevBalanceData.balance,
                new_balance: prevBalanceData.balance - carriedForward,
                reason: `Carried to ${year}`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "carry_forward_out",
              });

              // Track previous balance update
              prevBalanceUpdates.push({
                id: prevBalanceData.id,
                newBalance: prevBalanceData.balance - carriedForward,
              });

              // carry_forward_in on new year
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                change_amount: carriedForward,
                previous_balance: runningBalance,
                new_balance: runningBalance + carriedForward,
                reason: `Carried from ${previousYear}`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "carry_forward_in",
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

      // 8. Update previous year balances (set to 0 or remaining after carry out)
      for (const update of prevBalanceUpdates) {
        await supabase
          .from("leave_type_balances")
          .update({ balance: update.newBalance })
          .eq("id", update.id);
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
        .select("id, employee_id, leave_type_id, balance")
        .eq("organization_id", currentOrg.id)
        .eq("year", previousYear)
        .in("employee_id", employeeIds);

      const prevBalanceMap = new Map<string, { id: string; balance: number }>();
      prevBalances?.forEach((b) => {
        prevBalanceMap.set(existingKey(b.employee_id, b.leave_type_id), {
          id: b.id,
          balance: b.balance,
        });
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
      const prevBalanceUpdates: Array<{ id: string; newBalance: number }> = [];

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
          let runningBalance = 0;

          const carryMode = leaveType.carry_forward_mode || 'none';
          const prevBalanceData = prevBalanceMap.get(existingKey(employee.id, leaveType.id));

          if (carryMode !== 'none' && prevBalanceData) {
            carriedForward = getCarriedForwardAmount(carryMode, prevBalanceData.balance);
            if (carriedForward !== 0) {
              result.balancesCarriedForward++;
            }
          }

          const totalBalance = defaultDays + carriedForward;

          balancesToInsert.push({
            employee_id: employee.id,
            leave_type_id: leaveType.id,
            organization_id: currentOrg.id,
            balance: totalBalance,
            year: year,
          });

          // Create separate log entries for complete audit trail
          if (creatorEmployeeId) {
            // 1. Year allocation log (if default_days > 0)
            if (defaultDays > 0) {
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                change_amount: defaultDays,
                previous_balance: runningBalance,
                new_balance: runningBalance + defaultDays,
                reason: `${year} default allocation`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "year_allocation",
              });
              runningBalance += defaultDays;
            }

            // 2. Carry forward logs (if applicable)
            if (carriedForward !== 0 && prevBalanceData) {
              // carry_forward_out on previous year
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                change_amount: -carriedForward,
                previous_balance: prevBalanceData.balance,
                new_balance: prevBalanceData.balance - carriedForward,
                reason: `Carried to ${year}`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "carry_forward_out",
              });

              // Track previous balance update
              prevBalanceUpdates.push({
                id: prevBalanceData.id,
                newBalance: prevBalanceData.balance - carriedForward,
              });

              // carry_forward_in on new year
              logsToInsert.push({
                employee_id: employee.id,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                change_amount: carriedForward,
                previous_balance: runningBalance,
                new_balance: runningBalance + carriedForward,
                reason: `Carried from ${previousYear}`,
                created_by: creatorEmployeeId,
                effective_date: `${year}-01-01`,
                action: "carry_forward_in",
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

      // 9. Update previous year balances
      for (const update of prevBalanceUpdates) {
        await supabase
          .from("leave_type_balances")
          .update({ balance: update.newBalance })
          .eq("id", update.id);
      }

      // 10. Batch insert logs
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

      // Get previous year balances with IDs for updating
      const { data: prevBalances } = await supabase
        .from("leave_type_balances")
        .select("id, leave_type_id, balance")
        .eq("employee_id", employeeId)
        .eq("year", previousYear);

      const prevBalanceMap = new Map<string, { id: string; balance: number }>(
        prevBalances?.map((b) => [b.leave_type_id, { id: b.id, balance: b.balance }]) || []
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
        let runningBalance = 0;

        const carryMode = leaveType.carry_forward_mode || 'none';
        const prevBalanceData = prevBalanceMap.get(leaveType.id);

        if (carryMode !== 'none' && prevBalanceData) {
          carriedForward = getCarriedForwardAmount(carryMode, prevBalanceData.balance);
        }

        const totalBalance = defaultDays + carriedForward;

        // Insert balance
        const { error: insertError } = await supabase
          .from("leave_type_balances")
          .insert({
            employee_id: employeeId,
            leave_type_id: leaveType.id,
            organization_id: currentOrg.id,
            balance: totalBalance,
            year: currentYear,
          });

        if (!insertError) {
          balancesCreated++;

          // Log the initialization with separate entries
          if (creatorEmployeeId) {
            const logsToInsert: LogEntry[] = [];

            // 1. Year allocation log
            if (defaultDays > 0) {
              logsToInsert.push({
                employee_id: employeeId,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                change_amount: defaultDays,
                previous_balance: runningBalance,
                new_balance: runningBalance + defaultDays,
                reason: `${currentYear} default allocation`,
                created_by: creatorEmployeeId,
                effective_date: `${currentYear}-01-01`,
                action: "year_allocation",
              });
              runningBalance += defaultDays;
            }

            // 2. Carry forward logs
            if (carriedForward !== 0 && prevBalanceData) {
              // carry_forward_out
              logsToInsert.push({
                employee_id: employeeId,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                change_amount: -carriedForward,
                previous_balance: prevBalanceData.balance,
                new_balance: prevBalanceData.balance - carriedForward,
                reason: `Carried to ${currentYear}`,
                created_by: creatorEmployeeId,
                effective_date: `${currentYear}-01-01`,
                action: "carry_forward_out",
              });

              // Update previous year balance
              await supabase
                .from("leave_type_balances")
                .update({ balance: prevBalanceData.balance - carriedForward })
                .eq("id", prevBalanceData.id);

              // carry_forward_in
              logsToInsert.push({
                employee_id: employeeId,
                organization_id: currentOrg.id,
                leave_type: leaveType.name,
                change_amount: carriedForward,
                previous_balance: runningBalance,
                new_balance: runningBalance + carriedForward,
                reason: `Carried from ${previousYear}`,
                created_by: creatorEmployeeId,
                effective_date: `${currentYear}-01-01`,
                action: "carry_forward_in",
              });
            }

            if (logsToInsert.length > 0) {
              await supabase.from("leave_balance_logs").insert(logsToInsert);
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
