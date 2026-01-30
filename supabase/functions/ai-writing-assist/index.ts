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
  let requestType: string = "unknown";

  try {
    const { type, currentText, context } = await req.json();
    requestType = type;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify authentication and get user context for tracking
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        userId = user.id;
        
        // Get employee and organization context
        const { data: employee } = await supabase
          .from("employees")
          .select("id, organization_id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (employee) {
          employeeId = employee.id;
          organizationId = employee.organization_id;
        }
      }
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "win":
        systemPrompt = `You are a helpful writing assistant for workplace wins and achievements. 
Your task is to help write or improve a brief, professional, and celebratory message about a work achievement.
Keep the tone positive, humble yet proud, and engaging. Use 2-4 sentences maximum.
Do not use emojis. Be concise and impactful.`;
        userPrompt = currentText 
          ? `Please improve and polish this win announcement while keeping its core message:\n\n"${currentText}"\n\nMake it more engaging and professional.`
          : `Write a brief, engaging announcement about a work achievement. ${context || "The user hasn't provided specific details, so write a general template they can customize about completing a project or reaching a milestone."}`;
        break;
        
      case "announcement":
        systemPrompt = `You are a helpful writing assistant for workplace announcements.
Your task is to help write or improve a clear, professional announcement for the team.
Keep the tone informative, friendly, and professional. Use 2-4 sentences maximum.
Do not use emojis. Be clear and direct.`;
        userPrompt = currentText
          ? `Please improve and polish this announcement while keeping its core message:\n\n"${currentText}"\n\nMake it clearer and more professional.`
          : `Write a brief, professional team announcement. ${context || "The user hasn't provided specific details, so write a general template about an upcoming change or update."}`;
        break;
        
      case "kudos":
        systemPrompt = `You are a helpful writing assistant for workplace recognition and appreciation messages.
Your task is to help write or improve a heartfelt, genuine message of appreciation for a colleague.
Keep the tone warm, specific, and sincere. Use 2-3 sentences maximum.
Do not use emojis. Focus on specific contributions or qualities.`;
        userPrompt = currentText
          ? `Please improve and polish this kudos message while keeping its core sentiment:\n\n"${currentText}"\n\nMake it more heartfelt and specific.`
          : `Write a brief, genuine appreciation message for a colleague. ${context || "The user hasn't provided specific details, so write a template about thanking someone for their help or great work."}`;
        break;

      case "social":
        systemPrompt = `You are a helpful writing assistant for workplace social posts.
Your task is to help write or improve a friendly, engaging social post for colleagues.
Keep the tone conversational, positive, and professional. Use 2-4 sentences maximum.
Do not use emojis. Be relatable and engaging.`;
        userPrompt = currentText
          ? `Please improve and polish this social post while keeping its core message:\n\n"${currentText}"\n\nMake it more engaging and relatable.`
          : `Write a brief, friendly social post for colleagues. ${context || "The user hasn't provided specific details, so write a general template about sharing an update, thought, or question with the team."}`;
        break;

      case "wiki":
        systemPrompt = `You are a helpful writing assistant for internal wiki documentation.
Your task is to help write or improve clear, well-structured documentation content.
Keep the tone professional, informative, and easy to understand.
Use proper formatting with paragraphs. Be thorough but concise.
Do not use emojis. Focus on clarity and completeness.`;
        userPrompt = currentText
          ? `Please improve and polish this wiki content while keeping its core information:\n\n"${currentText}"\n\nMake it clearer, better structured, and more professional.`
          : `Write helpful wiki documentation content. ${context || "The user hasn't provided specific details, so write a general template for documenting a process or policy."}`;
        break;
        
      default:
        throw new Error("Invalid type specified");
    }

    console.log(`AI Writing Assist - Type: ${type}, Has current text: ${!!currentText}, User: ${userId || 'anonymous'}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate text");
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim() || "";

    // Extract token usage
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = calculateCost(promptTokens, completionTokens);

    // Log AI usage if we have organization context
    if (organizationId && userId) {
      const { error: usageLogError } = await supabase
        .from("ai_usage_logs")
        .insert({
          organization_id: organizationId,
          user_id: userId,
          employee_id: employeeId,
          query_type: "ai_writing_assist",
          model: "google/gemini-2.5-flash",
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          estimated_cost: estimatedCost,
          latency_ms: latencyMs,
          prompt_length: (currentText || "").length,
          response_length: generatedText.length,
          metadata: {
            feature_name: "ai_writing_assist",
            action_name: currentText ? "improve" : "generate",
            content_type: type,
            success: true,
          },
        });

      if (usageLogError) {
        console.error("Error logging AI usage:", usageLogError);
      }
    }

    console.log(`AI Writing Assist - Type: ${type}, Tokens: ${totalTokens}, Cost: $${estimatedCost.toFixed(6)}, Latency: ${latencyMs}ms`);

    return new Response(
      JSON.stringify({ 
        text: generatedText,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          estimated_cost: estimatedCost,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Writing Assist error:", error);
    
    // Log failed request if we have context
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
          query_type: "ai_writing_assist",
          model: "google/gemini-2.5-flash",
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          estimated_cost: 0,
          latency_ms: Date.now() - startTime,
          metadata: {
            feature_name: "ai_writing_assist",
            action_name: "error",
            content_type: requestType,
            error: error instanceof Error ? error.message : "Unknown error",
            success: false,
          },
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
