/**
 * Edge function to automatically initialize yearly leave balances
 * for all organizations. Called by pg_cron on January 1st each year.
 *
 * Uses the 3-transaction audit model: year_allocation, carry_forward_out, carry_forward_in
 * Now OFFICE-AWARE: Uses office_leave_types table and respects office leave year start dates
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { differenceInDays, parseISO, addYears, subDays } from "https://esm.sh/date-fns@3.6.0";

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

/**
 * Calculate prorated balance for mid-year hires
 */
function calculateProratedBalance(
  defaultDays: number,
  hireDate: Date,
  leaveYearStart: Date,
  leaveYearEnd: Date
): number {
  if (hireDate <= leaveYearStart) return defaultDays;
  if (hireDate >= leaveYearEnd) return 0;

  const totalDaysInYear = differenceInDays(leaveYearEnd, leaveYearStart);
  const daysRemaining = differenceInDays(leaveYearEnd, hireDate);
  return Math.round((defaultDays * daysRemaining / totalDaysInYear) * 10) / 10;
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
  year: number;
}

interface OfficeResult {
  office_id: string;
  office_name: string;
  employees_processed: number;
  balances_created: number;
  balances_carried_forward: number;
  balances_prorated: number;
  errors: string[];
}

interface OrgResult {
  organization_id: string;
  organization_name: string;
  offices_processed: number;
  total_employees_processed: number;
  total_balances_created: number;
  total_balances_carried_forward: number;
  total_balances_prorated: number;
  office_results: OfficeResult[];
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
    console.log(`Starting yearly leave balance initialization for year ${year} (office-aware)`);

    // 1. Get all organizations
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
        offices_processed: 0,
        total_employees_processed: 0,
        total_balances_created: 0,
        total_balances_carried_forward: 0,
        total_balances_prorated: 0,
        office_results: [],
        errors: [],
      };

      try {
        // 2a. Get all offices with leave settings
        const { data: offices, error: officesError } = await supabase
          .from("offices")
          .select("id, name, leave_enabled, leave_year_start_month, leave_year_start_day")
          .eq("organization_id", org.id);

        if (officesError) {
          orgResult.errors.push(`Failed to fetch offices: ${officesError.message}`);
          results.push(orgResult);
          continue;
        }

        // 2b. Get a system admin employee for created_by (first admin/owner)
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

        // 2c. Process each office
        for (const office of offices || []) {
          // Skip offices with leave disabled
          if (office.leave_enabled === false) {
            console.log(`Skipping office ${office.name} - leave disabled`);
            continue;
          }

          const officeResult: OfficeResult = {
            office_id: office.id,
            office_name: office.name,
            employees_processed: 0,
            balances_created: 0,
            balances_carried_forward: 0,
            balances_prorated: 0,
            errors: [],
          };

          // Calculate leave year dates based on office settings
          const leaveYearStartMonth = office.leave_year_start_month || 1;
          const leaveYearStartDay = office.leave_year_start_day || 1;
          const leaveYearStartStr = `${year}-${String(leaveYearStartMonth).padStart(2, '0')}-${String(leaveYearStartDay).padStart(2, '0')}`;
          const leaveYearStart = parseISO(leaveYearStartStr);
          const leaveYearEnd = subDays(addYears(leaveYearStart, 1), 1);

          // 2d. Get active employees in this office
          const { data: employees, error: empError } = await supabase
            .from("employees")
            .select("id, office_id, gender, employment_type, hire_date")
            .eq("organization_id", org.id)
            .eq("office_id", office.id)
            .eq("status", "active");

          if (empError) {
            officeResult.errors.push(`Failed to fetch employees: ${empError.message}`);
            orgResult.office_results.push(officeResult);
            continue;
          }

          if (!employees || employees.length === 0) {
            console.log(`No active employees in office ${office.name}`);
            orgResult.office_results.push(officeResult);
            continue;
          }

          // 2e. Get office leave types
          const { data: officeLeaveTypes, error: oltError } = await supabase
            .from("office_leave_types")
            .select("id, name, default_days, applies_to_gender, applies_to_employment_types, carry_forward_mode")
            .eq("office_id", office.id)
            .eq("is_active", true);

          if (oltError) {
            officeResult.errors.push(`Failed to fetch office leave types: ${oltError.message}`);
            orgResult.office_results.push(officeResult);
            continue;
          }

          if (!officeLeaveTypes || officeLeaveTypes.length === 0) {
            console.log(`No active office leave types for office ${office.name}`);
            orgResult.office_results.push(officeResult);
            continue;
          }

          // 2f. Get existing balances for target year (to skip duplicates)
          const { data: existingBalances } = await supabase
            .from("leave_type_balances")
            .select("employee_id, office_leave_type_id")
            .eq("organization_id", org.id)
            .eq("year", year)
            .not("office_leave_type_id", "is", null);

          const existingKey = (empId: string, oltId: string) => `${empId}-${oltId}`;
          const existingSet = new Set(
            existingBalances?.map((b) => existingKey(b.employee_id, b.office_leave_type_id!)) || []
          );

          // 2g. Get previous year balances for carry forward
          const { data: prevBalances } = await supabase
            .from("leave_type_balances")
            .select("employee_id, office_leave_type_id, balance")
            .eq("organization_id", org.id)
            .eq("year", previousYear)
            .not("office_leave_type_id", "is", null);

          const prevBalanceMap = new Map<string, number>();
          prevBalances?.forEach((b) => {
            if (b.office_leave_type_id) {
              prevBalanceMap.set(existingKey(b.employee_id, b.office_leave_type_id), b.balance);
            }
          });

          // 2h. Process each employee in this office
          const logsToInsert: LogEntry[] = [];

          for (const employee of employees) {
            officeResult.employees_processed++;

            for (const leaveType of officeLeaveTypes) {
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

              // Calculate base allocation (with proration if applicable)
              const defaultDays = leaveType.default_days || 0;
              let allocatedDays = defaultDays;
              let wasProrated = false;

              // Apply proration for mid-year hires
              if (employee.hire_date) {
                const hireDate = parseISO(employee.hire_date);
                const prorated = calculateProratedBalance(defaultDays, hireDate, leaveYearStart, leaveYearEnd);
                if (prorated < defaultDays) {
                  allocatedDays = prorated;
                  wasProrated = true;
                  officeResult.balances_prorated++;
                }
              }

              // Calculate carry forward
              let carriedForward = 0;
              const carryMode = leaveType.carry_forward_mode || "none";
              const prevBalance = prevBalanceMap.get(existingKey(employee.id, leaveType.id));

              if (carryMode !== "none" && prevBalance !== undefined) {
                carriedForward = getCarriedForwardAmount(carryMode, prevBalance);
                if (carriedForward !== 0) {
                  officeResult.balances_carried_forward++;
                }
              }

              // Log 1: Year allocation
              const allocationReason = wasProrated
                ? `${year} prorated allocation (hired ${employee.hire_date})`
                : `${year} annual allocation`;

              logsToInsert.push({
                employee_id: employee.id,
                organization_id: org.id,
                leave_type: leaveType.name,
                leave_type_id: leaveType.id, // For backward compatibility
                office_leave_type_id: leaveType.id,
                change_amount: allocatedDays,
                previous_balance: 0,
                new_balance: allocatedDays,
                reason: allocationReason,
                created_by: creatorEmployeeId,
                effective_date: leaveYearStartStr,
                action: wasProrated ? "proration_adjustment" : "year_allocation",
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
                  office_leave_type_id: leaveType.id,
                  change_amount: -carriedForward,
                  previous_balance: prevBalance,
                  new_balance: prevBalance - carriedForward,
                  reason: `Carried forward to ${year}`,
                  created_by: creatorEmployeeId,
                  effective_date: leaveYearStartStr,
                  action: "carry_forward_out",
                  year: previousYear,
                });

                // carry_forward_in: Addition to new year
                logsToInsert.push({
                  employee_id: employee.id,
                  organization_id: org.id,
                  leave_type: leaveType.name,
                  leave_type_id: leaveType.id,
                  office_leave_type_id: leaveType.id,
                  change_amount: carriedForward,
                  previous_balance: allocatedDays,
                  new_balance: allocatedDays + carriedForward,
                  reason: `Carried from ${previousYear}`,
                  created_by: creatorEmployeeId,
                  effective_date: leaveYearStartStr,
                  action: "carry_forward_in",
                  year: year,
                });
              }

              officeResult.balances_created++;
            }
          }

          // 2i. Batch insert logs
          if (logsToInsert.length > 0) {
            const batchSize = 500;
            for (let i = 0; i < logsToInsert.length; i += batchSize) {
              const batch = logsToInsert.slice(i, i + batchSize);
              const { error: logError } = await supabase
                .from("leave_balance_logs")
                .insert(batch);

              if (logError) {
                officeResult.errors.push(
                  `Failed to insert logs batch ${i / batchSize + 1}: ${logError.message}`
                );
              }
            }
          }

          orgResult.offices_processed++;
          orgResult.total_employees_processed += officeResult.employees_processed;
          orgResult.total_balances_created += officeResult.balances_created;
          orgResult.total_balances_carried_forward += officeResult.balances_carried_forward;
          orgResult.total_balances_prorated += officeResult.balances_prorated;
          orgResult.office_results.push(officeResult);

          console.log(
            `Office ${office.name}: ${officeResult.employees_processed} employees, ${officeResult.balances_created} balances created, ${officeResult.balances_prorated} prorated, ${officeResult.balances_carried_forward} carried forward`
          );
        }

        console.log(
          `Org ${org.name}: ${orgResult.offices_processed} offices, ${orgResult.total_employees_processed} employees, ${orgResult.total_balances_created} balances`
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
    const totalOffices = results.reduce((sum, r) => sum + r.offices_processed, 0);
    const totalEmployees = results.reduce((sum, r) => sum + r.total_employees_processed, 0);
    const totalBalances = results.reduce((sum, r) => sum + r.total_balances_created, 0);
    const totalCarriedForward = results.reduce((sum, r) => sum + r.total_balances_carried_forward, 0);
    const totalProrated = results.reduce((sum, r) => sum + r.total_balances_prorated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(
      `Completed: ${successfulOrgs}/${totalOrgs} orgs, ${totalOffices} offices, ${totalEmployees} employees, ${totalBalances} balances, ${totalCarriedForward} carried forward, ${totalProrated} prorated, ${totalErrors} errors`
    );

    return new Response(
      JSON.stringify({
        success: true,
        year,
        summary: {
          organizations_processed: totalOrgs,
          organizations_successful: successfulOrgs,
          total_offices_processed: totalOffices,
          total_employees_processed: totalEmployees,
          total_balances_created: totalBalances,
          total_carried_forward: totalCarriedForward,
          total_prorated: totalProrated,
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
