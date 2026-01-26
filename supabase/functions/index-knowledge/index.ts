import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IndexRequest {
  organization_id: string;
  source_types?: string[]; // Optional: specific sources to index
  full_reindex?: boolean; // Whether to delete existing and rebuild
}

interface ContentItem {
  organization_id: string;
  source_type: string;
  source_id: string;
  title?: string;
  content: string;
  access_level: 'all' | 'self' | 'manager' | 'admin_hr' | 'owner';
  access_entities?: string[];
  metadata?: Record<string, unknown>;
}

// Helper to strip HTML tags
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Format date for birthday/anniversary
function formatMonthDay(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  } catch {
    return null;
  }
}

// Calculate years since date
function yearsSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, source_types, full_reindex = false }: IndexRequest = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`Starting knowledge indexing for org: ${organization_id}`);
    console.log(`Source types: ${source_types?.join(", ") || "all"}`);
    console.log(`Full reindex: ${full_reindex}`);

    // Get AI knowledge settings for this org
    const { data: settings } = await supabase
      .from("ai_knowledge_settings")
      .select("*")
      .eq("organization_id", organization_id)
      .maybeSingle();

    // Default all enabled if no settings
    const enabledSources = {
      wiki_page: settings?.wiki_enabled ?? true,
      announcement: settings?.announcements_enabled ?? true,
      team_member: settings?.team_directory_enabled ?? true,
      leave_record: settings?.leave_enabled ?? true,
      attendance: settings?.attendance_enabled ?? true,
      kpi: settings?.kpis_enabled ?? true,
      calendar_event: settings?.calendar_enabled ?? true,
      conversation_history: settings?.chat_enabled ?? true,
    };

    const contentItems: ContentItem[] = [];
    const sourcesToIndex = source_types || Object.keys(enabledSources);

    // ========================================
    // WIKI PAGES
    // ========================================
    if (sourcesToIndex.includes("wiki_page") && enabledSources.wiki_page) {
      console.log("Indexing wiki pages...");
      const { data: wikiPages } = await supabase
        .from("wiki_pages")
        .select("id, title, content, access_scope")
        .eq("organization_id", organization_id);

      wikiPages?.forEach(page => {
        contentItems.push({
          organization_id,
          source_type: "wiki_page",
          source_id: page.id,
          title: page.title,
          content: stripHtml(page.content || ""),
          access_level: page.access_scope === "private" ? "owner" : "all",
          metadata: { page_title: page.title },
        });
      });
      console.log(`Found ${wikiPages?.length || 0} wiki pages`);
    }

    // ========================================
    // ANNOUNCEMENTS
    // ========================================
    if (sourcesToIndex.includes("announcement") && enabledSources.announcement) {
      console.log("Indexing announcements...");
      const { data: announcements } = await supabase
        .from("posts")
        .select("id, content, type, created_at")
        .eq("organization_id", organization_id)
        .in("type", ["announcement", "win"]);

      announcements?.forEach(post => {
        contentItems.push({
          organization_id,
          source_type: "announcement",
          source_id: post.id,
          title: post.type === "announcement" ? "Company Announcement" : "Team Win",
          content: stripHtml(post.content || ""),
          access_level: "all",
          metadata: { type: post.type, date: post.created_at },
        });
      });
      console.log(`Found ${announcements?.length || 0} announcements`);
    }

    // ========================================
    // TEAM MEMBERS (Public info + Birthdays + Anniversaries)
    // ========================================
    if (sourcesToIndex.includes("team_member") && enabledSources.team_member) {
      console.log("Indexing team members...");
      const { data: employees } = await supabase
        .from("employees")
        .select(`
          id, position, department, start_date, date_of_birth,
          profiles!inner(full_name),
          offices(name)
        `)
        .eq("organization_id", organization_id)
        .eq("status", "active");

      employees?.forEach((emp: any) => {
        const birthdayFormatted = formatMonthDay(emp.date_of_birth);
        const tenure = yearsSince(emp.start_date);
        const anniversaryFormatted = formatMonthDay(emp.start_date);

        const content = `
Team member: ${emp.profiles?.full_name || "Unknown"}
Position: ${emp.position || "Not specified"}
Department: ${emp.department || "Not specified"}
Office: ${emp.offices?.name || "Not specified"}
${birthdayFormatted ? `Birthday: ${birthdayFormatted}` : ""}
${anniversaryFormatted ? `Work Anniversary: ${anniversaryFormatted}` : ""}
${tenure !== null ? `Tenure: ${tenure} year${tenure !== 1 ? "s" : ""} with the company` : ""}
        `.trim();

        contentItems.push({
          organization_id,
          source_type: "team_member",
          source_id: emp.id,
          title: emp.profiles?.full_name,
          content,
          access_level: "all",
          metadata: {
            employee_id: emp.id,
            department: emp.department,
            position: emp.position,
            birthday_month_day: birthdayFormatted,
            anniversary_month_day: anniversaryFormatted,
          },
        });
      });
      console.log(`Found ${employees?.length || 0} team members`);
    }

    // ========================================
    // LEAVE RECORDS (Private)
    // ========================================
    if (sourcesToIndex.includes("leave_record") && enabledSources.leave_record) {
      console.log("Indexing leave records...");
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select(`
          id, leave_type, start_date, end_date, days_count, status, reason,
          employee_id,
          employees!inner(manager_id)
        `)
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(500); // Limit for performance

      leaves?.forEach((leave: any) => {
        const content = `
Leave request:
Type: ${leave.leave_type}
Period: ${leave.start_date} to ${leave.end_date}
Duration: ${leave.days_count} days
Status: ${leave.status}
${leave.reason ? `Reason: ${leave.reason}` : ""}
        `.trim();

        contentItems.push({
          organization_id,
          source_type: "leave_record",
          source_id: leave.id,
          title: `${leave.leave_type} Leave Request`,
          content,
          access_level: "self",
          access_entities: leave.employees?.manager_id ? [leave.employees.manager_id] : [],
          metadata: {
            employee_id: leave.employee_id,
            manager_id: leave.employees?.manager_id,
            leave_type: leave.leave_type,
            status: leave.status,
            start_date: leave.start_date,
            end_date: leave.end_date,
          },
        });
      });
      console.log(`Found ${leaves?.length || 0} leave records`);
    }

    // ========================================
    // ATTENDANCE RECORDS (Private)
    // ========================================
    if (sourcesToIndex.includes("attendance") && enabledSources.attendance) {
      console.log("Indexing attendance records...");
      // Get last 30 days of attendance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: attendance } = await supabase
        .from("attendance_records")
        .select(`
          id, date, check_in_time, check_out_time, work_hours, status,
          employee_id,
          employees!inner(manager_id)
        `)
        .eq("organization_id", organization_id)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .limit(1000);

      // Group by employee for summary
      const employeeAttendance: Record<string, any[]> = {};
      attendance?.forEach((record: any) => {
        if (!employeeAttendance[record.employee_id]) {
          employeeAttendance[record.employee_id] = [];
        }
        employeeAttendance[record.employee_id].push(record);
      });

      Object.entries(employeeAttendance).forEach(([employeeId, records]) => {
        const avgHours = records.reduce((sum, r) => sum + (r.work_hours || 0), 0) / records.length;
        const lastRecord = records[0]; // Most recent

        const content = `
Attendance summary (last 30 days):
Total records: ${records.length}
Average work hours: ${avgHours.toFixed(1)} hours/day
Last check-in: ${lastRecord?.date} at ${lastRecord?.check_in_time || "N/A"}
Last check-out: ${lastRecord?.check_out_time || "N/A"}
        `.trim();

        contentItems.push({
          organization_id,
          source_type: "attendance",
          source_id: employeeId, // Use employee ID as source
          title: "Attendance Summary",
          content,
          access_level: "self",
          access_entities: lastRecord?.employees?.manager_id ? [lastRecord.employees.manager_id] : [],
          metadata: {
            employee_id: employeeId,
            manager_id: lastRecord?.employees?.manager_id,
            avg_hours: avgHours,
            record_count: records.length,
          },
        });
      });
      console.log(`Indexed attendance for ${Object.keys(employeeAttendance).length} employees`);
    }

    // ========================================
    // KPIs (Private)
    // ========================================
    if (sourcesToIndex.includes("kpi") && enabledSources.kpi) {
      console.log("Indexing KPIs...");
      const { data: kpis } = await supabase
        .from("kpis")
        .select(`
          id, title, description, target_value, current_value, unit, status, period, due_date,
          employee_id,
          employees!inner(manager_id)
        `)
        .eq("organization_id", organization_id)
        .limit(500);

      kpis?.forEach((kpi: any) => {
        const progress = kpi.target_value 
          ? ((kpi.current_value || 0) / kpi.target_value * 100).toFixed(0)
          : 0;

        const content = `
KPI/Goal: ${kpi.title}
${kpi.description ? `Description: ${kpi.description}` : ""}
Progress: ${kpi.current_value || 0}/${kpi.target_value || 0} ${kpi.unit || ""} (${progress}%)
Status: ${kpi.status || "N/A"}
Period: ${kpi.period || "N/A"}
${kpi.due_date ? `Due date: ${kpi.due_date}` : ""}
        `.trim();

        contentItems.push({
          organization_id,
          source_type: "kpi",
          source_id: kpi.id,
          title: kpi.title,
          content,
          access_level: "self",
          access_entities: kpi.employees?.manager_id ? [kpi.employees.manager_id] : [],
          metadata: {
            employee_id: kpi.employee_id,
            manager_id: kpi.employees?.manager_id,
            status: kpi.status,
            period: kpi.period,
            progress_percentage: Number(progress),
          },
        });
      });
      console.log(`Found ${kpis?.length || 0} KPIs`);
    }

    // ========================================
    // CALENDAR EVENTS
    // ========================================
    if (sourcesToIndex.includes("calendar_event") && enabledSources.calendar_event) {
      console.log("Indexing calendar events...");
      const { data: events } = await supabase
        .from("calendar_events")
        .select("id, title, start_date, end_date, event_type")
        .eq("organization_id", organization_id)
        .gte("end_date", new Date().toISOString().split("T")[0])
        .limit(100);

      events?.forEach(event => {
        const content = `
${event.event_type === "holiday" ? "Holiday" : "Event"}: ${event.title}
Date: ${event.start_date}${event.end_date !== event.start_date ? ` to ${event.end_date}` : ""}
Type: ${event.event_type}
        `.trim();

        contentItems.push({
          organization_id,
          source_type: "calendar_event",
          source_id: event.id,
          title: event.title,
          content,
          access_level: "all",
          metadata: {
            event_type: event.event_type,
            start_date: event.start_date,
            end_date: event.end_date,
          },
        });
      });
      console.log(`Found ${events?.length || 0} calendar events`);
    }

    // ========================================
    // AI CONVERSATION HISTORY (Private to user)
    // ========================================
    if (sourcesToIndex.includes("conversation_history") && enabledSources.conversation_history) {
      console.log("Indexing AI conversation history...");
      const { data: conversations } = await supabase
        .from("ai_conversations")
        .select(`
          id, title, user_id,
          ai_messages(role, content)
        `)
        .eq("organization_id", organization_id)
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false })
        .limit(100);

      // Get employee IDs for users
      const userIds = [...new Set(conversations?.map(c => c.user_id) || [])];
      const { data: userEmployees } = await supabase
        .from("employees")
        .select("id, user_id")
        .in("user_id", userIds);

      const userToEmployee: Record<string, string> = {};
      userEmployees?.forEach(e => { userToEmployee[e.user_id] = e.id; });

      conversations?.forEach((conv: any) => {
        const messages = conv.ai_messages || [];
        if (messages.length === 0) return;

        // Summarize conversation
        const userMessages = messages.filter((m: any) => m.role === "user").slice(0, 5);
        const content = `
Previous AI conversation: "${conv.title}"
Topics discussed:
${userMessages.map((m: any) => `- ${m.content.slice(0, 200)}...`).join("\n")}
        `.trim();

        const employeeId = userToEmployee[conv.user_id];

        contentItems.push({
          organization_id,
          source_type: "conversation_history",
          source_id: conv.id,
          title: conv.title,
          content,
          access_level: "self",
          metadata: {
            employee_id: employeeId,
            user_id: conv.user_id,
            message_count: messages.length,
          },
        });
      });
      console.log(`Found ${conversations?.length || 0} conversations`);
    }

    console.log(`Total items to index: ${contentItems.length}`);

    if (contentItems.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No content to index",
          indexed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If full reindex, delete existing embeddings for these source types
    if (full_reindex) {
      const typesToDelete = [...new Set(contentItems.map(i => i.source_type))];
      console.log(`Deleting existing embeddings for: ${typesToDelete.join(", ")}`);
      
      await supabase
        .from("knowledge_embeddings")
        .delete()
        .eq("organization_id", organization_id)
        .in("source_type", typesToDelete);
    }

    // Call generate-embeddings function
    const { error: embedError } = await supabase.functions.invoke("generate-embeddings", {
      body: { items: contentItems },
    });

    if (embedError) {
      console.error("Embedding generation error:", embedError);
      return new Response(
        JSON.stringify({ error: embedError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update AI indexing status
    await supabase
      .from("ai_indexing_status")
      .upsert({
        organization_id,
        last_full_index: new Date().toISOString(),
        status: "completed",
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });

    return new Response(
      JSON.stringify({
        success: true,
        indexed: contentItems.length,
        sources: [...new Set(contentItems.map(i => i.source_type))],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Index knowledge error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
