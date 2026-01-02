import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackfillResult {
  employeesProcessed: number;
  logsCreated: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { organization_id, year, created_by } = await req.json();

    if (!organization_id || !year || !created_by) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: organization_id, year, created_by" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Backfilling leave init logs for org ${organization_id}, year ${year}`);

    const previousYear = year - 1;
    const result: BackfillResult = {
      employeesProcessed: 0,
      logsCreated: 0,
      errors: [],
    };

    // 1. Get all balances for the target year
    const { data: balances, error: balError } = await supabase
      .from("leave_type_balances")
      .select("id, employee_id, leave_type_id, balance, year")
      .eq("organization_id", organization_id)
      .eq("year", year);

    if (balError) throw balError;
    if (!balances?.length) {
      return new Response(
        JSON.stringify({ ...result, message: "No balances found for this year" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get existing logs for this year to avoid duplicates
    const { data: existingLogs } = await supabase
      .from("leave_balance_logs")
      .select("employee_id, leave_type")
      .eq("organization_id", organization_id)
      .in("action", ["year_allocation", "carry_forward_in", "year_init"])
      .gte("effective_date", `${year}-01-01`)
      .lte("effective_date", `${year}-12-31`);

    const existingSet = new Set(
      existingLogs?.map((l) => `${l.employee_id}-${l.leave_type}`) || []
    );

    // 3. Get leave types
    const { data: leaveTypes } = await supabase
      .from("leave_types")
      .select("id, name, default_days, carry_forward_mode")
      .eq("organization_id", organization_id);

    const leaveTypeMap = new Map(leaveTypes?.map((lt) => [lt.id, lt]) || []);

    // 4. Get previous year balances
    const { data: prevBalances } = await supabase
      .from("leave_type_balances")
      .select("employee_id, leave_type_id, balance")
      .eq("organization_id", organization_id)
      .eq("year", previousYear);

    const prevBalanceMap = new Map(
      prevBalances?.map((b) => [`${b.employee_id}-${b.leave_type_id}`, b.balance]) || []
    );

    // Helper function
    const getCarriedForwardAmount = (mode: string, prevBalance: number): number => {
      switch (mode) {
        case "positive_only": return Math.max(0, prevBalance);
        case "negative_only": return Math.min(0, prevBalance);
        case "all": return prevBalance;
        default: return 0;
      }
    };

    // 5. Process each balance
    const logsToInsert: any[] = [];
    const processedEmployees = new Set<string>();

    for (const balance of balances) {
      const leaveType = leaveTypeMap.get(balance.leave_type_id);
      if (!leaveType) continue;

      const key = `${balance.employee_id}-${leaveType.name}`;
      if (existingSet.has(key)) continue;

      processedEmployees.add(balance.employee_id);

      const defaultDays = leaveType.default_days || 0;
      const carryMode = leaveType.carry_forward_mode || "none";
      const prevBalance = prevBalanceMap.get(`${balance.employee_id}-${balance.leave_type_id}`) ?? 0;
      const carriedForward = carryMode !== "none" ? getCarriedForwardAmount(carryMode, prevBalance) : 0;

      let runningBalance = 0;

      // Create year_allocation log
      if (defaultDays > 0) {
        logsToInsert.push({
          employee_id: balance.employee_id,
          organization_id,
          leave_type: leaveType.name,
          change_amount: defaultDays,
          previous_balance: runningBalance,
          new_balance: runningBalance + defaultDays,
          reason: `${year} default allocation (backfill)`,
          created_by,
          effective_date: `${year}-01-01`,
          action: "year_allocation",
        });
        runningBalance += defaultDays;
      }

      // Create carry_forward_in log
      if (carriedForward !== 0) {
        logsToInsert.push({
          employee_id: balance.employee_id,
          organization_id,
          leave_type: leaveType.name,
          change_amount: carriedForward,
          previous_balance: runningBalance,
          new_balance: runningBalance + carriedForward,
          reason: `Carried from ${previousYear} (backfill)`,
          created_by,
          effective_date: `${year}-01-01`,
          action: "carry_forward_in",
        });
      }
    }

    result.employeesProcessed = processedEmployees.size;

    // 6. Insert logs in batches
    if (logsToInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < logsToInsert.length; i += batchSize) {
        const batch = logsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("leave_balance_logs")
          .insert(batch);

        if (insertError) {
          result.errors.push(`Batch ${i / batchSize + 1}: ${insertError.message}`);
        } else {
          result.logsCreated += batch.length;
        }
      }
    }

    console.log(`Backfill complete: ${result.logsCreated} logs created for ${result.employeesProcessed} employees`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
