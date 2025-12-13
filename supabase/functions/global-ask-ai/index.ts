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

    // Fetch accessible AI content using the security definer function
    const { data: indexedContent, error: contentError } = await supabase
      .rpc("get_accessible_ai_content", {
        _user_id: user.id,
        _organization_id: organizationId,
        _content_types: null,
        _limit: 150
      });

    if (contentError) {
      console.error("Error fetching indexed content:", contentError);
    }

    // Also fetch real-time wiki pages for latest content
    const { data: wikiPages } = await supabase
      .from("wiki_pages")
      .select("title, content, access_scope")
      .eq("organization_id", organizationId);

    // Fetch employee directory for team queries (public info only)
    const { data: employees } = await supabase
      .from("employees")
      .select(`
        id, position, department, 
        profiles!inner(full_name),
        offices(name)
      `)
      .eq("organization_id", organizationId)
      .eq("status", "active");

    // Fetch announcements and wins (last 30 days)
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

    // Build context sections
    let wikiContext = "";
    if (wikiPages && wikiPages.length > 0) {
      wikiContext = wikiPages
        .map((page) => {
          const plainContent = page.content?.replace(/<[^>]*>/g, "") || "";
          return `### ${page.title}\n${plainContent.substring(0, 2000)}`;
        })
        .join("\n\n");
    }

    let teamContext = "";
    if (employees && employees.length > 0) {
      teamContext = employees
        .map((emp: any) => {
          const name = emp.profiles?.full_name || "Unknown";
          const office = emp.offices?.name || "";
          return `- ${name}: ${emp.position} (${emp.department})${office ? ` - ${office}` : ""}`;
        })
        .join("\n");
    }

    let announcementsContext = "";
    if (updates && updates.length > 0) {
      announcementsContext = updates
        .map((u) => {
          const plainContent = u.content?.replace(/<[^>]*>/g, "") || "";
          const date = new Date(u.created_at).toLocaleDateString();
          return `[${u.type.toUpperCase()} - ${date}] ${plainContent.substring(0, 500)}`;
        })
        .join("\n\n");
    }

    let indexedContext = "";
    if (indexedContent && indexedContent.length > 0) {
      indexedContext = indexedContent
        .map((item: any) => {
          return `[${item.content_type.toUpperCase()}${item.title ? `: ${item.title}` : ""}]\n${item.content?.substring(0, 1000) || ""}`;
        })
        .join("\n\n");
    }

    const systemPrompt = `You are the GlobalyOS AI Assistant for this organization's internal knowledge base.

You have access to the organization's:
- Wiki documentation and knowledge base
- Team directory (public information: names, positions, departments, offices)
- Recent announcements and wins
- Chat conversations (only those the user participates in)

IMPORTANT ACCESS & PRIVACY RULES:
- Only reference information the user has access to based on their role
- NEVER reveal salary, personal contact details, banking, tax, or sensitive HR data
- For team questions, provide only public directory info (name, position, department, office)
- For chat references, only cite conversations the user is part of
- If asked about something not in the knowledge base, say so clearly

Be helpful, concise, and professional. When referencing information, mention the source (Wiki, Team Directory, Announcement, etc.).

--- WIKI KNOWLEDGE BASE ---
${wikiContext || "No wiki content available."}

--- TEAM DIRECTORY ---
${teamContext || "No team data available."}

--- RECENT ANNOUNCEMENTS & WINS ---
${announcementsContext || "No recent announcements."}

--- INDEXED CONTENT (Chat, KPIs, etc.) ---
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
