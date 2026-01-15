import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the requesting user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STRICT: Only super_admin can use this function
    const { data: superAdminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!superAdminRole) {
      console.log(`User ${requestingUser.id} attempted to delete user without super_admin role`);
      return new Response(JSON.stringify({ 
        error: "Super Admin access required",
        code: "SUPER_ADMIN_REQUIRED"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (userId === requestingUser.id) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Super admin ${requestingUser.id} deleting user ${userId}`);

    // Get all employee records for this user (could be multiple across different orgs)
    const { data: employees } = await supabase
      .from("employees")
      .select("id, organization_id")
      .eq("user_id", userId);

    console.log(`Found ${employees?.length || 0} employee records for user ${userId}`);

    // Delete employee-related data for each employee record
    if (employees && employees.length > 0) {
      for (const emp of employees) {
        console.log(`Deleting data for employee ${emp.id} in org ${emp.organization_id}`);
        
        // 1. Delete feed reactions by this employee
        await supabase.from("feed_reactions").delete().eq("employee_id", emp.id);

        // 2. Delete update mentions by this employee
        await supabase.from("update_mentions").delete().eq("employee_id", emp.id);

        // 3. Delete update mentions of updates created by this employee
        const { data: employeeUpdates } = await supabase
          .from("updates")
          .select("id")
          .eq("employee_id", emp.id);

        if (employeeUpdates && employeeUpdates.length > 0) {
          const updateIds = employeeUpdates.map((u) => u.id);
          await supabase.from("update_mentions").delete().in("update_id", updateIds);
          await supabase.from("feed_reactions").delete().in("target_id", updateIds);
        }

        // 4. Delete updates by this employee
        await supabase.from("updates").delete().eq("employee_id", emp.id);

        // 5. Delete kudos given by this employee
        await supabase.from("kudos").delete().eq("given_by_id", emp.id);

        // 6. Delete kudos received by this employee
        await supabase.from("kudos").delete().eq("employee_id", emp.id);

        // 7. Delete leave balance logs
        await supabase.from("leave_balance_logs").delete().eq("employee_id", emp.id);

        // 8. Delete leave type balances
        await supabase.from("leave_type_balances").delete().eq("employee_id", emp.id);

        // 9. Delete leave balances
        await supabase.from("leave_balances").delete().eq("employee_id", emp.id);

        // 10. Delete leave requests
        await supabase.from("leave_requests").delete().eq("employee_id", emp.id);

        // 11. Delete attendance records
        await supabase.from("attendance_records").delete().eq("employee_id", emp.id);

        // 12. Delete learning development records
        await supabase.from("learning_development").delete().eq("employee_id", emp.id);

        // 13. Delete employee documents
        await supabase.from("employee_documents").delete().eq("employee_id", emp.id);

        // 14. Delete employee projects
        await supabase.from("employee_projects").delete().eq("employee_id", emp.id);

        // 15. Delete position history
        await supabase.from("position_history").delete().eq("employee_id", emp.id);

        // 16. Delete profile summaries
        await supabase.from("profile_summaries").delete().eq("employee_id", emp.id);

        // 17. Delete achievements
        await supabase.from("achievements").delete().eq("employee_id", emp.id);

        // 18. Delete attendance hour balances
        await supabase.from("attendance_hour_balances").delete().eq("employee_id", emp.id);

        // 19. Delete attendance leave adjustments
        await supabase.from("attendance_leave_adjustments").delete().eq("employee_id", emp.id);

        // 20. Delete attendance not checked in
        await supabase.from("attendance_not_checked_in").delete().eq("employee_id", emp.id);

        // 21. Delete attendance reminders
        await supabase.from("attendance_reminders").delete().eq("employee_id", emp.id);

        // 22. Delete asset handovers
        await supabase.from("asset_handovers").delete().eq("employee_id", emp.id);

        // 23. Update direct reports to remove manager reference
        await supabase.from("employees").update({ manager_id: null }).eq("manager_id", emp.id);

        // 24. Delete the employee record
        const { error: employeeError } = await supabase
          .from("employees")
          .delete()
          .eq("id", emp.id);

        if (employeeError) {
          console.error(`Failed to delete employee ${emp.id}:`, employeeError);
        }
      }
    }

    // Delete user-level data (not tied to specific employee records)
    console.log(`Deleting user-level data for ${userId}`);

    // Delete notifications for this user
    await supabase.from("notifications").delete().eq("user_id", userId);

    // Delete user roles
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // Delete organization members
    await supabase.from("organization_members").delete().eq("user_id", userId);

    // Delete push subscriptions
    await supabase.from("push_subscriptions").delete().eq("user_id", userId);

    // Delete user page visits
    await supabase.from("user_page_visits").delete().eq("user_id", userId);

    // Delete user activity logs
    await supabase.from("user_activity_logs").delete().eq("user_id", userId);

    // Delete the profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error(`Failed to delete profile for ${userId}:`, profileError);
    }

    // Delete the auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
    }

    console.log(`Successfully deleted user ${userId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
