import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cost per 1M tokens (approximate for Gemini 2.5 Flash)
const COST_PER_1M_INPUT_TOKENS = 0.075;
const COST_PER_1M_OUTPUT_TOKENS = 0.30;

function calculateCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens / 1_000_000) * COST_PER_1M_INPUT_TOKENS +
         (completionTokens / 1_000_000) * COST_PER_1M_OUTPUT_TOKENS;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let organizationId: string | null = null;
  let userId: string | null = null;
  let employeeId: string | null = null;
  let success = false;

  try {
    const { question, organizationId: orgId, conversationHistory = [] } = await req.json();
    organizationId = orgId;

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // SECURITY: Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = user.id;

    // SECURITY: Verify user is a member of the organization
    const { data: employee, error: membershipError } = await supabase
      .from("employees")
      .select("id, organization_id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (membershipError) {
      console.error("Membership check error:", membershipError);
      return new Response(JSON.stringify({ error: "Failed to verify organization membership" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!employee) {
      console.warn("Unauthorized organization access attempt:", { userId: user.id, organizationId });
      return new Response(JSON.stringify({ error: "You are not a member of this organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    employeeId = employee.id;

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

    // Fetch wiki pages for context (user is now verified as org member)
    const { data: pages, error: pagesError } = await supabase
      .from("wiki_pages")
      .select("title, content")
      .eq("organization_id", organizationId);

    if (pagesError) {
      console.error("Error fetching wiki pages:", pagesError);
      throw pagesError;
    }

    // Build context from wiki pages
    const wikiContext = pages
      .map((page) => {
        const plainContent = page.content?.replace(/<[^>]*>/g, "") || "";
        return `## ${page.title}\n${plainContent}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a helpful AI assistant for GlobalyOS, a company's internal wiki system. 
Your job is to answer questions based ONLY on the wiki content provided below.

If the answer is not found in the wiki content, politely say that you couldn't find relevant information in the wiki and suggest the user check with their team or update the wiki.

Be concise and helpful. If you reference information, mention which wiki page it comes from.

--- WIKI CONTENT START ---
${wikiContext || "No wiki content available yet."}
--- WIKI CONTENT END ---`;

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

    const latencyMs = Date.now() - startTime;

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

    // Extract token usage from response
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = calculateCost(promptTokens, completionTokens);

    success = true;

    // Log detailed AI usage to ai_usage_logs
    const { error: usageLogError } = await supabase
      .from("ai_usage_logs")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        employee_id: employeeId,
        query_type: "wiki_ask_ai",
        model: "google/gemini-2.5-flash",
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost,
        latency_ms: latencyMs,
        prompt_length: question.length,
        response_length: answer.length,
        metadata: {
          feature_name: "wiki_ask_ai",
          action_name: "ask_question",
          conversation_length: conversationHistory.length,
          wiki_pages_count: pages.length,
        },
      });

    if (usageLogError) {
      console.error("Error logging AI usage:", usageLogError);
    }

    // Record usage for billing (quantity-based)
    const { error: usageError } = await supabase
      .rpc('record_usage', {
        _organization_id: organizationId,
        _feature: 'ai_queries',
        _quantity: 1
      });

    if (usageError) {
      console.error("Error recording usage:", usageError);
    }

    console.log(`Wiki Ask AI - Tokens: ${totalTokens} (prompt: ${promptTokens}, completion: ${completionTokens}), Cost: $${estimatedCost.toFixed(6)}, Latency: ${latencyMs}ms`);

    return new Response(JSON.stringify({ 
      answer,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in wiki-ask-ai:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Log failed request if we have org context
    if (organizationId && userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        
        await supabase.from("ai_usage_logs").insert({
          organization_id: organizationId,
          user_id: userId,
          employee_id: employeeId,
          query_type: "wiki_ask_ai",
          model: "google/gemini-2.5-flash",
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          estimated_cost: 0,
          latency_ms: Date.now() - startTime,
          metadata: {
            feature_name: "wiki_ask_ai",
            action_name: "ask_question",
            error: message,
            success: false,
          },
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }
    }
    
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
