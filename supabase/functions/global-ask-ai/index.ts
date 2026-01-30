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

// ========================================
// DETERMINISTIC INTENT DETECTION
// ========================================
type DeterministicIntent = "leave_balance" | "kpi_performance" | "hr_contacts" | "my_projects" | null;

function detectDeterministicIntent(question: string): DeterministicIntent {
  const lowerQ = question.toLowerCase();
  
  // Projects intent
  const projectKeywords = [
    "my project", "my projects", "assigned to", "assigned project",
    "what project", "which project", "project list", "working on",
    "project assignment", "project i'm on", "projects am i",
    "assigned to me", "my team project", "project am i assigned"
  ];
  if (projectKeywords.some(kw => lowerQ.includes(kw))) {
    return "my_projects";
  }
  
  // Leave balance intent
  const leaveKeywords = [
    "leave balance", "my leave", "vacation days", "vacation left", 
    "sick leave", "sick days", "annual leave", "how many leave",
    "leave remaining", "pto balance", "pto left", "days off left",
    "remaining leave", "available leave", "leave entitlement"
  ];
  if (leaveKeywords.some(kw => lowerQ.includes(kw))) {
    return "leave_balance";
  }
  
  // KPI/Performance intent
  const kpiKeywords = [
    "my performance", "performance tracking", "my kpi", "my kpis",
    "my goals", "my targets", "how am i doing", "my objectives",
    "performance metrics", "my okr", "my okrs", "performance status"
  ];
  if (kpiKeywords.some(kw => lowerQ.includes(kw))) {
    return "kpi_performance";
  }
  
  // HR contacts intent
  const hrKeywords = [
    "who handles hr", "hr contact", "hr team", "people team",
    "who do i contact for leave", "who to contact for hr",
    "hr department", "human resources contact", "admin contact",
    "who manages hr", "hr manager", "hr person"
  ];
  if (hrKeywords.some(kw => lowerQ.includes(kw))) {
    return "hr_contacts";
  }
  
  return null;
}

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
    "my ", "our ", "company", "organization",
    "hr", "human resources", "people team", "admin"
  ];
  
  const lowerQuestion = question.toLowerCase();
  return internalKeywords.some(kw => lowerQuestion.includes(kw)) ? "internal" : "general";
}

// Helper function to log usage for deterministic queries
async function logUsage(supabase: any, params: {
  organizationId: string;
  userId: string;
  employeeId: string;
  conversationId?: string;
  queryType: string;
  promptLength: number;
  responseLength: number;
  latencyMs: number;
}) {
  try {
    await supabase.from("ai_usage_logs").insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      employee_id: params.employeeId,
      conversation_id: params.conversationId || null,
      model: "deterministic",
      query_type: params.queryType,
      prompt_length: params.promptLength,
      response_length: params.responseLength,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      estimated_cost: 0,
      latency_ms: params.latencyMs,
    });

    await supabase.rpc('record_usage', {
      _organization_id: params.organizationId,
      _feature: 'ai_queries',
      _quantity: 1
    });
  } catch (e) {
    console.error("Error logging usage:", e);
  }
}

// ========================================
// VECTOR SEARCH INTEGRATION
// ========================================
async function searchKnowledgeEmbeddings(
  supabase: any,
  lovableApiKey: string,
  question: string,
  organizationId: string,
  role: string,
  employeeId?: string
): Promise<Array<{ source_type: string; title: string; content: string; similarity: number }>> {
  try {
    // Generate embedding for the question
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: question,
      }),
    });

    if (!embeddingResponse.ok) {
      console.error("Failed to generate embedding:", await embeddingResponse.text());
      return [];
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (!queryEmbedding) {
      console.error("No embedding returned");
      return [];
    }

    // Search for similar content using the match function
    const { data: matches, error } = await supabase.rpc('match_knowledge_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 10,
      org_id: organizationId,
      user_role: role,
      p_employee_id: employeeId || null,
    });

    if (error) {
      console.error("Vector search error:", error);
      return [];
    }

    return matches || [];
  } catch (error) {
    console.error("Error in vector search:", error);
    return [];
  }
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

    // Get current employee data and user role in parallel
    const [employeeResult, roleResult] = await Promise.all([
      supabase
        .from("employees")
        .select("id, position, department, manager_id, office_id, status, user_id")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .maybeSingle()
    ]);

    const { data: employeeData, error: empError } = employeeResult;
    const { data: userRole } = roleResult;

    // Get profile separately if employee exists (small query, fast)
    let profileData = null;
    if (employeeData) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("id", user.id)
        .single();
      profileData = profile;
    }

    // Combine into expected structure
    const currentEmployee = employeeData ? {
      ...employeeData,
      profiles: profileData
    } : null;

    if (empError) {
      console.error("Employee lookup error:", empError.message);
    }

    const role = userRole?.role || "member";
    const currentYear = new Date().getFullYear();

    // Log request details for debugging
    console.log("=== GLOBAL-ASK-AI REQUEST ===");
    console.log("userId:", user.id);
    console.log("organizationId:", organizationId);
    console.log("employeeFound:", !!currentEmployee);
    console.log("employeeId:", currentEmployee?.id);
    console.log("officeId:", currentEmployee?.office_id);
    console.log("role:", role);
    console.log("question:", question);

    // ========================================
    // DETERMINISTIC INTENT HANDLING
    // Skip LLM entirely for known data queries
    // ========================================
    const deterministicIntent = detectDeterministicIntent(question);
    console.log("deterministicIntent:", deterministicIntent);

    if (deterministicIntent && currentEmployee) {
      let deterministicAnswer = "";
      
      // ========================================
      // DETERMINISTIC: LEAVE BALANCE
      // ========================================
      if (deterministicIntent === "leave_balance") {
        console.log("=== DETERMINISTIC LEAVE BALANCE ===");
        
        // Use office_leave_types exclusively (legacy leave_types has been dropped)
        let leaveBalances: Array<{ name: string; balance: number; category: string }> = [];
        let balanceYear = currentYear;

        // Get balances from office_leave_types
        if (currentEmployee.office_id) {
          console.log("Fetching office_leave_types for office:", currentEmployee.office_id);
          
          const { data: officeBalances, error: officeError } = await supabase
            .from("leave_type_balances")
            .select(`
              balance, 
              year,
              office_leave_type_id,
              office_leave_types!inner(name, category)
            `)
            .eq("employee_id", currentEmployee.id)
            .eq("year", currentYear)
            .not("office_leave_type_id", "is", null);
          
          console.log("Office balances query result:", { 
            count: officeBalances?.length, 
            error: officeError?.message,
          });
          
          if (officeBalances && officeBalances.length > 0) {
            leaveBalances = officeBalances.map((b: any) => ({
              name: b.office_leave_types?.name || "Unknown",
              balance: b.balance,
              category: b.office_leave_types?.category || "N/A"
            }));
          }
        }

        // Try previous year if current year has no data
        if (leaveBalances.length === 0 && currentEmployee.office_id) {
          console.log("Trying previous year:", currentYear - 1);
          balanceYear = currentYear - 1;
          
          const { data: prevOfficeBalances } = await supabase
            .from("leave_type_balances")
            .select(`
              balance, year,
              office_leave_types!inner(name, category)
            `)
            .eq("employee_id", currentEmployee.id)
            .eq("year", balanceYear)
            .not("office_leave_type_id", "is", null);
          
          if (prevOfficeBalances && prevOfficeBalances.length > 0) {
            leaveBalances = prevOfficeBalances.map((b: any) => ({
              name: b.office_leave_types?.name || "Unknown",
              balance: b.balance,
              category: b.office_leave_types?.category || "N/A"
            }));
          }
        }

        console.log("Final leave balances:", { count: leaveBalances.length, balanceYear });

        // Build deterministic answer
        const profile = currentEmployee.profiles as any;
        const userName = profile?.full_name || "there";
        
        if (leaveBalances.length > 0) {
          const paidLeaves = leaveBalances.filter(l => l.category === "paid");
          const unpaidLeaves = leaveBalances.filter(l => l.category === "unpaid");
          
          deterministicAnswer = `Hi ${userName}! Here are your leave balances for ${balanceYear}:\n\n`;
          
          if (paidLeaves.length > 0) {
            deterministicAnswer += "**Paid Leave:**\n\n";
            paidLeaves.forEach(l => {
              deterministicAnswer += `• ${l.name}: **${l.balance} days** remaining\n`;
            });
          }
          
          if (unpaidLeaves.length > 0) {
            deterministicAnswer += "\n\n**Unpaid Leave:**\n\n";
            unpaidLeaves.forEach(l => {
              deterministicAnswer += `• ${l.name}: **${l.balance} days** remaining\n`;
            });
          }
          
          // Fetch pending/upcoming leaves
          const { data: pendingLeaves } = await supabase
            .from("leave_requests")
            .select("leave_type, start_date, end_date, status, days_count")
            .eq("employee_id", currentEmployee.id)
            .in("status", ["pending", "approved"])
            .gte("end_date", new Date().toISOString().split("T")[0])
            .order("start_date", { ascending: true })
            .limit(5);
          
          if (pendingLeaves && pendingLeaves.length > 0) {
            deterministicAnswer += "\n\n**Upcoming/Pending Leaves:**\n\n";
            pendingLeaves.forEach(l => {
              deterministicAnswer += `• ${l.leave_type}: ${l.start_date} to ${l.end_date} (${l.days_count} days, ${l.status})\n`;
            });
          }
          
          deterministicAnswer += "\n\nIf you have any questions about your leave, feel free to ask!";
        } else {
          deterministicAnswer = `Hi ${userName}! I couldn't find any leave balances configured for you for ${currentYear}.\n\n`;
          deterministicAnswer += "This could mean:\n\n";
          deterministicAnswer += "• Your leave entitlements haven't been set up yet\n";
          deterministicAnswer += "• Your office doesn't have leave types configured\n\n";
          deterministicAnswer += "Please contact your HR administrator to set up your leave entitlements.";
        }
        
        // Return deterministic response
        const endTime = Date.now();
        await logUsage(supabase, {
          organizationId,
          userId: user.id,
          employeeId: currentEmployee.id,
          conversationId,
          queryType: "deterministic_leave",
          promptLength: question.length,
          responseLength: deterministicAnswer.length,
          latencyMs: endTime - startTime,
        });
        
        return new Response(JSON.stringify({ 
          answer: deterministicAnswer,
          usage: {
            model: "deterministic",
            query_type: "leave_balance",
            tokens: 0,
            latency_ms: endTime - startTime
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========================================
      // DETERMINISTIC: KPI/PERFORMANCE
      // ========================================
      if (deterministicIntent === "kpi_performance") {
        console.log("=== DETERMINISTIC KPI PERFORMANCE ===");
        
        const { data: userKpis } = await supabase
          .from("kpis")
          .select("title, target_value, current_value, unit, status, period, due_date, description")
          .eq("employee_id", currentEmployee.id)
          .order("created_at", { ascending: false })
          .limit(20);
        
        console.log("KPIs found:", userKpis?.length);
        
        const profile = currentEmployee.profiles as any;
        const userName = profile?.full_name || "there";
        
        if (userKpis && userKpis.length > 0) {
          // Group by status
          const byStatus: Record<string, typeof userKpis> = {};
          userKpis.forEach(k => {
            const s = k.status || "unknown";
            if (!byStatus[s]) byStatus[s] = [];
            byStatus[s].push(k);
          });
          
          deterministicAnswer = `Hi ${userName}! Here's your performance tracking overview:\n\n`;
          deterministicAnswer += `**Total KPIs:** ${userKpis.length}\n\n`;
          
          // Status summary
          const statusEmoji: Record<string, string> = {
            on_track: "🟢",
            at_risk: "🟡", 
            behind: "🔴",
            achieved: "✅",
            completed: "✅",
            unknown: "⚪"
          };
          
          deterministicAnswer += "**Status Summary:**\n";
          Object.entries(byStatus).forEach(([status, kpis]) => {
            const emoji = statusEmoji[status] || "⚪";
            deterministicAnswer += `${emoji} ${status.replace("_", " ").toUpperCase()}: ${kpis.length}\n`;
          });
          
          deterministicAnswer += "\n**Your KPIs:**\n";
          userKpis.forEach(k => {
            const progress = k.target_value ? Math.round((k.current_value || 0) / k.target_value * 100) : 0;
            const emoji = statusEmoji[k.status || "unknown"] || "⚪";
            deterministicAnswer += `\n${emoji} **${k.title}**\n`;
            deterministicAnswer += `   Progress: ${k.current_value ?? 0}/${k.target_value ?? 0} ${k.unit || ""} (${progress}%)\n`;
            if (k.due_date) {
              deterministicAnswer += `   Due: ${k.due_date}\n`;
            }
          });
          
          // Add insights
          const atRiskCount = (byStatus["at_risk"]?.length || 0) + (byStatus["behind"]?.length || 0);
          if (atRiskCount > 0) {
            deterministicAnswer += `\n⚠️ **Attention:** ${atRiskCount} KPI(s) need attention (at risk or behind).`;
          }
        } else {
          deterministicAnswer = `Hi ${userName}! You don't have any KPIs assigned to you yet.\n\n`;
          deterministicAnswer += "This could mean:\n";
          deterministicAnswer += "• Your manager hasn't set up performance goals for you\n";
          deterministicAnswer += "• KPIs for the current period haven't been created yet\n\n";
          deterministicAnswer += "Please speak with your manager about setting up your performance objectives.";
        }
        
        const endTime = Date.now();
        await logUsage(supabase, {
          organizationId,
          userId: user.id,
          employeeId: currentEmployee.id,
          conversationId,
          queryType: "deterministic_kpi",
          promptLength: question.length,
          responseLength: deterministicAnswer.length,
          latencyMs: endTime - startTime,
        });
        
        return new Response(JSON.stringify({ 
          answer: deterministicAnswer,
          usage: {
            model: "deterministic",
            query_type: "kpi_performance",
            tokens: 0,
            latency_ms: endTime - startTime
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========================================
      // DETERMINISTIC: HR CONTACTS
      // ========================================
      if (deterministicIntent === "hr_contacts") {
        console.log("=== DETERMINISTIC HR CONTACTS ===");
        
        // Fetch employees in HR-related departments
        const { data: hrDeptEmployees } = await supabase
          .from("employees")
          .select(`
            id, position, department,
            profiles!inner(full_name, email)
          `)
          .eq("organization_id", organizationId)
          .eq("status", "active")
          .or("department.ilike.%hr%,department.ilike.%human resources%,department.ilike.%people%");

        // Fetch users with HR/Admin/Owner roles
        const { data: hrRoleUsers } = await supabase
          .from("user_roles")
          .select("role, user_id")
          .eq("organization_id", organizationId)
          .in("role", ["hr", "admin", "owner"]);

        // Get employee details for role users
        let roleEmployees: any[] = [];
        if (hrRoleUsers && hrRoleUsers.length > 0) {
          const userIds = hrRoleUsers.map(r => r.user_id);
          const { data: empData } = await supabase
            .from("employees")
            .select(`
              id, position, department, user_id,
              profiles!inner(full_name, email)
            `)
            .eq("organization_id", organizationId)
            .in("user_id", userIds);
          
          roleEmployees = (empData || []).map(e => ({
            ...e,
            role: hrRoleUsers.find(r => r.user_id === e.user_id)?.role
          }));
        }

        // Combine and deduplicate
        const hrPeopleMap = new Map();
        
        hrDeptEmployees?.forEach(e => {
          hrPeopleMap.set(e.id, {
            name: (e as any).profiles?.full_name,
            email: (e as any).profiles?.email,
            position: e.position,
            department: e.department,
            source: "HR Department"
          });
        });
        
        roleEmployees.forEach(e => {
          if (!hrPeopleMap.has(e.id)) {
            hrPeopleMap.set(e.id, {
              name: (e as any).profiles?.full_name,
              email: (e as any).profiles?.email,
              position: e.position,
              role: e.role,
              source: `${e.role} role`
            });
          } else {
            const existing = hrPeopleMap.get(e.id);
            existing.role = e.role;
          }
        });

        const hrPeople = Array.from(hrPeopleMap.values());
        console.log("HR contacts found:", hrPeople.length);
        
        const profile = currentEmployee.profiles as any;
        const userName = profile?.full_name || "there";
        
        if (hrPeople.length > 0) {
          deterministicAnswer = `Hi ${userName}! Here are the people who handle HR matters in your organization:\n\n`;
          
          hrPeople.forEach(p => {
            deterministicAnswer += `• **${p.name}**`;
            if (p.position) deterministicAnswer += ` - ${p.position}`;
            if (p.department) deterministicAnswer += ` (${p.department})`;
            if (p.role) deterministicAnswer += ` [${p.role.toUpperCase()}]`;
            deterministicAnswer += `\n`;
          });
          
          deterministicAnswer += "\nYou can reach out to any of these people for HR-related questions, leave requests, or other administrative matters.";
        } else {
          deterministicAnswer = `Hi ${userName}! I couldn't find specific HR contacts in your organization's directory.\n\n`;
          deterministicAnswer += "Here are some suggestions:\n";
          deterministicAnswer += "• Contact your manager for HR-related questions\n";
          deterministicAnswer += "• Check with your organization's admin\n";
          deterministicAnswer += "• Look for people in the 'HR' or 'People Operations' department in the team directory";
        }
        
        const endTime = Date.now();
        await logUsage(supabase, {
          organizationId,
          userId: user.id,
          employeeId: currentEmployee.id,
          conversationId,
          queryType: "deterministic_hr",
          promptLength: question.length,
          responseLength: deterministicAnswer.length,
          latencyMs: endTime - startTime,
        });
        
        return new Response(JSON.stringify({ 
          answer: deterministicAnswer,
          usage: {
            model: "deterministic",
            query_type: "hr_contacts",
            tokens: 0,
            latency_ms: endTime - startTime
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ========================================
      // DETERMINISTIC: MY PROJECTS
      // ========================================
      if (deterministicIntent === "my_projects") {
        console.log("=== DETERMINISTIC MY PROJECTS ===");
        
        // Fetch projects assigned to current employee
        const { data: employeeProjects, error: projectError } = await supabase
          .from("employee_projects")
          .select(`
            project_id,
            projects!inner(id, name, description, color, status)
          `)
          .eq("employee_id", currentEmployee.id);
        
        if (projectError) {
          console.error("Error fetching employee projects:", projectError);
        }
        
        console.log("Projects found:", employeeProjects?.length);
        
        const profile = currentEmployee.profiles as any;
        const userName = profile?.full_name?.split(' ')[0] || "there";
        
        if (employeeProjects && employeeProjects.length > 0) {
          const projects = employeeProjects
            .map((ep: any) => ep.projects)
            .filter(Boolean);
          
          deterministicAnswer = `Hi ${userName}! You are currently assigned to **${projects.length} project${projects.length > 1 ? 's' : ''}**:\n\n`;
          
          projects.forEach((p: any, idx: number) => {
            const statusEmoji = p.status === 'active' ? '🟢' : p.status === 'on_hold' ? '🟡' : p.status === 'completed' ? '✅' : '⚪';
            deterministicAnswer += `${idx + 1}. ${statusEmoji} **${p.name}**`;
            if (p.description) {
              deterministicAnswer += `\n   ${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}`;
            }
            if (p.status) {
              deterministicAnswer += `\n   Status: ${p.status.replace('_', ' ')}`;
            }
            deterministicAnswer += '\n\n';
          });
          
          deterministicAnswer += "Let me know if you need more details about any specific project!";
        } else {
          deterministicAnswer = `Hi ${userName}! Based on current records, you don't have any projects assigned to you yet.\n\n`;
          deterministicAnswer += "This could mean:\n";
          deterministicAnswer += "• You haven't been assigned to any projects\n";
          deterministicAnswer += "• Project assignments haven't been set up in the system\n\n";
          deterministicAnswer += "If you believe this is an error, please contact your manager or the project management team to get assigned to relevant projects.";
        }
        
        const endTime = Date.now();
        await logUsage(supabase, {
          organizationId,
          userId: user.id,
          employeeId: currentEmployee.id,
          conversationId,
          queryType: "deterministic_projects",
          promptLength: question.length,
          responseLength: deterministicAnswer.length,
          latencyMs: endTime - startTime,
        });
        
        return new Response(JSON.stringify({ 
          answer: deterministicAnswer,
          usage: {
            model: "deterministic",
            query_type: "my_projects",
            tokens: 0,
            latency_ms: endTime - startTime
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ========================================
    // FALL THROUGH TO LLM FOR OTHER QUERIES
    // ========================================

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
      default_model: aiSettings?.default_model || "google/gemini-3-flash-preview",
      allowed_models: aiSettings?.allowed_models || ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "google/gemini-3-flash-preview"],
    };

    // Determine which model to use
    const model = requestedModel && settings.allowed_models.includes(requestedModel) 
      ? requestedModel 
      : settings.default_model;

    // Detect query type
    const queryType = detectQueryType(question);

    // ========================================
    // VECTOR SEARCH FOR SEMANTIC CONTEXT
    // ========================================
    let vectorContext = "";
    const vectorMatches = await searchKnowledgeEmbeddings(
      supabase,
      lovableApiKey,
      question,
      organizationId,
      role,
      currentEmployee?.id
    );

    if (vectorMatches.length > 0) {
      console.log("Vector search found", vectorMatches.length, "relevant chunks");
      vectorContext = vectorMatches
        .map(match => `[${match.source_type}${match.title ? `: ${match.title}` : ''}]\n${match.content}`)
        .join("\n\n---\n\n");
    }

    // ========================================
    // ORGANIZATION BUSINESS CONTEXT - Parallel queries for performance
    // ========================================
    const [orgResult, deptResult, posResult] = await Promise.all([
      supabase
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
        .single(),
      supabase
        .from("departments")
        .select("id, name, description")
        .eq("organization_id", organizationId)
        .limit(50),
      supabase
        .from("positions")
        .select("id, name, department, description")
        .eq("organization_id", organizationId)
        .limit(100)
    ]);

    const { data: organization } = orgResult;
    const { data: departmentsFromTable } = deptResult;
    const { data: positionsFromTable } = posResult;

    // Build department names from the proper table
    const uniqueDepartments = departmentsFromTable?.map(d => d.name).filter(Boolean) || [];

    // Build positions from the proper table (grouped by department)
    const positionsByDept: Record<string, string[]> = {};
    positionsFromTable?.forEach(p => {
      const dept = p.department || "Other";
      if (!positionsByDept[dept]) positionsByDept[dept] = [];
      positionsByDept[dept].push(p.name);
    });

    // Build business context string
    const businessCategory = organization?.industry || "Not specified";
    const companySize = organization?.company_size || "Not specified";
    const companyName = organization?.legal_business_name || organization?.name || "the organization";
    const companyCountry = organization?.country || "Not specified";

    // ========================================
    // PERSONAL DATA CONTEXT - Parallel queries for performance
    // ========================================
    let userPersonalContext = "";

    if (currentEmployee) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Run all personal context queries in parallel using Promise.all with direct awaits
      // Build query promises conditionally
      const leaveBalancePromise = (settings.leave_enabled && currentEmployee.office_id)
        ? supabase
            .from("leave_type_balances")
            .select(`balance, year, office_leave_types!inner(name, category)`)
            .eq("employee_id", currentEmployee.id)
            .eq("year", currentYear)
            .not("office_leave_type_id", "is", null)
        : null;

      const pendingLeavesPromise = settings.leave_enabled
        ? supabase
            .from("leave_requests")
            .select("leave_type, start_date, end_date, status, reason, days_count")
            .eq("employee_id", currentEmployee.id)
            .in("status", ["pending", "approved"])
            .gte("end_date", new Date().toISOString().split("T")[0])
            .order("start_date", { ascending: true })
            .limit(10)
        : null;

      const attendancePromise = settings.attendance_enabled
        ? supabase
            .from("attendance_records")
            .select("date, check_in_time, check_out_time, work_hours, status")
            .eq("employee_id", currentEmployee.id)
            .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
            .order("date", { ascending: false })
            .limit(30)
        : null;

      const kpisPromise = settings.kpis_enabled
        ? supabase
            .from("kpis")
            .select("title, target_value, current_value, unit, status, period, due_date, description")
            .eq("employee_id", currentEmployee.id)
            .order("created_at", { ascending: false })
            .limit(10)
        : null;

      // Execute all queries in parallel
      const [leaveBalanceResult, pendingLeavesResult, attendanceResult, kpisResult] = await Promise.all([
        leaveBalancePromise,
        pendingLeavesPromise,
        attendancePromise,
        kpisPromise
      ]);

      // Process leave balances
      if (settings.leave_enabled) {
        let leaveBalances: Array<{ name: string; balance: number; category: string }> = [];
        const balanceYear = currentYear;

        const officeBalances = leaveBalanceResult?.data;
        if (officeBalances && officeBalances.length > 0) {
          leaveBalances = officeBalances.map((b: any) => ({
            name: b.office_leave_types?.name || "Unknown",
            balance: b.balance,
            category: b.office_leave_types?.category || "N/A"
          }));
        }

        const pendingLeaves = pendingLeavesResult?.data;

        userPersonalContext += `
YOUR LEAVE BALANCES (${balanceYear}):
${leaveBalances.length > 0 
  ? leaveBalances.map(lb => 
      `- ${lb.name}: ${lb.balance} days remaining (${lb.category})`
    ).join("\n") 
  : "No leave balances configured. Please contact HR to set up your leave entitlements."}

YOUR PENDING/UPCOMING LEAVES:
${pendingLeaves?.length 
  ? pendingLeaves.map((l: any) => `- ${l.leave_type}: ${l.start_date} to ${l.end_date} (${l.days_count} days, ${l.status})`).join("\n") 
  : "No upcoming leaves"}
`;
      }

      // Process attendance data
      if (settings.attendance_enabled) {
        const attendanceRecords = attendanceResult?.data;
        
        const avgHours = attendanceRecords?.length 
          ? (attendanceRecords.reduce((sum: number, r: any) => sum + (r.work_hours || 0), 0) / attendanceRecords.length).toFixed(1)
          : "N/A";

        const recentRecord = attendanceRecords?.[0];
        userPersonalContext += `
YOUR ATTENDANCE (Last 30 Days):
- Average work hours: ${avgHours} hours/day
- Total records: ${attendanceRecords?.length || 0}
- Most recent: ${recentRecord ? `${recentRecord.date} - ${recentRecord.check_in_time || "No check-in"} to ${recentRecord.check_out_time || "No check-out"}` : "No records"}
`;
      }

      // Process KPIs
      if (settings.kpis_enabled) {
        const userKpis = kpisResult?.data;

        const kpiStatusSummary = userKpis?.reduce((acc: Record<string, number>, k: any) => {
          const status = k.status || "unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}) || {};

        userPersonalContext += `
YOUR KPIs/PERFORMANCE METRICS (${userKpis?.length || 0} total):
${userKpis?.length ? userKpis.map((k: any) => {
  const progress = k.target_value ? ((k.current_value || 0) / k.target_value * 100).toFixed(0) : 0;
  return `- ${k.title}
    Progress: ${k.current_value ?? 0}/${k.target_value ?? 0} ${k.unit || ""} (${progress}%)
    Status: ${k.status || "N/A"}
    Period: ${k.period || "N/A"}${k.due_date ? ` | Due: ${k.due_date}` : ""}`;
}).join("\n") : "No KPIs assigned to you. Contact your manager to set up performance goals."}

KPI STATUS SUMMARY: ${Object.entries(kpiStatusSummary).map(([s, c]) => `${s}: ${c}`).join(", ") || "N/A"}
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
        
        // Get leave balances for direct reports (office_leave_types only)
        if (settings.leave_enabled) {
          const { data: teamLeaveBalances } = await supabase
            .from("leave_type_balances")
            .select(`
              employee_id, balance,
              office_leave_types(name)
            `)
            .in("employee_id", directReportIds)
            .eq("year", currentYear)
            .not("office_leave_type_id", "is", null);

          // Group by employee
          const teamLeaveMap: Record<string, string[]> = {};
          teamLeaveBalances?.forEach((lb: any) => {
            if (!teamLeaveMap[lb.employee_id]) teamLeaveMap[lb.employee_id] = [];
            const typeName = lb.office_leave_types?.name || "Unknown";
            teamLeaveMap[lb.employee_id].push(`${typeName}: ${lb.balance}`);
          });

          const { data: teamPendingLeaves } = await supabase
            .from("leave_requests")
            .select("employee_id, leave_type, start_date, end_date, status")
            .in("employee_id", directReportIds)
            .eq("status", "pending");

          teamDataContext += `
YOUR DIRECT REPORTS (${directReports.length}):
${directReports.map(dr => {
  const leaveInfo = teamLeaveMap[dr.id]?.join(", ") || "No balances";
  return `- ${(dr as any).profiles?.full_name}: ${dr.position} | ${leaveInfo}`;
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
    // HR & ADMIN CONTACTS CONTEXT
    // ========================================
    let hrContactsContext = "";
    
    // Fetch employees in HR-related departments
    const { data: hrDeptEmployees } = await supabase
      .from("employees")
      .select(`
        id, position, department,
        profiles!inner(full_name, email)
      `)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .or("department.ilike.%hr%,department.ilike.%human resources%,department.ilike.%people%");

    // Fetch users with HR/Admin/Owner roles
    const { data: hrRoleUsers } = await supabase
      .from("user_roles")
      .select("role, user_id")
      .eq("organization_id", organizationId)
      .in("role", ["hr", "admin", "owner"]);

    // Get employee details for role users
    let roleEmployees: any[] = [];
    if (hrRoleUsers && hrRoleUsers.length > 0) {
      const userIds = hrRoleUsers.map(r => r.user_id);
      const { data: empData } = await supabase
        .from("employees")
        .select(`
          id, position, department, user_id,
          profiles!inner(full_name, email)
        `)
        .eq("organization_id", organizationId)
        .in("user_id", userIds);
      
      roleEmployees = (empData || []).map(e => ({
        ...e,
        role: hrRoleUsers.find(r => r.user_id === e.user_id)?.role
      }));
    }

    // Combine and deduplicate HR contacts
    const hrPeopleMap = new Map();
    
    hrDeptEmployees?.forEach(e => {
      hrPeopleMap.set(e.id, {
        name: (e as any).profiles?.full_name,
        position: e.position,
        department: e.department,
        source: "HR Department"
      });
    });
    
    roleEmployees.forEach(e => {
      if (!hrPeopleMap.has(e.id)) {
        hrPeopleMap.set(e.id, {
          name: (e as any).profiles?.full_name,
          position: e.position,
          role: e.role,
          source: `${e.role} role`
        });
      } else {
        const existing = hrPeopleMap.get(e.id);
        existing.role = e.role;
      }
    });

    const hrPeople = Array.from(hrPeopleMap.values());
    
    if (hrPeople.length > 0) {
      hrContactsContext = `
HR & ADMIN CONTACTS (People who handle HR matters):
${hrPeople.map(p => 
  `- ${p.name}: ${p.position || "N/A"}${p.department ? ` (${p.department})` : ""}${p.role ? ` [${p.role.toUpperCase()}]` : ""}`
).join("\n")}
`;
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
    // BUILD ORGANIZATION STRUCTURE CONTEXT
    // ========================================
    let orgStructureContext = "";
    if (uniqueDepartments.length > 0 || Object.keys(positionsByDept).length > 0) {
      orgStructureContext = `
ORGANIZATION STRUCTURE:

DEPARTMENTS (${uniqueDepartments.length}):
${uniqueDepartments.map(d => `- ${d}`).join("\n") || "No departments defined"}

POSITIONS BY DEPARTMENT:
${Object.entries(positionsByDept).map(([dept, positions]) => 
  `${dept}:\n${positions.map(p => `  - ${p}`).join("\n")}`
).join("\n\n") || "No positions defined"}
`;
    }

    // ========================================
    // BUILD SYSTEM PROMPT
    // ========================================
    const profile = currentEmployee?.profiles as unknown as { full_name: string; avatar_url: string; email: string } | null;
    const userName = profile?.full_name || "User";
    
    const systemPrompt = `You are GlobalyOS AI - a helpful AI assistant for ${companyName}.

## CRITICAL RESPONSE RULES:
1. **Answer ONLY the current question** - Do NOT summarize, repeat, or re-answer previous questions from the conversation
2. **Stay focused** - If the user asks one thing, answer only that one thing
3. **Never say "as I mentioned" or "to summarize what we discussed"** - Each response should be self-contained for the current query
4. **Conversation history is for context only** - Use it to understand references but do NOT re-address old topics
5. **No preambles about previous answers** - Jump straight into answering the current question

## YOUR ROLE:
Answer questions about the organization, team, policies, leave, attendance, KPIs using the context below.
For general questions (writing, research, coding), act as a helpful assistant.

## FORMATTING GUIDELINES:
- Use clear headings (###) to separate major sections
- Add a blank line before and after lists
- Keep paragraphs short (2-4 sentences max)
- Use bullet points for lists
- Add visual separation between distinct topics

## ORGANIZATION:
- Company: ${companyName}
- Industry: ${businessCategory}
- Size: ${companySize}
- Country: ${companyCountry}

## CURRENT USER:
Name: ${userName}
Role: ${role}
Department: ${currentEmployee?.department || "Unknown"}
Position: ${currentEmployee?.position || "Unknown"}

${userPersonalContext ? `## YOUR PERSONAL DATA:\n${userPersonalContext}` : ""}

${teamDataContext ? `## TEAM DATA (${role} access):\n${teamDataContext}` : ""}

${hrContactsContext ? `## HR CONTACTS:\n${hrContactsContext}` : ""}

${orgStructureContext ? `## ORG STRUCTURE:\n${orgStructureContext}` : ""}

${vectorContext ? `## RELEVANT KNOWLEDGE (from semantic search):\n${vectorContext}` : ""}

${queryType === "internal" ? `
## WIKI:
${wikiContext || "No wiki content."}

## TEAM DIRECTORY:
${teamDirectoryContext || "Not available."}

## ANNOUNCEMENTS:
${announcementsContext || "None."}

## CALENDAR:
${calendarContext || "No events."}
` : ""}

## PRIVACY RULES:
- Never share salary, bank details, or sensitive HR data
- Users only see their own personal data
- Managers see direct reports' data
- Admin/HR/Owner have broader access

Be helpful, accurate, and concise. REMEMBER: Answer ONLY the current question, never summarize previous topics.`;

    // Limit conversation history to avoid model confusion
    const limitedHistory = conversationHistory.slice(-6).filter((msg: { role: string; content: string }) => {
      // Filter out previous "I don't have access" responses to prevent poisoning
      if (msg.role === "assistant" && 
          (msg.content.includes("I do not have access") || 
           msg.content.includes("data is not available") ||
           msg.content.includes("does not contain"))) {
        return false;
      }
      return true;
    });

    const messages = [
      { role: "system", content: systemPrompt },
      ...limitedHistory.map((msg: { role: string; content: string }) => ({
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

    // Build sources from vector matches for citation
    const sources = vectorMatches.length > 0 
      ? vectorMatches.slice(0, 5).map(m => ({
          type: m.source_type,
          title: m.title,
          similarity: m.similarity
        }))
      : undefined;

    // Calculate usage metrics
    const endTime = Date.now();
    const latencyMs = endTime - startTime;
    
    // Estimate tokens
    const promptLength = systemPrompt.length + question.length + 
      limitedHistory.reduce((sum: number, m: { content: string }) => sum + m.content.length, 0);
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
      sources,
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
