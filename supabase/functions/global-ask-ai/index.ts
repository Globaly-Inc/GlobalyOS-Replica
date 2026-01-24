import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model pricing per 1K tokens (approximate)
const MODEL_RATES: Record<string, number> = {
  "google/gemini-2.5-flash": 0.000001,
  "google/gemini-2.5-flash-lite": 0.0000005,
  "google/gemini-2.5-pro": 0.00001,
  "google/gemini-3-flash-preview": 0.000002,
  "google/gemini-3-pro-preview": 0.000015,
  "openai/gpt-5": 0.00003,
  "openai/gpt-5-mini": 0.00001,
  "openai/gpt-5-nano": 0.000005,
  "openai/gpt-5.2": 0.00004,
};

// Detect if query is about internal org data or general assistance
function detectQueryType(question: string): "internal" | "general" {
  const internalKeywords = [
    "leave", "balance", "vacation", "pto", "sick day",
    "attendance", "check-in", "check-out", "work hours",
    "kpi", "performance", "goal", "target", "okr",
    "team", "employee", "colleague", "who works", "who is",
    "announcement", "wiki", "policy", "procedure", "document",
    "calendar", "event", "holiday", "meeting",
    "manager", "department", "office", "org chart",
    "my ", "our ", "company", "organization"
  ];
  
  const lowerQuestion = question.toLowerCase();
  return internalKeywords.some(kw => lowerQuestion.includes(kw)) ? "internal" : "general";
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      question, 
      organizationId, 
      conversationHistory = [],
      conversationId,
      model: requestedModel 
    } = await req.json();

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

    // Create client with user's auth for token validation
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user token using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Token validation failed:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: claimsData.claims.sub as string };

    // Service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check feature limit before processing
    const { data: limitCheck, error: limitError } = await supabase
      .rpc('check_feature_limit', {
        _organization_id: organizationId,
        _feature: 'ai_queries',
        _increment: 1
      });

    if (limitError) {
      console.error("Error checking feature limit:", limitError);
    }

    // Block if limit exceeded (and not unlimited)
    if (limitCheck && !limitCheck.allowed && !limitCheck.unlimited) {
      console.log("AI query limit exceeded for org:", organizationId, limitCheck);
      return new Response(JSON.stringify({ 
        error: "You've reached your monthly AI query limit. Please upgrade your plan for more queries.",
        limit_exceeded: true,
        current_usage: limitCheck.current_usage,
        limit: limitCheck.limit
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current employee and their role
    const { data: currentEmployee } = await supabase
      .from("employees")
      .select(`
        id, position, department, manager_id, office_id, start_date, status,
        profiles!inner(full_name, avatar_url, email)
      `)
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    // Type assertion for profile (Supabase returns array but we use !inner for single)

    // Get user's role in the organization
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    const role = userRole?.role || "member";

    // ========================================
    // ORGANIZATION BUSINESS CONTEXT
    // ========================================
    const { data: organization } = await supabase
      .from("organizations")
      .select(`
        name,
        legal_business_name,
        industry,
        company_size,
        country,
        timezone
      `)
      .eq("id", organizationId)
      .single();

    // Fetch distinct departments from employees
    const { data: departmentsData } = await supabase
      .from("employees")
      .select("department")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .not("department", "is", null);

    const uniqueDepartments = [...new Set(departmentsData?.map(d => d.department).filter(Boolean) || [])];

    // Fetch distinct positions/roles
    const { data: positionsData } = await supabase
      .from("employees")
      .select("position")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .not("position", "is", null);

    const uniquePositions = [...new Set(positionsData?.map(p => p.position).filter(Boolean) || [])].slice(0, 15);

    // Build business context string
    const businessCategory = organization?.industry || "Not specified";
    const companySize = organization?.company_size || "Not specified";
    const companyName = organization?.legal_business_name || organization?.name || "the organization";
    const companyCountry = organization?.country || "Not specified";
    const companyTimezone = organization?.timezone || "Not specified";

    // Fetch AI knowledge settings
    const { data: aiSettings } = await supabase
      .from("ai_knowledge_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    // Default settings
    const settings = {
      wiki_enabled: aiSettings?.wiki_enabled ?? true,
      chat_enabled: aiSettings?.chat_enabled ?? true,
      team_directory_enabled: aiSettings?.team_directory_enabled ?? true,
      announcements_enabled: aiSettings?.announcements_enabled ?? true,
      kpis_enabled: aiSettings?.kpis_enabled ?? true,
      calendar_enabled: aiSettings?.calendar_enabled ?? true,
      leave_enabled: aiSettings?.leave_enabled ?? true,
      attendance_enabled: aiSettings?.attendance_enabled ?? true,
      general_ai_enabled: aiSettings?.general_ai_enabled ?? true,
      default_model: aiSettings?.default_model || "google/gemini-2.5-flash",
      allowed_models: aiSettings?.allowed_models || ["google/gemini-2.5-flash", "google/gemini-2.5-pro"],
    };

    // Determine which model to use
    const model = requestedModel && settings.allowed_models.includes(requestedModel) 
      ? requestedModel 
      : settings.default_model;

    // Detect query type
    const queryType = detectQueryType(question);

    // ========================================
    // PERSONAL DATA CONTEXT (Always available to self)
    // ========================================
    let userPersonalContext = "";
    const currentYear = new Date().getFullYear();

    if (currentEmployee) {
      // User's leave balances
      if (settings.leave_enabled) {
        const { data: leaveBalances } = await supabase
          .from("leave_balances")
          .select("vacation_days, sick_days, pto_days, year")
          .eq("employee_id", currentEmployee.id)
          .eq("year", currentYear)
          .maybeSingle();
        
        const { data: pendingLeaves } = await supabase
          .from("leave_requests")
          .select("leave_type, start_date, end_date, status, reason")
          .eq("employee_id", currentEmployee.id)
          .in("status", ["pending", "approved"])
          .gte("end_date", new Date().toISOString().split("T")[0])
          .order("start_date", { ascending: true })
          .limit(10);

        userPersonalContext += `
YOUR LEAVE BALANCES (${currentYear}):
- Vacation Days: ${leaveBalances?.vacation_days ?? "N/A"} remaining
- Sick Days: ${leaveBalances?.sick_days ?? "N/A"} remaining
- PTO Days: ${leaveBalances?.pto_days ?? "N/A"} remaining

YOUR PENDING/UPCOMING LEAVES:
${pendingLeaves?.length ? pendingLeaves.map(l => `- ${l.leave_type}: ${l.start_date} to ${l.end_date} (${l.status})`).join("\n") : "No upcoming leaves"}
`;
      }

      // User's attendance data
      if (settings.attendance_enabled) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: attendanceRecords } = await supabase
          .from("attendance_records")
          .select("date, check_in_time, check_out_time, work_hours, status")
          .eq("employee_id", currentEmployee.id)
          .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
          .order("date", { ascending: false })
          .limit(30);

        const avgHours = attendanceRecords?.length 
          ? (attendanceRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0) / attendanceRecords.length).toFixed(1)
          : "N/A";

        const recentRecord = attendanceRecords?.[0];
        userPersonalContext += `
YOUR ATTENDANCE (Last 30 Days):
- Average work hours: ${avgHours} hours/day
- Total records: ${attendanceRecords?.length || 0}
- Most recent: ${recentRecord ? `${recentRecord.date} - ${recentRecord.check_in_time || "No check-in"} to ${recentRecord.check_out_time || "No check-out"}` : "No records"}
`;
      }

      // User's KPIs
      if (settings.kpis_enabled) {
        const { data: userKpis } = await supabase
          .from("kpis")
          .select("title, target_value, current_value, unit, status, period, due_date")
          .eq("employee_id", currentEmployee.id)
          .order("created_at", { ascending: false })
          .limit(10);

        userPersonalContext += `
YOUR KPIs:
${userKpis?.length ? userKpis.map(k => 
  `- ${k.title}: ${k.current_value ?? 0}/${k.target_value ?? 0} ${k.unit || ""} (${k.status || "N/A"})${k.due_date ? ` - Due: ${k.due_date}` : ""}`
).join("\n") : "No KPIs assigned"}
`;
      }
    }

    // ========================================
    // TEAM/MANAGER DATA (For managers, admin, HR, owner)
    // ========================================
    let teamDataContext = "";
    
    if (currentEmployee && ["manager", "admin", "hr", "owner"].includes(role)) {
      // Get direct reports
      const { data: directReports } = await supabase
        .from("employees")
        .select(`
          id, position, department, status,
          profiles!inner(full_name)
        `)
        .eq("manager_id", currentEmployee.id)
        .eq("status", "active");

      if (directReports && directReports.length > 0) {
        const directReportIds = directReports.map(dr => dr.id);
        
        // Get leave balances for direct reports
        if (settings.leave_enabled) {
          const { data: teamLeaves } = await supabase
            .from("leave_balances")
            .select("employee_id, vacation_days, sick_days, pto_days")
            .in("employee_id", directReportIds)
            .eq("year", currentYear);

          const { data: teamPendingLeaves } = await supabase
            .from("leave_requests")
            .select("employee_id, leave_type, start_date, end_date, status")
            .in("employee_id", directReportIds)
            .eq("status", "pending");

          teamDataContext += `
YOUR DIRECT REPORTS (${directReports.length}):
${directReports.map(dr => {
  const leave = teamLeaves?.find(l => l.employee_id === dr.id);
  return `- ${(dr as any).profiles?.full_name}: ${dr.position} | Vacation: ${leave?.vacation_days ?? "N/A"}, Sick: ${leave?.sick_days ?? "N/A"}`;
}).join("\n")}

PENDING LEAVE REQUESTS FROM YOUR TEAM:
${teamPendingLeaves?.length ? teamPendingLeaves.map(l => {
  const emp = directReports.find(dr => dr.id === l.employee_id);
  return `- ${(emp as any)?.profiles?.full_name}: ${l.leave_type} (${l.start_date} to ${l.end_date})`;
}).join("\n") : "No pending requests"}
`;
        }
      }
    }

    // For admin/HR/owner - broader access
    if (["admin", "hr", "owner"].includes(role)) {
      // Today's attendance summary
      if (settings.attendance_enabled) {
        const today = new Date().toISOString().split("T")[0];
        
        const { count: checkedInCount } = await supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("date", today)
          .not("check_in_time", "is", null);

        const { count: totalActiveEmployees } = await supabase
          .from("employees")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "active");

        teamDataContext += `
TODAY'S ATTENDANCE SUMMARY:
- Checked in: ${checkedInCount || 0} / ${totalActiveEmployees || 0} employees
`;
      }

      // Pending leave requests org-wide
      if (settings.leave_enabled) {
        const { data: allPendingLeaves, count: pendingCount } = await supabase
          .from("leave_requests")
          .select(`
            id, leave_type, start_date, end_date,
            employees!inner(id, profiles!inner(full_name))
          `, { count: "exact" })
          .eq("organization_id", organizationId)
          .eq("status", "pending")
          .limit(5);

        teamDataContext += `
ORGANIZATION PENDING LEAVE REQUESTS: ${pendingCount || 0} total
${allPendingLeaves?.slice(0, 5).map(l => 
  `- ${(l as any).employees?.profiles?.full_name}: ${l.leave_type} (${l.start_date} to ${l.end_date})`
).join("\n") || "None"}
`;
      }
    }

    // ========================================
    // ORGANIZATION KNOWLEDGE (Wiki, Team, Calendar, etc.)
    // ========================================
    let wikiContext = "";
    if (settings.wiki_enabled && queryType === "internal") {
      const { data: wikiPages } = await supabase
        .from("wiki_pages")
        .select("title, content, access_scope")
        .eq("organization_id", organizationId)
        .limit(50);

      if (wikiPages && wikiPages.length > 0) {
        wikiContext = wikiPages
          .map((page) => {
            const plainContent = page.content?.replace(/<[^>]*>/g, "") || "";
            return `### ${page.title}\n${plainContent.substring(0, 1500)}`;
          })
          .join("\n\n");
      }
    }

    let teamDirectoryContext = "";
    if (settings.team_directory_enabled && queryType === "internal") {
      const { data: employees } = await supabase
        .from("employees")
        .select(`
          id, position, department, 
          profiles!inner(full_name),
          offices(name)
        `)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .limit(100);

      if (employees && employees.length > 0) {
        teamDirectoryContext = employees
          .map((emp: any) => {
            const name = emp.profiles?.full_name || "Unknown";
            const office = emp.offices?.name || "";
            return `- ${name}: ${emp.position || "N/A"} (${emp.department || "N/A"})${office ? ` - ${office}` : ""}`;
          })
          .join("\n");
      }
    }

    let announcementsContext = "";
    if (settings.announcements_enabled && queryType === "internal") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: updates } = await supabase
        .from("updates")
        .select("type, content, created_at")
        .eq("organization_id", organizationId)
        .in("type", ["announcement", "win"])
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(15);

      if (updates && updates.length > 0) {
        announcementsContext = updates
          .map((u) => {
            const plainContent = u.content?.replace(/<[^>]*>/g, "") || "";
            const date = new Date(u.created_at).toLocaleDateString();
            return `[${u.type.toUpperCase()} - ${date}] ${plainContent.substring(0, 400)}`;
          })
          .join("\n\n");
      }
    }

    let calendarContext = "";
    if (settings.calendar_enabled && queryType === "internal") {
      const today = new Date().toISOString().split("T")[0];
      const { data: events } = await supabase
        .from("calendar_events")
        .select("title, start_date, end_date, event_type")
        .eq("organization_id", organizationId)
        .gte("end_date", today)
        .order("start_date", { ascending: true })
        .limit(15);

      if (events && events.length > 0) {
        calendarContext = events
          .map((e) => `- ${e.event_type}: ${e.title} (${e.start_date}${e.end_date !== e.start_date ? ` to ${e.end_date}` : ""})`)
          .join("\n");
      }
    }

    // ========================================
    // BUILD SYSTEM PROMPT
    // ========================================
    const profile = currentEmployee?.profiles as unknown as { full_name: string; avatar_url: string; email: string } | null;
    const userName = profile?.full_name || "User";
    
    const systemPrompt = `You are GlobalyOS AI - a powerful, helpful AI assistant that operates in TWO modes:

## MODE 1: ORGANIZATION KNOWLEDGE (Internal Queries)
When the user asks about their organization, team, policies, leave, attendance, KPIs, wiki, etc., answer using the provided organization context below.

## MODE 2: GENERAL ASSISTANT (External Queries)
When the user asks for general help like:
- Writing content, emails, SOPs, documentation
- Research or explanations on any topic
- Coding help, translations, summaries
- Creative writing, brainstorming
- Any query NOT related to internal org data

Act as a helpful, knowledgeable AI assistant and provide comprehensive answers. You can help with anything a user needs.

## CRITICAL PRIVACY & SECURITY RULES:
- NEVER share salary, bank details, tax info, or sensitive HR data of ANY user
- Regular users ONLY see their OWN personal data (leave, attendance, KPIs)
- Managers can see their direct reports' data
- Admin/HR/Owner have broader access as shown in context
- NEVER expose data from other organizations
- If organization knowledge doesn't contain the answer, say so clearly
- For general queries, don't include internal org data in responses

## ORGANIZATION BUSINESS CONTEXT:
- Company Name: ${companyName}
- Business Category: ${businessCategory}
- Company Size: ${companySize}
- Country: ${companyCountry}
- Timezone: ${companyTimezone}
- Departments: ${uniqueDepartments.length > 0 ? uniqueDepartments.join(", ") : "Not defined"}
- Key Roles/Positions: ${uniquePositions.length > 0 ? uniquePositions.join(", ") : "Not defined"}

When answering questions:
1. Consider the "${businessCategory}" business category context when providing advice or examples
2. Use terminology appropriate to a ${companySize} company in the ${businessCategory} sector
3. Reference relevant departments or roles when applicable
4. If discussing policies or procedures, frame them appropriately for this business type

## CURRENT USER CONTEXT:
Name: ${userName}
Role: ${role}
Department: ${currentEmployee?.department || "Unknown"}
Position: ${currentEmployee?.position || "Unknown"}

--- YOUR PERSONAL DATA (${userName}) ---
${userPersonalContext || "Personal data not available or disabled."}

${teamDataContext ? `--- TEAM DATA (You have access as ${role}) ---
${teamDataContext}` : ""}

${queryType === "internal" ? `--- ORGANIZATION WIKI & KNOWLEDGE BASE ---
${wikiContext || "No wiki content available."}

--- TEAM DIRECTORY ---
${teamDirectoryContext || "Team directory not available."}

--- RECENT ANNOUNCEMENTS & WINS ---
${announcementsContext || "No recent announcements."}

--- UPCOMING CALENDAR EVENTS ---
${calendarContext || "No upcoming events."}` : ""}
---

Respond naturally based on the query type. Be helpful, accurate, and professional. For internal queries, cite sources when relevant (Wiki, Team Directory, Calendar, etc.). For general queries, be thorough and helpful.`;

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
        model,
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

    // Calculate usage metrics
    const endTime = Date.now();
    const latencyMs = endTime - startTime;
    
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const promptLength = systemPrompt.length + question.length + 
      conversationHistory.reduce((sum: number, m: { content: string }) => sum + m.content.length, 0);
    const promptTokens = data.usage?.prompt_tokens || Math.ceil(promptLength / 4);
    const completionTokens = data.usage?.completion_tokens || Math.ceil(answer.length / 4);
    const totalTokens = promptTokens + completionTokens;
    
    // Calculate estimated cost
    const rate = MODEL_RATES[model] || 0.000001;
    const estimatedCost = (totalTokens / 1000) * rate;

    // Log detailed usage
    await supabase.from("ai_usage_logs").insert({
      organization_id: organizationId,
      user_id: user.id,
      employee_id: currentEmployee?.id || null,
      conversation_id: conversationId || null,
      model,
      query_type: queryType,
      prompt_length: promptLength,
      response_length: answer.length,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated_cost: estimatedCost,
      latency_ms: latencyMs,
    });

    // Record query usage for billing
    const { error: usageError } = await supabase
      .rpc('record_usage', {
        _organization_id: organizationId,
        _feature: 'ai_queries',
        _quantity: 1
      });

    if (usageError) {
      console.error("Error recording usage:", usageError);
    }

    // Also record token usage for token-based billing
    await supabase.rpc('record_usage', {
      _organization_id: organizationId,
      _feature: 'ai_tokens',
      _quantity: totalTokens
    });

    return new Response(JSON.stringify({ 
      answer,
      usage: {
        model,
        query_type: queryType,
        tokens: totalTokens,
        latency_ms: latencyMs
      }
    }), {
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
