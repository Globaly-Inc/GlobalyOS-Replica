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

    // Check if requesting user has admin-level access (owner, admin, hr, or super_admin)
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .in("role", ["owner", "admin", "hr", "super_admin"])
      .maybeSingle();

    if (!userRole) {
      return new Response(JSON.stringify({ 
        error: "Only Owner, Admin, or HR can delete team members",
        code: "ROLE_REQUIRED"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { employeeId, userId } = await req.json();

    if (!employeeId || !userId) {
      return new Response(JSON.stringify({ error: "Missing employeeId or userId" }), {
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

    // Delete in order to respect foreign key constraints
    // 1. Delete feed reactions by this employee
    await supabase.from("feed_reactions").delete().eq("employee_id", employeeId);

    // 2. Delete update mentions by this employee
    await supabase.from("update_mentions").delete().eq("employee_id", employeeId);

    // 3. Delete update mentions of updates created by this employee
    const { data: employeeUpdates } = await supabase
      .from("updates")
      .select("id")
      .eq("employee_id", employeeId);

    if (employeeUpdates && employeeUpdates.length > 0) {
      const updateIds = employeeUpdates.map((u) => u.id);
      await supabase.from("update_mentions").delete().in("update_id", updateIds);
      await supabase.from("feed_reactions").delete().in("target_id", updateIds);
    }

    // 4. Delete updates by this employee
    await supabase.from("updates").delete().eq("employee_id", employeeId);

    // 5. Delete kudos given by this employee
    await supabase.from("kudos").delete().eq("given_by_id", employeeId);

    // 6. Delete kudos received by this employee
    await supabase.from("kudos").delete().eq("employee_id", employeeId);

    // 7. Delete leave balance logs
    await supabase.from("leave_balance_logs").delete().eq("employee_id", employeeId);

    // 8. Delete leave type balances
    await supabase.from("leave_type_balances").delete().eq("employee_id", employeeId);

    // 9. Delete leave balances
    await supabase.from("leave_balances").delete().eq("employee_id", employeeId);

    // 10. Delete leave requests
    await supabase.from("leave_requests").delete().eq("employee_id", employeeId);

    // 11. Delete attendance records
    await supabase.from("attendance_records").delete().eq("employee_id", employeeId);

    // 12. Delete learning development records
    await supabase.from("learning_development").delete().eq("employee_id", employeeId);

    // 13. Delete employee documents
    await supabase.from("employee_documents").delete().eq("employee_id", employeeId);

    // 14. Delete employee projects
    await supabase.from("employee_projects").delete().eq("employee_id", employeeId);

    // 15. Delete position history
    await supabase.from("position_history").delete().eq("employee_id", employeeId);

    // 16. Delete profile summaries
    await supabase.from("profile_summaries").delete().eq("employee_id", employeeId);

    // 17. Delete achievements
    await supabase.from("achievements").delete().eq("employee_id", employeeId);

    // 18. Update direct reports to remove manager reference
    await supabase.from("employees").update({ manager_id: null }).eq("manager_id", employeeId);

    // 19. Delete notifications for this user
    await supabase.from("notifications").delete().eq("user_id", userId);

    // 20. Delete user roles
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // 21. Delete organization members
    await supabase.from("organization_members").delete().eq("user_id", userId);

    // 22. Delete push subscriptions
    await supabase.from("push_subscriptions").delete().eq("user_id", userId);

    // 23. Delete the employee record
    const { error: employeeError } = await supabase
      .from("employees")
      .delete()
      .eq("id", employeeId);

    if (employeeError) {
      throw new Error(`Failed to delete employee: ${employeeError.message}`);
    }

    // 24. Delete the profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      throw new Error(`Failed to delete profile: ${profileError.message}`);
    }

    // 25. Delete the auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error deleting team member:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
