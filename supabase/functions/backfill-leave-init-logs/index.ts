import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackfillResult {
  employeesProcessed: number;
  logsCreated: number;
  balancesDeleted: number;
  balancesCreated: number;
  errors: string[];
}

interface EmployeeData {
  id: string;
  gender: string | null;
  office_id: string | null;
  employment_type: string | null;
}

interface LeaveTypeData {
  id: string;
  name: string;
  default_days: number;
  carry_forward_mode: string;
  applies_to_gender: string;
  applies_to_employment_types: string[] | null;
  applies_to_all_offices: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { organization_id, year, created_by, mode = "clean_reinit" } = await req.json();

    if (!organization_id || !year || !created_by) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: organization_id, year, created_by" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Backfilling leave init logs for org ${organization_id}, year ${year}, mode: ${mode}`);

    const previousYear = year - 1;
    const result: BackfillResult = {
      employeesProcessed: 0,
      logsCreated: 0,
      balancesDeleted: 0,
      balancesCreated: 0,
      errors: [],
    };

    // 1. Get all employees with their current position data (employment_type)
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, gender, office_id")
      .eq("organization_id", organization_id)
      .eq("status", "active");

    if (empError) throw empError;
    if (!employees?.length) {
      return new Response(
        JSON.stringify({ ...result, message: "No active employees found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get employment_type from position_history for each employee
    const employeeIds = employees.map(e => e.id);
    const { data: positionData } = await supabase
      .from("position_history")
      .select("employee_id, employment_type")
      .in("employee_id", employeeIds)
      .is("end_date", null)
      .order("effective_date", { ascending: false });

    // Build employment type map
    const employmentTypeMap = new Map<string, string>();
    positionData?.forEach(p => {
      if (!employmentTypeMap.has(p.employee_id)) {
        employmentTypeMap.set(p.employee_id, p.employment_type);
      }
    });

    // Enrich employees with employment_type
    const enrichedEmployees: EmployeeData[] = employees.map(e => ({
      id: e.id,
      gender: e.gender,
      office_id: e.office_id,
      employment_type: employmentTypeMap.get(e.id) || null,
    }));

    console.log(`Processing ${enrichedEmployees.length} employees`);

    // 2. Get all leave types with eligibility rules
    const { data: leaveTypes, error: ltError } = await supabase
      .from("leave_types")
      .select("id, name, default_days, carry_forward_mode, applies_to_gender, applies_to_employment_types, applies_to_all_offices")
      .eq("organization_id", organization_id)
      .eq("is_active", true);

    if (ltError) throw ltError;
    if (!leaveTypes?.length) {
      return new Response(
        JSON.stringify({ ...result, message: "No active leave types found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get leave type office assignments for non-global leave types
    const nonGlobalLeaveTypeIds = leaveTypes.filter(lt => !lt.applies_to_all_offices).map(lt => lt.id);
    const leaveTypeOfficesMap = new Map<string, string[]>();
    
    if (nonGlobalLeaveTypeIds.length > 0) {
      const { data: ltOffices } = await supabase
        .from("leave_type_offices")
        .select("leave_type_id, office_id")
        .in("leave_type_id", nonGlobalLeaveTypeIds);
      
      ltOffices?.forEach(lto => {
        const existing = leaveTypeOfficesMap.get(lto.leave_type_id) || [];
        existing.push(lto.office_id);
        leaveTypeOfficesMap.set(lto.leave_type_id, existing);
      });
    }

    // 4. Get existing balances for target year
    const { data: existingBalances, error: balError } = await supabase
      .from("leave_type_balances")
      .select("id, employee_id, leave_type_id, balance, year")
      .eq("organization_id", organization_id)
      .eq("year", year);

    if (balError) throw balError;

    // 5. Get existing logs for target year to check what already has proper logs
    const { data: existingLogs } = await supabase
      .from("leave_balance_logs")
      .select("employee_id, leave_type, leave_type_id, action")
      .eq("organization_id", organization_id)
      .in("action", ["year_allocation", "carry_forward_in", "year_init"])
      .gte("effective_date", `${year}-01-01`)
      .lte("effective_date", `${year}-12-31`);

    const hasInitLog = new Set(
      existingLogs?.map(l => `${l.employee_id}-${l.leave_type_id || l.leave_type}`) || []
    );

    // 6. Get previous year balances for carry forward
    const { data: prevBalances } = await supabase
      .from("leave_type_balances")
      .select("employee_id, leave_type_id, balance")
      .eq("organization_id", organization_id)
      .eq("year", previousYear);

    const prevBalanceMap = new Map(
      prevBalances?.map(b => [`${b.employee_id}-${b.leave_type_id}`, b.balance]) || []
    );

    // Helper: Check employee eligibility for leave type
    const isEligible = (emp: EmployeeData, lt: LeaveTypeData): boolean => {
      // Gender check
      if (lt.applies_to_gender !== 'all') {
        if (!emp.gender || emp.gender.toLowerCase() !== lt.applies_to_gender.toLowerCase()) {
          return false;
        }
      }

      // Employment type check
      if (lt.applies_to_employment_types && lt.applies_to_employment_types.length > 0) {
        if (!emp.employment_type || !lt.applies_to_employment_types.includes(emp.employment_type)) {
          return false;
        }
      }

      // Office check
      if (!lt.applies_to_all_offices) {
        const allowedOffices = leaveTypeOfficesMap.get(lt.id) || [];
        if (!emp.office_id || !allowedOffices.includes(emp.office_id)) {
          return false;
        }
      }

      return true;
    };

    // Helper: Calculate carry forward amount
    const getCarriedForwardAmount = (mode: string, prevBalance: number): number => {
      switch (mode) {
        case "positive_only": return Math.max(0, prevBalance);
        case "negative_only": return Math.min(0, prevBalance);
        case "all": return prevBalance;
        default: return 0;
      }
    };

    // 7. Process each employee and leave type
    const logsToInsert: Record<string, unknown>[] = [];
    const balancesToDelete: string[] = [];
    const balancesToCreate: Record<string, unknown>[] = [];
    const processedEmployees = new Set<string>();

    for (const employee of enrichedEmployees) {
      for (const leaveType of leaveTypes as LeaveTypeData[]) {
        const balanceKey = `${employee.id}-${leaveType.id}`;
        const existingBalance = existingBalances?.find(
          b => b.employee_id === employee.id && b.leave_type_id === leaveType.id
        );

        // Check eligibility
        const eligible = isEligible(employee, leaveType);

        if (existingBalance) {
          if (!eligible) {
            // Employee has balance but is NOT eligible - mark for deletion
            balancesToDelete.push(existingBalance.id);
            console.log(`Marking ineligible balance for deletion: ${employee.id} - ${leaveType.name} (employment_type: ${employee.employment_type})`);
            
            // Log the deletion
            logsToInsert.push({
              employee_id: employee.id,
              organization_id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: -(existingBalance.balance || 0),
              previous_balance: existingBalance.balance || 0,
              new_balance: 0,
              reason: `Balance removed - ${employee.employment_type || 'unknown'} not eligible for ${leaveType.name}`,
              created_by,
              effective_date: `${year}-01-01`,
              action: "balance_deleted",
              year: year,
            });
            continue;
          }

          // Eligible but check if already has init logs
          if (hasInitLog.has(balanceKey) || hasInitLog.has(`${employee.id}-${leaveType.name}`)) {
            continue; // Already has proper logs
          }

          // Needs logs created - calculate what they should be
          processedEmployees.add(employee.id);
          const defaultDays = leaveType.default_days || 0;
          const carryMode = leaveType.carry_forward_mode || "none";
          const prevBalance = prevBalanceMap.get(balanceKey) ?? 0;
          const carriedForward = carryMode !== "none" ? getCarriedForwardAmount(carryMode, prevBalance) : 0;

          let runningBalance = 0;

          // Create year_allocation log
          if (defaultDays > 0) {
            logsToInsert.push({
              employee_id: employee.id,
              organization_id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: defaultDays,
              previous_balance: runningBalance,
              new_balance: runningBalance + defaultDays,
              reason: `${year} annual allocation`,
              created_by,
              effective_date: `${year}-01-01`,
              action: "year_allocation",
              year: year,
            });
            runningBalance += defaultDays;
          }

          // Create carry_forward logs if applicable
          if (carriedForward !== 0) {
            // carry_forward_out on previous year
            logsToInsert.push({
              employee_id: employee.id,
              organization_id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: -carriedForward,
              previous_balance: prevBalance,
              new_balance: prevBalance - carriedForward,
              reason: `Carried forward to ${year}`,
              created_by,
              effective_date: `${previousYear}-12-31`,
              action: "carry_forward_out",
              year: previousYear,
            });

            // carry_forward_in on current year
            logsToInsert.push({
              employee_id: employee.id,
              organization_id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: carriedForward,
              previous_balance: runningBalance,
              new_balance: runningBalance + carriedForward,
              reason: `Carried from ${previousYear}`,
              created_by,
              effective_date: `${year}-01-01`,
              action: "carry_forward_in",
              year: year,
            });
          }
        } else if (eligible) {
          // No existing balance but employee IS eligible - create balance with proper logs
          processedEmployees.add(employee.id);
          const defaultDays = leaveType.default_days || 0;
          const carryMode = leaveType.carry_forward_mode || "none";
          const prevBalance = prevBalanceMap.get(balanceKey) ?? 0;
          const carriedForward = carryMode !== "none" ? getCarriedForwardAmount(carryMode, prevBalance) : 0;
          const totalBalance = defaultDays + carriedForward;

          // Create the balance
          balancesToCreate.push({
            employee_id: employee.id,
            organization_id,
            leave_type_id: leaveType.id,
            balance: totalBalance,
            year: year,
          });

          let runningBalance = 0;

          // Create year_allocation log
          if (defaultDays > 0) {
            logsToInsert.push({
              employee_id: employee.id,
              organization_id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: defaultDays,
              previous_balance: runningBalance,
              new_balance: runningBalance + defaultDays,
              reason: `${year} annual allocation`,
              created_by,
              effective_date: `${year}-01-01`,
              action: "year_allocation",
              year: year,
            });
            runningBalance += defaultDays;
          }

          // Create carry_forward logs if applicable
          if (carriedForward !== 0) {
            logsToInsert.push({
              employee_id: employee.id,
              organization_id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: -carriedForward,
              previous_balance: prevBalance,
              new_balance: prevBalance - carriedForward,
              reason: `Carried forward to ${year}`,
              created_by,
              effective_date: `${previousYear}-12-31`,
              action: "carry_forward_out",
              year: previousYear,
            });

            logsToInsert.push({
              employee_id: employee.id,
              organization_id,
              leave_type: leaveType.name,
              leave_type_id: leaveType.id,
              change_amount: carriedForward,
              previous_balance: runningBalance,
              new_balance: runningBalance + carriedForward,
              reason: `Carried from ${previousYear}`,
              created_by,
              effective_date: `${year}-01-01`,
              action: "carry_forward_in",
              year: year,
            });
          }
        }
      }
    }

    result.employeesProcessed = processedEmployees.size;

    // 8. Delete ineligible balances
    if (balancesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("leave_type_balances")
        .delete()
        .in("id", balancesToDelete);

      if (deleteError) {
        result.errors.push(`Delete balances: ${deleteError.message}`);
      } else {
        result.balancesDeleted = balancesToDelete.length;
        console.log(`Deleted ${balancesToDelete.length} ineligible balances`);
      }
    }

    // 9. Create new balances
    if (balancesToCreate.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < balancesToCreate.length; i += batchSize) {
        const batch = balancesToCreate.slice(i, i + batchSize);
        const { error: createError } = await supabase
          .from("leave_type_balances")
          .upsert(batch, { onConflict: "employee_id,leave_type_id,year" });

        if (createError) {
          result.errors.push(`Create balances batch ${i / batchSize + 1}: ${createError.message}`);
        } else {
          result.balancesCreated += batch.length;
        }
      }
    }

    // 10. Insert logs in batches
    if (logsToInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < logsToInsert.length; i += batchSize) {
        const batch = logsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("leave_balance_logs")
          .insert(batch);

        if (insertError) {
          result.errors.push(`Logs batch ${i / batchSize + 1}: ${insertError.message}`);
        } else {
          result.logsCreated += batch.length;
        }
      }
    }

    console.log(`Backfill complete: ${result.logsCreated} logs, ${result.balancesDeleted} deleted, ${result.balancesCreated} created`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
