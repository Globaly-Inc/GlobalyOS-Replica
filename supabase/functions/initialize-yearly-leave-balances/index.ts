/**
 * Edge function to automatically initialize yearly leave balances
 * for all organizations. Called by pg_cron on January 1st each year.
 *
 * Uses the 3-transaction audit model: year_allocation, carry_forward_out, carry_forward_in
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Calculate carried forward amount based on mode
 */
function getCarriedForwardAmount(mode: string, previousBalance: number): number {
  switch (mode) {
    case "positive_only":
      return Math.max(0, previousBalance);
    case "negative_only":
      return Math.min(0, previousBalance);
    case "all":
      return previousBalance;
    case "none":
    default:
      return 0;
  }
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
  year: number;
}

interface OrgResult {
  organization_id: string;
  organization_name: string;
  employees_processed: number;
  balances_created: number;
  balances_carried_forward: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse year from query params or request body (defaults to current year)
    const url = new URL(req.url);
    let year = parseInt(url.searchParams.get("year") || "");

    if (!year || isNaN(year)) {
      try {
        const body = await req.json();
        year = body.year || new Date().getFullYear();
      } catch {
        year = new Date().getFullYear();
      }
    }

    const previousYear = year - 1;
    console.log(`Starting yearly leave balance initialization for year ${year}`);

    // 1. Get all organizations with active employees
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name");

    if (orgsError) {
      throw new Error(`Failed to fetch organizations: ${orgsError.message}`);
    }

    if (!orgs || orgs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No organizations found",
          year,
          results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${orgs.length} organizations to process`);

    const results: OrgResult[] = [];

    // 2. Process each organization
    for (const org of orgs) {
      const orgResult: OrgResult = {
        organization_id: org.id,
        organization_name: org.name,
        employees_processed: 0,
        balances_created: 0,
        balances_carried_forward: 0,
        errors: [],
      };

      try {
        // 2a. Get all active employees for this org
        const { data: employees, error: empError } = await supabase
          .from("employees")
          .select("id, office_id, gender, employment_type")
          .eq("organization_id", org.id)
          .eq("status", "active");

        if (empError) {
          orgResult.errors.push(`Failed to fetch employees: ${empError.message}`);
          results.push(orgResult);
          continue;
        }

        if (!employees || employees.length === 0) {
          console.log(`No active employees for org ${org.name}`);
          results.push(orgResult);
          continue;
        }

        console.log(`Processing ${employees.length} employees for org ${org.name}`);

        // 2b. Get all active leave types
        const { data: leaveTypes, error: ltError } = await supabase
          .from("leave_types")
          .select(
            "id, name, default_days, applies_to_all_offices, applies_to_gender, applies_to_employment_types, carry_forward_mode"
          )
          .eq("organization_id", org.id)
          .eq("is_active", true);

        if (ltError) {
          orgResult.errors.push(`Failed to fetch leave types: ${ltError.message}`);
          results.push(orgResult);
          continue;
        }

        if (!leaveTypes || leaveTypes.length === 0) {
          console.log(`No active leave types for org ${org.name}`);
          results.push(orgResult);
          continue;
        }

        // 2c. Get existing balances for target year (to skip)
        const { data: existingBalances } = await supabase
          .from("leave_type_balances")
          .select("employee_id, leave_type_id")
          .eq("organization_id", org.id)
          .eq("year", year);

        const existingKey = (empId: string, ltId: string) => `${empId}-${ltId}`;
        const existingSet = new Set(
          existingBalances?.map((b) => existingKey(b.employee_id, b.leave_type_id)) || []
        );

        // 2d. Get previous year balances for carry forward
        const { data: prevBalances } = await supabase
          .from("leave_type_balances")
          .select("employee_id, leave_type_id, balance")
          .eq("organization_id", org.id)
          .eq("year", previousYear);

        const prevBalanceMap = new Map<string, number>();
        prevBalances?.forEach((b) => {
          prevBalanceMap.set(existingKey(b.employee_id, b.leave_type_id), b.balance);
        });

        // 2e. Get leave type office mappings
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

        // 2f. Get a system admin employee for created_by (first admin/owner)
        const { data: adminEmployee } = await supabase
          .from("employees")
          .select("id")
          .eq("organization_id", org.id)
          .in("role", ["owner", "admin"])
          .eq("status", "active")
          .limit(1)
          .single();

        const creatorEmployeeId = adminEmployee?.id;

        if (!creatorEmployeeId) {
          orgResult.errors.push("No admin/owner found to use as creator");
          results.push(orgResult);
          continue;
        }

        // 2g. Process each employee
        const logsToInsert: LogEntry[] = [];

        for (const employee of employees) {
          orgResult.employees_processed++;

          for (const leaveType of leaveTypes) {
            // Skip if balance already exists
            if (existingSet.has(existingKey(employee.id, leaveType.id))) {
              continue;
            }

            // Check eligibility - Gender
            const genderRestriction = leaveType.applies_to_gender || "all";
            if (genderRestriction !== "all" && employee.gender !== genderRestriction) {
              continue;
            }

            // Check eligibility - Employment type
            const empTypes = leaveType.applies_to_employment_types as string[] | null;
            if (
              empTypes &&
              empTypes.length > 0 &&
              employee.employment_type &&
              !empTypes.includes(employee.employment_type)
            ) {
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

            // Check for carry forward based on mode
            const carryMode = leaveType.carry_forward_mode || "none";
            const prevBalance = prevBalanceMap.get(existingKey(employee.id, leaveType.id));

            if (carryMode !== "none" && prevBalance !== undefined) {
              carriedForward = getCarriedForwardAmount(carryMode, prevBalance);
              if (carriedForward !== 0) {
                orgResult.balances_carried_forward++;
              }
            }

            // Log 1: Year allocation (default days)
            logsToInsert.push({
              employee_id: employee.id,
              organization_id: org.id,
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
                organization_id: org.id,
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
                organization_id: org.id,
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

            orgResult.balances_created++;
          }
        }

        // 2h. Batch insert logs - sync_balance_from_log trigger handles balance creation
        if (logsToInsert.length > 0) {
          // Insert in batches of 500 to avoid request size limits
          const batchSize = 500;
          for (let i = 0; i < logsToInsert.length; i += batchSize) {
            const batch = logsToInsert.slice(i, i + batchSize);
            const { error: logError } = await supabase
              .from("leave_balance_logs")
              .insert(batch);

            if (logError) {
              orgResult.errors.push(
                `Failed to insert logs batch ${i / batchSize + 1}: ${logError.message}`
              );
            }
          }
        }

        console.log(
          `Org ${org.name}: ${orgResult.employees_processed} employees, ${orgResult.balances_created} balances created, ${orgResult.balances_carried_forward} carried forward`
        );
      } catch (orgError) {
        orgResult.errors.push(
          `Unexpected error: ${orgError instanceof Error ? orgError.message : String(orgError)}`
        );
      }

      results.push(orgResult);
    }

    // 3. Summary
    const totalOrgs = results.length;
    const successfulOrgs = results.filter((r) => r.errors.length === 0).length;
    const totalEmployees = results.reduce((sum, r) => sum + r.employees_processed, 0);
    const totalBalances = results.reduce((sum, r) => sum + r.balances_created, 0);
    const totalCarriedForward = results.reduce(
      (sum, r) => sum + r.balances_carried_forward,
      0
    );
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(
      `Completed: ${successfulOrgs}/${totalOrgs} orgs, ${totalEmployees} employees, ${totalBalances} balances, ${totalCarriedForward} carried forward, ${totalErrors} errors`
    );

    return new Response(
      JSON.stringify({
        success: true,
        year,
        summary: {
          organizations_processed: totalOrgs,
          organizations_successful: successfulOrgs,
          total_employees_processed: totalEmployees,
          total_balances_created: totalBalances,
          total_carried_forward: totalCarriedForward,
          total_errors: totalErrors,
        },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in initialize-yearly-leave-balances:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
