import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PostEmployee {
  profiles: {
    full_name: string;
  } | null;
}

interface PostOrganization {
  name: string;
  code: string;
}

interface PostWithOrg {
  id: string;
  content: string;
  post_type: string;
  organization_id: string;
  employee_id: string;
  requires_acknowledgment: boolean;
  acknowledgment_deadline: string;
  last_ack_reminder_sent_at: string | null;
  ack_reminder_count: number;
  created_at: string;
  employee: PostEmployee | null;
  organizations: PostOrganization | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[post-acknowledgment-reminders] Starting reminder check...");

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find posts that need reminders:
    // - requires_acknowledgment = true
    // - has a deadline set
    // - deadline is within 48 hours OR already passed
    // - haven't sent a reminder in the last 24 hours
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        post_type,
        organization_id,
        employee_id,
        requires_acknowledgment,
        acknowledgment_deadline,
        last_ack_reminder_sent_at,
        ack_reminder_count,
        created_at,
        employee:employees!posts_employee_id_fkey (
          profiles (
            full_name
          )
        ),
        organizations (
          name,
          code
        )
      `)
      .eq("requires_acknowledgment", true)
      .not("acknowledgment_deadline", "is", null)
      .or(`last_ack_reminder_sent_at.is.null,last_ack_reminder_sent_at.lt.${twentyFourHoursAgo.toISOString()}`);

    if (postsError) {
      console.error("[post-acknowledgment-reminders] Error fetching posts:", postsError);
      throw postsError;
    }

    console.log(`[post-acknowledgment-reminders] Found ${posts?.length || 0} posts to check`);

    const postsNeedingReminders: PostWithOrg[] = [];
    const rawPosts = (posts || []) as unknown as PostWithOrg[];
    
    for (const post of rawPosts) {
      const deadline = new Date(post.acknowledgment_deadline);
      const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Send reminder if:
      // - 48 hours before deadline (first reminder)
      // - 24 hours before deadline (second reminder)
      // - On deadline day
      // - After deadline (overdue - daily reminders)
      const shouldRemind = hoursUntilDeadline <= 48;
      
      if (shouldRemind) {
        postsNeedingReminders.push(post);
      }
    }

    console.log(`[post-acknowledgment-reminders] ${postsNeedingReminders.length} posts need reminders`);

    let notificationsSent = 0;

    for (const post of postsNeedingReminders) {
      // Get employees who haven't acknowledged
      const { data: acknowledgments } = await supabase
        .from("post_acknowledgments")
        .select("employee_id")
        .eq("post_id", post.id);

      const acknowledgedEmployeeIds = new Set((acknowledgments || []).map(a => a.employee_id));

      // Get all employees in the organization who should see this post
      const { data: targetEmployees } = await supabase
        .from("employees")
        .select("id, user_id, profiles (full_name, email)")
        .eq("organization_id", post.organization_id)
        .eq("status", "active");

      if (!targetEmployees?.length) continue;

      const pendingEmployees = targetEmployees.filter(e => !acknowledgedEmployeeIds.has(e.id));
      
      if (pendingEmployees.length === 0) {
        console.log(`[post-acknowledgment-reminders] Post ${post.id} has full acknowledgment, skipping`);
        continue;
      }

      const deadline = new Date(post.acknowledgment_deadline);
      const isOverdue = deadline < now;
      const hoursUntilDeadline = Math.abs((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      // Determine reminder type
      let reminderType: string;
      let urgency: string;
      if (isOverdue) {
        reminderType = "overdue";
        urgency = "Overdue";
      } else if (hoursUntilDeadline <= 24) {
        reminderType = "urgent";
        urgency = "Due tomorrow";
      } else {
        reminderType = "approaching";
        urgency = "Due in 2 days";
      }

      const postTitle = post.content?.substring(0, 50) + (post.content?.length > 50 ? "..." : "") || "Post";
      const authorName = post.employee?.profiles?.full_name || "Someone";

      console.log(`[post-acknowledgment-reminders] Sending ${pendingEmployees.length} reminders for post ${post.id} (${reminderType})`);

      // Create notifications for pending employees
      const notifications = pendingEmployees.map(emp => ({
        user_id: emp.user_id,
        organization_id: post.organization_id,
        type: "acknowledgment_reminder",
        title: isOverdue 
          ? `Overdue: Acknowledgment Required` 
          : `Reminder: Acknowledgment Required`,
        message: `${authorName} posted "${postTitle}" that requires your acknowledgment. ${urgency}.`,
        reference_type: "post",
        reference_id: post.id,
        actor_id: post.employee_id,
        is_read: false,
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error(`[post-acknowledgment-reminders] Error creating notifications for post ${post.id}:`, notifError);
      } else {
        notificationsSent += notifications.length;
      }

      // Update post reminder tracking
      await supabase
        .from("posts")
        .update({
          last_ack_reminder_sent_at: now.toISOString(),
          ack_reminder_count: (post.ack_reminder_count || 0) + 1,
        })
        .eq("id", post.id);
    }

    console.log(`[post-acknowledgment-reminders] Complete. Sent ${notificationsSent} notifications.`);

    return new Response(
      JSON.stringify({
        success: true,
        postsProcessed: postsNeedingReminders.length,
        notificationsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[post-acknowledgment-reminders] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
