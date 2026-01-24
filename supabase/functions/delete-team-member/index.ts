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
    // FIX: Use .select() instead of .maybeSingle() to handle users with multiple roles
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .in("role", ["owner", "admin", "hr", "super_admin"]);

    if (!roleData || roleData.length === 0) {
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

    // Helper function to delete with logging
    const deleteWithLog = async (table: string, column: string, value: string) => {
      const { error } = await supabase.from(table).delete().eq(column, value);
      if (error) {
        console.error(`Failed to delete from ${table}: ${error.message}`);
      }
    };

    // Delete in order to respect foreign key constraints
    // ========== CHAT-RELATED CLEANUP ==========
    await deleteWithLog("chat_message_reactions", "employee_id", employeeId);
    await deleteWithLog("chat_message_read_receipts", "employee_id", employeeId);
    await deleteWithLog("chat_mentions", "employee_id", employeeId);
    await deleteWithLog("chat_favorites", "employee_id", employeeId);
    await deleteWithLog("chat_presence", "employee_id", employeeId);
    await deleteWithLog("chat_participants", "employee_id", employeeId);
    await deleteWithLog("chat_space_members", "employee_id", employeeId);
    
    // Delete chat pinned resources by this employee
    await deleteWithLog("chat_pinned_resources", "pinned_by", employeeId);
    
    // Delete messages sent by this employee
    await deleteWithLog("chat_messages", "sender_id", employeeId);
    
    // Delete conversations created by this employee
    await deleteWithLog("chat_conversations", "created_by", employeeId);
    
    // Delete spaces created/archived by this employee
    await supabase.from("chat_spaces").update({ archived_by: null }).eq("archived_by", employeeId);
    await deleteWithLog("chat_spaces", "created_by", employeeId);

    // ========== POST-RELATED CLEANUP ==========
    await deleteWithLog("post_reactions", "employee_id", employeeId);
    await deleteWithLog("post_acknowledgments", "employee_id", employeeId);
    await deleteWithLog("poll_votes", "employee_id", employeeId);
    
    // Delete comment reactions and mentions for comments by this employee
    const { data: employeeComments } = await supabase
      .from("post_comments")
      .select("id")
      .eq("employee_id", employeeId);
    
    if (employeeComments && employeeComments.length > 0) {
      const commentIds = employeeComments.map((c) => c.id);
      await supabase.from("comment_reactions").delete().in("comment_id", commentIds);
      await supabase.from("comment_mentions").delete().in("comment_id", commentIds);
    }
    
    await deleteWithLog("comment_reactions", "employee_id", employeeId);
    await deleteWithLog("comment_mentions", "employee_id", employeeId);
    await deleteWithLog("post_comments", "employee_id", employeeId);
    await deleteWithLog("post_mentions", "employee_id", employeeId);
    
    // Delete posts and their related data
    const { data: employeePosts } = await supabase
      .from("posts")
      .select("id")
      .eq("employee_id", employeeId);
    
    if (employeePosts && employeePosts.length > 0) {
      const postIds = employeePosts.map((p) => p.id);
      await supabase.from("post_reactions").delete().in("post_id", postIds);
      await supabase.from("post_acknowledgments").delete().in("post_id", postIds);
      await supabase.from("post_mentions").delete().in("post_id", postIds);
      await supabase.from("post_comments").delete().in("post_id", postIds);
      await supabase.from("poll_votes").delete().in("post_id", postIds);
    }
    
    await deleteWithLog("posts", "employee_id", employeeId);

    // ========== FEED-RELATED CLEANUP (legacy) ==========
    await deleteWithLog("feed_reactions", "employee_id", employeeId);
    await deleteWithLog("update_mentions", "employee_id", employeeId);

    const { data: employeeUpdates } = await supabase
      .from("updates")
      .select("id")
      .eq("employee_id", employeeId);

    if (employeeUpdates && employeeUpdates.length > 0) {
      const updateIds = employeeUpdates.map((u) => u.id);
      await supabase.from("update_mentions").delete().in("update_id", updateIds);
      await supabase.from("feed_reactions").delete().in("target_id", updateIds);
    }

    await deleteWithLog("updates", "employee_id", employeeId);
    await deleteWithLog("kudos", "given_by_id", employeeId);
    await deleteWithLog("kudos", "employee_id", employeeId);

    // ========== ATTENDANCE & SCHEDULE CLEANUP ==========
    await deleteWithLog("attendance_hour_balances", "employee_id", employeeId);
    await deleteWithLog("attendance_leave_adjustments", "employee_id", employeeId);
    await deleteWithLog("attendance_not_checked_in", "employee_id", employeeId);
    await deleteWithLog("attendance_reminders", "employee_id", employeeId);
    await deleteWithLog("attendance_reminders", "sent_by_employee_id", employeeId);
    await deleteWithLog("attendance_records", "employee_id", employeeId);
    await deleteWithLog("employee_schedules", "employee_id", employeeId);

    // ========== LEAVE CLEANUP ==========
    await deleteWithLog("leave_balance_logs", "employee_id", employeeId);
    await deleteWithLog("leave_type_balances", "employee_id", employeeId);
    await deleteWithLog("leave_balances", "employee_id", employeeId);
    await deleteWithLog("leave_requests", "employee_id", employeeId);

    // ========== WORKFLOW CLEANUP ==========
    // Get employee workflows first
    const { data: employeeWorkflows } = await supabase
      .from("employee_workflows")
      .select("id")
      .eq("employee_id", employeeId);
    
    if (employeeWorkflows && employeeWorkflows.length > 0) {
      const workflowIds = employeeWorkflows.map((w) => w.id);
      
      // Delete workflow tasks and related data
      const { data: workflowTasks } = await supabase
        .from("employee_workflow_tasks")
        .select("id")
        .in("workflow_id", workflowIds);
      
      if (workflowTasks && workflowTasks.length > 0) {
        const taskIds = workflowTasks.map((t) => t.id);
        await supabase.from("workflow_task_comments").delete().in("task_id", taskIds);
        await supabase.from("workflow_task_attachments").delete().in("task_id", taskIds);
      }
      
      await supabase.from("employee_workflow_tasks").delete().in("workflow_id", workflowIds);
      await supabase.from("workflow_activity_logs").delete().in("workflow_id", workflowIds);
      await supabase.from("workflow_stage_notes").delete().in("workflow_id", workflowIds);
      await supabase.from("workflow_stage_attachments").delete().in("workflow_id", workflowIds);
      await supabase.from("exit_interviews").delete().in("workflow_id", workflowIds);
      await supabase.from("knowledge_transfers").delete().in("workflow_id", workflowIds);
      await supabase.from("asset_handovers").delete().in("workflow_id", workflowIds);
    }
    
    // Also clean up where employee is assignee
    await deleteWithLog("workflow_task_comments", "employee_id", employeeId);
    await deleteWithLog("workflow_activity_logs", "performed_by", employeeId);
    await deleteWithLog("employee_workflow_tasks", "assignee_id", employeeId);
    await deleteWithLog("employee_workflows", "employee_id", employeeId);
    
    // Clean exit interviews and knowledge transfers by employee
    await deleteWithLog("exit_interviews", "employee_id", employeeId);
    await deleteWithLog("exit_interviews", "conducted_by", employeeId);
    await deleteWithLog("knowledge_transfers", "employee_id", employeeId);
    await deleteWithLog("knowledge_transfers", "recipient_id", employeeId);

    // ========== KPI CLEANUP ==========
    await deleteWithLog("kpi_ai_insights", "employee_id", employeeId);
    await deleteWithLog("kpi_activity_logs", "employee_id", employeeId);
    await deleteWithLog("kpi_activity_logs", "performed_by", employeeId);
    await deleteWithLog("kpi_updates", "employee_id", employeeId);
    await deleteWithLog("kpi_owners", "employee_id", employeeId);
    await deleteWithLog("kpis", "employee_id", employeeId);

    // ========== PERFORMANCE REVIEW CLEANUP ==========
    await deleteWithLog("performance_reviews", "employee_id", employeeId);
    await deleteWithLog("performance_reviews", "reviewer_id", employeeId);

    // ========== FINANCE/PAYROLL CLEANUP ==========
    await deleteWithLog("payslips", "employee_id", employeeId);
    await deleteWithLog("payroll_run_items", "employee_id", employeeId);
    await deleteWithLog("salary_structures", "employee_id", employeeId);
    await deleteWithLog("employee_bank_accounts", "employee_id", employeeId);

    // ========== WIKI CLEANUP ==========
    await deleteWithLog("wiki_page_members", "employee_id", employeeId);
    await deleteWithLog("wiki_folder_members", "employee_id", employeeId);

    // ========== OTHER HR CLEANUP ==========
    await deleteWithLog("learning_development", "employee_id", employeeId);
    await deleteWithLog("employee_documents", "employee_id", employeeId);
    await deleteWithLog("employee_projects", "employee_id", employeeId);
    await deleteWithLog("position_history", "employee_id", employeeId);
    await deleteWithLog("profile_summaries", "employee_id", employeeId);
    await deleteWithLog("achievements", "employee_id", employeeId);
    await deleteWithLog("wfh_requests", "employee_id", employeeId);
    await deleteWithLog("asset_handovers", "employee_id", employeeId);
    await deleteWithLog("asset_handovers", "verified_by", employeeId);
    await deleteWithLog("employee_onboarding_data", "employee_id", employeeId);
    await deleteWithLog("email_delivery_log", "employee_id", employeeId);

    // ========== CALENDAR CLEANUP ==========
    await deleteWithLog("calendar_events", "created_by", employeeId);

    // ========== FINAL CLEANUP ==========
    // Update direct reports to remove manager reference
    await supabase.from("employees").update({ manager_id: null }).eq("manager_id", employeeId);

    // Delete notifications for this user
    await deleteWithLog("notifications", "user_id", userId);

    // Delete user roles
    await deleteWithLog("user_roles", "user_id", userId);

    // Delete organization members
    await deleteWithLog("organization_members", "user_id", userId);

    // Delete push subscriptions
    await deleteWithLog("push_subscriptions", "user_id", userId);

    // Delete the employee record
    const { error: employeeError } = await supabase
      .from("employees")
      .delete()
      .eq("id", employeeId);

    if (employeeError) {
      throw new Error(`Failed to delete employee: ${employeeError.message}`);
    }

    // Delete the profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      throw new Error(`Failed to delete profile: ${profileError.message}`);
    }

    // Delete the auth user
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
    }

    console.log(`Successfully deleted team member: employeeId=${employeeId}, userId=${userId}`);

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
