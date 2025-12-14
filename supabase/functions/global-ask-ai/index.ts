import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, organizationId, conversationHistory = [] } = await req.json();

    if (!question || !organizationId) {
      return new Response(JSON.stringify({ error: "Missing question or organizationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user token and get user ID
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch AI knowledge settings
    const { data: aiSettings } = await supabase
      .from("ai_knowledge_settings")
      .select("*")
      .eq("organization_id", organizationId)
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

    // Build enabled content types array
    const enabledTypes: string[] = [];
    if (settings.wiki_enabled) enabledTypes.push("wiki");
    if (settings.chat_enabled) enabledTypes.push("chat");
    if (settings.team_directory_enabled) enabledTypes.push("employee");
    if (settings.announcements_enabled) enabledTypes.push("announcement", "win");
    if (settings.kpis_enabled) enabledTypes.push("kpi");
    if (settings.calendar_enabled) enabledTypes.push("calendar");
    if (settings.leave_enabled) enabledTypes.push("leave");
    if (settings.attendance_enabled) enabledTypes.push("attendance");

    // Fetch accessible AI content using the security definer function
    const { data: indexedContent, error: contentError } = await supabase
      .rpc("get_accessible_ai_content", {
        _user_id: user.id,
        _organization_id: organizationId,
        _content_types: enabledTypes.length > 0 ? enabledTypes : null,
        _limit: 200
      });

    if (contentError) {
      console.error("Error fetching indexed content:", contentError);
    }

    // Also fetch real-time data for latest content (respecting settings)
    let wikiContext = "";
    if (settings.wiki_enabled) {
      const { data: wikiPages } = await supabase
        .from("wiki_pages")
        .select("title, content, access_scope")
        .eq("organization_id", organizationId);

      if (wikiPages && wikiPages.length > 0) {
        wikiContext = wikiPages
          .map((page) => {
            const plainContent = page.content?.replace(/<[^>]*>/g, "") || "";
            return `### ${page.title}\n${plainContent.substring(0, 2000)}`;
          })
          .join("\n\n");
      }
    }

    let teamContext = "";
    if (settings.team_directory_enabled) {
      const { data: employees } = await supabase
        .from("employees")
        .select(`
          id, position, department, 
          profiles!inner(full_name),
          offices(name)
        `)
        .eq("organization_id", organizationId)
        .eq("status", "active");

      if (employees && employees.length > 0) {
        teamContext = employees
          .map((emp: any) => {
            const name = emp.profiles?.full_name || "Unknown";
            const office = emp.offices?.name || "";
            return `- ${name}: ${emp.position} (${emp.department})${office ? ` - ${office}` : ""}`;
          })
          .join("\n");
      }
    }

    let announcementsContext = "";
    if (settings.announcements_enabled) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: updates } = await supabase
        .from("updates")
        .select("type, content, created_at")
        .eq("organization_id", organizationId)
        .in("type", ["announcement", "win"])
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      if (updates && updates.length > 0) {
        announcementsContext = updates
          .map((u) => {
            const plainContent = u.content?.replace(/<[^>]*>/g, "") || "";
            const date = new Date(u.created_at).toLocaleDateString();
            return `[${u.type.toUpperCase()} - ${date}] ${plainContent.substring(0, 500)}`;
          })
          .join("\n\n");
      }
    }

    let calendarContext = "";
    if (settings.calendar_enabled) {
      const today = new Date().toISOString().split("T")[0];
      const { data: events } = await supabase
        .from("calendar_events")
        .select("title, start_date, end_date, event_type")
        .eq("organization_id", organizationId)
        .gte("end_date", today)
        .order("start_date", { ascending: true })
        .limit(20);

      if (events && events.length > 0) {
        calendarContext = events
          .map((e) => `- ${e.event_type}: ${e.title} (${e.start_date} to ${e.end_date})`)
          .join("\n");
      }
    }

    // Build indexed content context
    let indexedContext = "";
    if (indexedContent && indexedContent.length > 0) {
      // Group by content type for better organization
      const grouped: Record<string, any[]> = {};
      for (const item of indexedContent) {
        if (!grouped[item.content_type]) {
          grouped[item.content_type] = [];
        }
        grouped[item.content_type].push(item);
      }

      const sections: string[] = [];
      for (const [type, items] of Object.entries(grouped)) {
        const typeLabel = type.toUpperCase();
        const content = items
          .slice(0, 20) // Limit per type
          .map((item: any) => `${item.title ? `**${item.title}**: ` : ""}${item.content?.substring(0, 500) || ""}`)
          .join("\n");
        sections.push(`### ${typeLabel}\n${content}`);
      }
      indexedContext = sections.join("\n\n");
    }

    const systemPrompt = `You are the GlobalyOS AI Assistant for this organization's internal knowledge base.

You have access to the organization's data based on enabled settings and user permissions:
${settings.wiki_enabled ? "- Wiki documentation and knowledge base" : ""}
${settings.team_directory_enabled ? "- Team directory (public information: names, positions, departments, offices)" : ""}
${settings.announcements_enabled ? "- Recent announcements and wins" : ""}
${settings.chat_enabled ? "- Chat conversations (only those the user participates in)" : ""}
${settings.kpis_enabled ? "- KPIs and performance data (own and direct reports for managers)" : ""}
${settings.calendar_enabled ? "- Calendar events and holidays" : ""}
${settings.leave_enabled ? "- Leave information (own and direct reports for managers)" : ""}
${settings.attendance_enabled ? "- Attendance data (own and direct reports for managers)" : ""}

IMPORTANT ACCESS & PRIVACY RULES:
- Only reference information the user has access to based on their role
- NEVER reveal salary, personal contact details, banking, tax, or sensitive HR data
- For team questions, provide only public directory info (name, position, department, office)
- For chat references, only cite conversations the user is part of
- For KPIs, leave, and attendance: regular users only see their own data; managers see direct reports
- If asked about something not in the knowledge base, say so clearly

Be helpful, concise, and professional. When referencing information, mention the source (Wiki, Team Directory, Calendar, KPI, etc.).

--- WIKI KNOWLEDGE BASE ---
${wikiContext || "No wiki content available or disabled."}

--- TEAM DIRECTORY ---
${teamContext || "No team data available or disabled."}

--- RECENT ANNOUNCEMENTS & WINS ---
${announcementsContext || "No recent announcements or disabled."}

--- UPCOMING CALENDAR EVENTS ---
${calendarContext || "No upcoming events or disabled."}

--- INDEXED CONTENT (KPIs, Leave, Attendance, Chat, etc.) ---
${indexedContext || "No additional indexed content."}
---`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: question },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in global-ask-ai:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
