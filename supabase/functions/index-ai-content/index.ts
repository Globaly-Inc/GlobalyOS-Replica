import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Source types in order of indexing
const SOURCE_TYPES = [
  'wiki_page',
  'chat_message', 
  'team_member',
  'project',
  'announcement',
  'kpi',
  'calendar_event',
  'leave_record',
  'attendance',
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse optional organization_id from request body
    let targetOrgId: string | null = null;
    try {
      const body = await req.json();
      targetOrgId = body.organization_id || null;
    } catch {
      // No body or invalid JSON, index all organizations
    }

    // Fetch organizations to index
    let orgsQuery = supabase.from("organizations").select("id, name");
    if (targetOrgId) {
      orgsQuery = orgsQuery.eq("id", targetOrgId);
    }
    
    const { data: organizations, error: orgsError } = await orgsQuery;
    
    if (orgsError) {
      console.error("Error fetching organizations:", orgsError);
      throw orgsError;
    }

    const results: { orgId: string; orgName: string; indexed: number; errors: number }[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Helper to update progress
    const updateProgress = async (orgId: string, currentSource: string, sourcesCompleted: string[], recordsIndexed: number) => {
      await supabase
        .from("ai_indexing_status")
        .upsert({
          organization_id: orgId,
          status: "running",
          current_source: currentSource,
          sources_completed: sourcesCompleted,
          total_sources: SOURCE_TYPES.length,
          records_indexed: recordsIndexed,
          updated_at: new Date().toISOString()
        }, { onConflict: "organization_id" });
    };

    for (const org of organizations || []) {
      let indexedCount = 0;
      let errorCount = 0;
      const completedSources: string[] = [];

      try {
        // Update status to running with initial progress
        await updateProgress(org.id, SOURCE_TYPES[0], [], 0);

        // Fetch AI settings for this org
        const { data: aiSettings } = await supabase
          .from("ai_knowledge_settings")
          .select("*")
          .eq("organization_id", org.id)
          .maybeSingle();

        // Default all to enabled if no settings exist
        const settings = aiSettings || {
          wiki_enabled: true,
          chat_enabled: true,
          team_directory_enabled: true,
          announcements_enabled: true,
          kpis_enabled: true,
          calendar_enabled: true,
          leave_enabled: true,
          attendance_enabled: true,
        };

        // 1. Index Wiki Pages
        await updateProgress(org.id, 'wiki_page', completedSources, indexedCount);
        if (settings.wiki_enabled) {
          const { data: wikiPages } = await supabase
            .from("wiki_pages")
            .select("id, title, content, access_scope, folder_id, updated_at")
            .eq("organization_id", org.id);

          for (const page of wikiPages || []) {
            try {
              const plainContent = page.content?.replace(/<[^>]*>/g, "") || "";
              
              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: "wiki",
                source_id: page.id,
                source_table: "wiki_pages",
                title: page.title,
                content: plainContent.substring(0, 10000),
                access_scope: page.access_scope || "company",
                metadata: { folder_id: page.folder_id },
                last_updated: page.updated_at || new Date().toISOString()
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              console.error("Error indexing wiki page:", e);
              errorCount++;
            }
          }
        }
        completedSources.push('wiki_page');

        // 2. Index Chat Messages (last 30 days, summarized per conversation/space)
        await updateProgress(org.id, 'chat_message', completedSources, indexedCount);
        if (settings.chat_enabled) {
          const { data: chatMessages } = await supabase
            .from("chat_messages")
            .select("id, content, conversation_id, space_id, created_at")
            .eq("organization_id", org.id)
            .gte("created_at", thirtyDaysAgo.toISOString())
            .order("created_at", { ascending: false })
            .limit(500);

          // Group messages by conversation/space for indexing
          const conversationMessages: Record<string, string[]> = {};
          const spaceMessages: Record<string, string[]> = {};

          for (const msg of chatMessages || []) {
            const plainContent = msg.content?.replace(/<[^>]*>/g, "") || "";
            if (msg.conversation_id) {
              if (!conversationMessages[msg.conversation_id]) {
                conversationMessages[msg.conversation_id] = [];
              }
              conversationMessages[msg.conversation_id].push(plainContent);
            } else if (msg.space_id) {
              if (!spaceMessages[msg.space_id]) {
                spaceMessages[msg.space_id] = [];
              }
              spaceMessages[msg.space_id].push(plainContent);
            }
          }

          // Index conversation summaries
          for (const [convId, messages] of Object.entries(conversationMessages)) {
            try {
              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: "chat",
                source_id: convId,
                source_table: "chat_conversations",
                title: "Direct Message Thread",
                content: messages.slice(0, 50).join("\n").substring(0, 5000),
                access_scope: "members",
                metadata: { conversation_id: convId },
                last_updated: new Date().toISOString()
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              errorCount++;
            }
          }

          // Index space summaries
          for (const [spaceId, messages] of Object.entries(spaceMessages)) {
            try {
              const { data: space } = await supabase
                .from("chat_spaces")
                .select("name, access_type")
                .eq("id", spaceId)
                .single();

              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: "chat",
                source_id: spaceId,
                source_table: "chat_spaces",
                title: space?.name || "Space",
                content: messages.slice(0, 50).join("\n").substring(0, 5000),
                access_scope: space?.access_type === "public" ? "company" : "members",
                metadata: { space_id: spaceId },
                last_updated: new Date().toISOString()
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              errorCount++;
            }
          }
        }
        completedSources.push('chat_message');

        // 3. Index Employees (public info only)
        await updateProgress(org.id, 'team_member', completedSources, indexedCount);
        if (settings.team_directory_enabled) {
          const { data: employees } = await supabase
            .from("employees")
            .select(`
              id, position, department, office_id, updated_at,
              profiles!inner(full_name),
              offices(name)
            `)
            .eq("organization_id", org.id)
            .eq("status", "active");

          for (const emp of employees || []) {
            try {
              const profile = emp.profiles as any;
              const office = emp.offices as any;
              
              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: "employee",
                source_id: emp.id,
                source_table: "employees",
                title: profile?.full_name || "Employee",
                content: `${profile?.full_name || ""} works as ${emp.position} in the ${emp.department} department${office?.name ? ` at ${office.name} office` : ""}.`,
                access_scope: "company",
                metadata: { department: emp.department, office_id: emp.office_id },
                last_updated: emp.updated_at || new Date().toISOString()
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              errorCount++;
            }
          }
        }
        completedSources.push('team_member');

        // 4. Index Projects (with employee assignments)
        await updateProgress(org.id, 'project', completedSources, indexedCount);
        if (settings.team_directory_enabled) {
          // Fetch all projects with their assigned employees
          const { data: projects } = await supabase
            .from("projects")
            .select(`
              id, name, description, color, status, updated_at,
              employee_projects(employee_id)
            `)
            .eq("organization_id", org.id);

          for (const project of projects || []) {
            try {
              const assignedIds = (project.employee_projects || [])
                .map((ep: any) => ep.employee_id);
              
              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: "project",
                source_id: project.id,
                source_table: "projects",
                title: project.name,
                content: `Project: ${project.name}. ${project.description || ""}. Status: ${project.status || "active"}. ${assignedIds.length} team members assigned.`,
                access_scope: assignedIds.length > 0 ? "employee" : "company",
                access_entities: assignedIds.length > 0 ? assignedIds : null,
                metadata: { 
                  project_id: project.id, 
                  assigned_employees: assignedIds,
                  status: project.status 
                },
                last_updated: project.updated_at || new Date().toISOString()
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              console.error("Error indexing project:", e);
              errorCount++;
            }
          }
        }
        completedSources.push('project');

        // 5. Index Updates/Announcements
        await updateProgress(org.id, 'announcement', completedSources, indexedCount);
        if (settings.announcements_enabled) {
          const { data: updates } = await supabase
            .from("updates")
            .select("id, type, content, created_at")
            .eq("organization_id", org.id)
            .in("type", ["announcement", "win"])
            .gte("created_at", thirtyDaysAgo.toISOString());

          for (const update of updates || []) {
            try {
              const plainContent = update.content?.replace(/<[^>]*>/g, "") || "";
              
              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: update.type,
                source_id: update.id,
                source_table: "updates",
                title: update.type === "announcement" ? "Announcement" : "Team Win",
                content: plainContent.substring(0, 5000),
                access_scope: "company",
                metadata: { type: update.type },
                last_updated: update.created_at
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              errorCount++;
            }
          }
        }
        completedSources.push('announcement');

        // 5. Index KPIs
        await updateProgress(org.id, 'kpi', completedSources, indexedCount);
        if (settings.kpis_enabled) {
          const { data: kpis } = await supabase
            .from("kpis")
            .select("id, title, description, target_value, current_value, unit, quarter, year, status, employee_id, updated_at")
            .eq("organization_id", org.id);

          for (const kpi of kpis || []) {
            try {
              const progress = kpi.target_value && kpi.target_value > 0 
                ? Math.round((kpi.current_value || 0) / kpi.target_value * 100) 
                : 0;
              
              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: "kpi",
                source_id: kpi.id,
                source_table: "kpis",
                title: kpi.title,
                content: `KPI: ${kpi.title}. ${kpi.description || ""} Target: ${kpi.target_value || 0} ${kpi.unit || ""}. Current: ${kpi.current_value || 0} (${progress}% complete). Status: ${kpi.status}. Q${kpi.quarter} ${kpi.year}.`,
                access_scope: "employee",
                access_entities: [kpi.employee_id],
                metadata: { employee_id: kpi.employee_id, quarter: kpi.quarter, year: kpi.year, status: kpi.status },
                last_updated: kpi.updated_at || new Date().toISOString()
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              console.error("Error indexing KPI:", e);
              errorCount++;
            }
          }
        }
        completedSources.push('kpi');

        // 6. Index Calendar Events
        await updateProgress(org.id, 'calendar_event', completedSources, indexedCount);
        if (settings.calendar_enabled) {
          const { data: events } = await supabase
            .from("calendar_events")
            .select("id, title, start_date, end_date, event_type, applies_to_all_offices, updated_at")
            .eq("organization_id", org.id);

          for (const event of events || []) {
            try {
              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: "calendar",
                source_id: event.id,
                source_table: "calendar_events",
                title: event.title,
                content: `${event.event_type}: ${event.title} from ${event.start_date} to ${event.end_date}.${event.applies_to_all_offices ? " Applies to all offices." : ""}`,
                access_scope: "company",
                metadata: { event_type: event.event_type, start_date: event.start_date, end_date: event.end_date },
                last_updated: event.updated_at || new Date().toISOString()
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              console.error("Error indexing calendar event:", e);
              errorCount++;
            }
          }
        }
        completedSources.push('calendar_event');

        // 7. Index Leave Requests (approved ones, summarized)
        await updateProgress(org.id, 'leave_record', completedSources, indexedCount);
        if (settings.leave_enabled) {
          const { data: leaveRequests } = await supabase
            .from("leave_requests")
            .select("id, employee_id, leave_type, start_date, end_date, status, days_count, updated_at")
            .eq("organization_id", org.id)
            .eq("status", "approved")
            .gte("start_date", thirtyDaysAgo.toISOString());

          for (const leave of leaveRequests || []) {
            try {
              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: "leave",
                source_id: leave.id,
                source_table: "leave_requests",
                title: `${leave.leave_type} Leave`,
                content: `${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} (${leave.days_count} days). Status: ${leave.status}.`,
                access_scope: "employee",
                access_entities: [leave.employee_id],
                metadata: { employee_id: leave.employee_id, leave_type: leave.leave_type, status: leave.status },
                last_updated: leave.updated_at || new Date().toISOString()
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              console.error("Error indexing leave request:", e);
              errorCount++;
            }
          }
        }
        completedSources.push('leave_record');

        // 8. Index Attendance (aggregated per employee for last 30 days)
        await updateProgress(org.id, 'attendance', completedSources, indexedCount);
        if (settings.attendance_enabled) {
          const { data: attendance } = await supabase
            .from("attendance_records")
            .select("id, employee_id, date, work_hours, status")
            .eq("organization_id", org.id)
            .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

          // Aggregate by employee
          const empAttendance: Record<string, { total: number; present: number; late: number; absent: number; totalHours: number }> = {};
          
          for (const record of attendance || []) {
            if (!empAttendance[record.employee_id]) {
              empAttendance[record.employee_id] = { total: 0, present: 0, late: 0, absent: 0, totalHours: 0 };
            }
            empAttendance[record.employee_id].total++;
            empAttendance[record.employee_id].totalHours += record.work_hours || 0;
            if (record.status === "present") empAttendance[record.employee_id].present++;
            else if (record.status === "late") empAttendance[record.employee_id].late++;
            else if (record.status === "absent") empAttendance[record.employee_id].absent++;
          }

          for (const [empId, stats] of Object.entries(empAttendance)) {
            try {
              const avgHours = stats.total > 0 ? (stats.totalHours / stats.total).toFixed(1) : "0";
              
              await supabase.from("ai_content_index").upsert({
                organization_id: org.id,
                content_type: "attendance",
                source_id: empId,
                source_table: "attendance_records",
                title: "Attendance Summary (30 days)",
                content: `Attendance summary: ${stats.present} days present, ${stats.late} days late, ${stats.absent} days absent out of ${stats.total} total days. Average work hours: ${avgHours}h per day.`,
                access_scope: "employee",
                access_entities: [empId],
                metadata: { employee_id: empId, ...stats },
                last_updated: new Date().toISOString()
              }, { onConflict: "organization_id,source_table,source_id" });
              
              indexedCount++;
            } catch (e) {
              console.error("Error indexing attendance:", e);
              errorCount++;
            }
          }
        }
        completedSources.push('attendance');

        // Update status to completed
        await supabase
          .from("ai_indexing_status")
          .upsert({
            organization_id: org.id,
            status: "completed",
            current_source: null,
            sources_completed: completedSources,
            total_sources: SOURCE_TYPES.length,
            records_indexed: indexedCount,
            last_full_index: new Date().toISOString(),
            last_wiki_index: settings.wiki_enabled ? new Date().toISOString() : null,
            last_chat_index: settings.chat_enabled ? new Date().toISOString() : null,
            last_team_index: settings.team_directory_enabled ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }, { onConflict: "organization_id" });

        results.push({
          orgId: org.id,
          orgName: org.name,
          indexed: indexedCount,
          errors: errorCount
        });

      } catch (orgError) {
        console.error(`Error indexing org ${org.id}:`, orgError);
        
        // Update status to failed
        await supabase
          .from("ai_indexing_status")
          .upsert({
            organization_id: org.id,
            status: "failed",
            current_source: null,
            sources_completed: completedSources,
            records_indexed: indexedCount,
            updated_at: new Date().toISOString()
          }, { onConflict: "organization_id" });

        results.push({
          orgId: org.id,
          orgName: org.name,
          indexed: indexedCount,
          errors: errorCount + 1
        });
      }
    }

    console.log("Indexing complete:", results);
    
    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in index-ai-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
