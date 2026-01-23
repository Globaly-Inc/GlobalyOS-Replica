/**
 * Migration edge function: migrate-leave-to-offices
 * 
 * Populates office_leave_types from existing leave_types and updates
 * leave_type_balances to set office_leave_type_id based on employee's office.
 * 
 * This is a one-time migration function to transition from org-level leave types
 * to per-office leave types.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MigrationResult {
  success: boolean;
  officeLeaveTypesCreated: number;
  balancesUpdated: number;
  errors: string[];
  details: {
    organizationsProcessed: number;
    officesProcessed: number;
    leaveTypesMigrated: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId, dryRun = false } = await req.json();

    const result: MigrationResult = {
      success: true,
      officeLeaveTypesCreated: 0,
      balancesUpdated: 0,
      errors: [],
      details: {
        organizationsProcessed: 0,
        officesProcessed: 0,
        leaveTypesMigrated: 0,
      },
    };

    // Get organizations to process
    let orgQuery = supabase
      .from("organizations")
      .select("id, name")
      .eq("org_onboarding_completed", true);

    if (organizationId) {
      orgQuery = orgQuery.eq("id", organizationId);
    }

    const { data: organizations, error: orgError } = await orgQuery;

    if (orgError) {
      throw new Error(`Failed to fetch organizations: ${orgError.message}`);
    }

    if (!organizations?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No organizations to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${organizations.length} organizations...`);

    for (const org of organizations) {
      result.details.organizationsProcessed++;
      console.log(`\nProcessing organization: ${org.name} (${org.id})`);

      // 1. Get all offices for this organization
      const { data: offices, error: officesError } = await supabase
        .from("offices")
        .select("id, name")
        .eq("organization_id", org.id);

      if (officesError) {
        result.errors.push(`Org ${org.id}: Failed to fetch offices - ${officesError.message}`);
        continue;
      }

      if (!offices?.length) {
        console.log(`  No offices found for org ${org.name}`);
        continue;
      }

      // 2. Get all existing leave_types for this organization
      const { data: leaveTypes, error: ltError } = await supabase
        .from("leave_types")
        .select(`
          id,
          name,
          category,
          description,
          default_days,
          min_days_advance,
          max_negative_days,
          applies_to_gender,
          applies_to_employment_types,
          applies_to_all_offices,
          is_active,
          is_system
        `)
        .eq("organization_id", org.id);

      if (ltError) {
        result.errors.push(`Org ${org.id}: Failed to fetch leave types - ${ltError.message}`);
        continue;
      }

      if (!leaveTypes?.length) {
        console.log(`  No leave types found for org ${org.name}`);
        continue;
      }

      // 3. Get leave_type_offices mappings for non-global leave types
      const { data: leaveTypeOffices } = await supabase
        .from("leave_type_offices")
        .select("leave_type_id, office_id")
        .in("leave_type_id", leaveTypes.map(lt => lt.id));

      const officesByLeaveType = new Map<string, string[]>();
      leaveTypeOffices?.forEach(lto => {
        if (!officesByLeaveType.has(lto.leave_type_id)) {
          officesByLeaveType.set(lto.leave_type_id, []);
        }
        officesByLeaveType.get(lto.leave_type_id)!.push(lto.office_id);
      });

      // 4. For each office, create office_leave_types
      for (const office of offices) {
        result.details.officesProcessed++;

        // Check if office_leave_types already exist for this office
        const { data: existingOLTs } = await supabase
          .from("office_leave_types")
          .select("id, name")
          .eq("office_id", office.id);

        const existingNames = new Set(existingOLTs?.map(olt => olt.name.toLowerCase()) || []);

        const officeLeaveTypesToInsert = [];

        for (const lt of leaveTypes) {
          // Skip if already exists
          if (existingNames.has(lt.name.toLowerCase())) {
            continue;
          }

          // Check if this leave type applies to this office
          const appliesGlobally = lt.applies_to_all_offices;
          const specificOffices = officesByLeaveType.get(lt.id) || [];
          
          if (!appliesGlobally && !specificOffices.includes(office.id)) {
            continue;
          }

          officeLeaveTypesToInsert.push({
            office_id: office.id,
            organization_id: org.id,
            name: lt.name,
            category: lt.category,
            description: lt.description,
            default_days: lt.default_days || 0,
            min_days_advance: lt.min_days_advance || 0,
            max_negative_days: lt.max_negative_days || 0,
            applies_to_gender: lt.applies_to_gender || 'all',
            applies_to_employment_types: lt.applies_to_employment_types,
            is_active: lt.is_active,
            is_system: lt.is_system,
            carry_forward_mode: 'positive_only',
          });
        }

        if (officeLeaveTypesToInsert.length > 0 && !dryRun) {
          const { error: insertError } = await supabase
            .from("office_leave_types")
            .insert(officeLeaveTypesToInsert);

          if (insertError) {
            result.errors.push(`Office ${office.id}: Failed to insert office leave types - ${insertError.message}`);
          } else {
            result.officeLeaveTypesCreated += officeLeaveTypesToInsert.length;
            result.details.leaveTypesMigrated += officeLeaveTypesToInsert.length;
            console.log(`  Created ${officeLeaveTypesToInsert.length} office leave types for ${office.name}`);
          }
        } else if (officeLeaveTypesToInsert.length > 0) {
          console.log(`  [DRY RUN] Would create ${officeLeaveTypesToInsert.length} office leave types for ${office.name}`);
          result.officeLeaveTypesCreated += officeLeaveTypesToInsert.length;
        }
      }

      // 5. Update leave_type_balances to set office_leave_type_id
      // Get all balances without office_leave_type_id for this org
      const { data: balancesToUpdate, error: balanceError } = await supabase
        .from("leave_type_balances")
        .select(`
          id,
          employee_id,
          leave_type_id,
          leave_type:leave_types!leave_type_id(name)
        `)
        .eq("organization_id", org.id)
        .is("office_leave_type_id", null);

      if (balanceError) {
        result.errors.push(`Org ${org.id}: Failed to fetch balances - ${balanceError.message}`);
        continue;
      }

      if (balancesToUpdate && balancesToUpdate.length > 0) {
        // Get employee office mappings
        const employeeIds = [...new Set(balancesToUpdate.map(b => b.employee_id))];
        const { data: employees } = await supabase
          .from("employees")
          .select("id, office_id")
          .in("id", employeeIds);

        const employeeOfficeMap = new Map<string, string>();
        employees?.forEach(emp => {
          if (emp.office_id) employeeOfficeMap.set(emp.id, emp.office_id);
        });

        // Get all office_leave_types for this org
        const { data: allOLTs } = await supabase
          .from("office_leave_types")
          .select("id, office_id, name")
          .eq("organization_id", org.id);

        // Create lookup: office_id + name.toLowerCase() -> office_leave_type_id
        const oltLookup = new Map<string, string>();
        allOLTs?.forEach(olt => {
          oltLookup.set(`${olt.office_id}-${olt.name.toLowerCase()}`, olt.id);
        });

        // Update each balance
        let balanceUpdates = 0;
        for (const balance of balancesToUpdate) {
          const officeId = employeeOfficeMap.get(balance.employee_id);
          if (!officeId) continue;

          const leaveTypeName = (balance.leave_type as any)?.name;
          if (!leaveTypeName) continue;

          const oltId = oltLookup.get(`${officeId}-${leaveTypeName.toLowerCase()}`);
          if (!oltId) continue;

          if (!dryRun) {
            const { error: updateError } = await supabase
              .from("leave_type_balances")
              .update({ office_leave_type_id: oltId })
              .eq("id", balance.id);

            if (updateError) {
              result.errors.push(`Balance ${balance.id}: Update failed - ${updateError.message}`);
            } else {
              balanceUpdates++;
            }
          } else {
            balanceUpdates++;
          }
        }

        result.balancesUpdated += balanceUpdates;
        console.log(`  ${dryRun ? '[DRY RUN] Would update' : 'Updated'} ${balanceUpdates} balance records`);
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`  Organizations processed: ${result.details.organizationsProcessed}`);
    console.log(`  Offices processed: ${result.details.officesProcessed}`);
    console.log(`  Office leave types created: ${result.officeLeaveTypesCreated}`);
    console.log(`  Balances updated: ${result.balancesUpdated}`);
    console.log(`  Errors: ${result.errors.length}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
