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
    const { employee_id, review_id, period_start, period_end } = await req.json();

    if (!employee_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: employee_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch employee info
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, position, department, organization_id, join_date, profiles(full_name)")
      .eq("id", employee_id)
      .single();

    if (empError || !employee) {
      console.error("Employee fetch error:", empError);
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startDate = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
    const endDate = period_end || new Date().toISOString().split("T")[0];

    // Fetch KPIs for the review period
    const { data: kpis } = await supabase
      .from("kpis")
      .select("*")
      .eq("employee_id", employee_id)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    // Fetch achievements
    const { data: achievements } = await supabase
      .from("achievements")
      .select("title, description, achieved_at")
      .eq("employee_id", employee_id)
      .gte("achieved_at", startDate)
      .lte("achieved_at", endDate)
      .order("achieved_at", { ascending: false });

    // Fetch kudos received
    const { data: kudos } = await supabase
      .from("kudos")
      .select("comment, created_at, given_by:employees!kudos_given_by_id_fkey(profiles(full_name))")
      .eq("employee_id", employee_id)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    // Fetch position history for promotions
    const { data: positionHistory } = await supabase
      .from("position_history")
      .select("*")
      .eq("employee_id", employee_id)
      .gte("effective_date", startDate)
      .lte("effective_date", endDate)
      .order("effective_date", { ascending: false });

    // Fetch learning & development
    const { data: learning } = await supabase
      .from("learning_development")
      .select("*")
      .eq("employee_id", employee_id)
      .gte("created_at", startDate)
      .order("created_at", { ascending: false });

    // Build context for AI
    const kpiSummary = kpis?.map((k) => ({
      title: k.title,
      target: k.target_value,
      current: k.current_value,
      progress: k.target_value ? Math.round((k.current_value / k.target_value) * 100) : 0,
      status: k.status,
    })) || [];

    const prompt = `You are an HR manager preparing a performance review. Generate a comprehensive but concise review draft based on the employee data below.

Employee: ${(employee.profiles as any)?.full_name || "Team Member"}
Position: ${employee.position}
Department: ${employee.department}
Join Date: ${employee.join_date}
Review Period: ${startDate} to ${endDate}

KPIs/OKRs Performance:
${kpiSummary.length > 0 ? kpiSummary.map((k) => `- ${k.title}: ${k.current}/${k.target} (${k.progress}% complete, ${k.status})`).join("\n") : "No formal KPIs tracked"}

Achievements:
${achievements?.length ? achievements.map((a) => `- ${a.title}: ${a.description}`).join("\n") : "None formally recorded"}

Recognition Received (${kudos?.length || 0} kudos):
${kudos?.slice(0, 5).map((k) => `- "${k.comment}" - from ${(k.given_by as any)?.profiles?.full_name || "colleague"}`).join("\n") || "None"}

Career Progress:
${positionHistory?.length ? positionHistory.map((p) => `- ${p.change_type}: ${p.position} in ${p.department} (${p.effective_date})`).join("\n") : "No changes during period"}

Learning & Development:
${learning?.length ? learning.map((l) => `- ${l.title} (${l.type}, ${l.status})`).join("\n") : "None recorded"}

Generate a performance review draft in the following JSON format:
{
  "summary": "2-3 sentence overall performance summary",
  "what_went_well": "3-4 bullet points of accomplishments and strengths, each as a separate string in an array",
  "needs_improvement": "2-3 bullet points of areas for growth, constructively framed, as array",
  "goals_next_period": "3-4 specific, measurable goals for the next period as array",
  "key_highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "rating_suggestion": "A number 1-5 with brief justification"
}

Be specific, balanced, and constructive. Reference actual data where available.`;

    console.log("Calling Lovable AI for review draft...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert HR manager writing performance reviews. Always respond with valid JSON only. Be constructive and specific." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service rate limited. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service requires payment. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let draft;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        draft = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      draft = {
        summary: "Review draft could not be generated automatically. Please add details manually.",
        what_went_well: ["Consider adding specific achievements"],
        needs_improvement: ["Identify areas for professional growth"],
        goals_next_period: ["Set specific, measurable objectives"],
        key_highlights: [],
        rating_suggestion: "3 - Meets expectations (adjust based on detailed review)",
      };
    }

    // If review_id provided, update the review with AI draft
    if (review_id) {
      const { error: updateError } = await supabase
        .from("performance_reviews")
        .update({
          ai_draft: draft,
          ai_draft_generated_at: new Date().toISOString(),
        })
        .eq("id", review_id);

      if (updateError) {
        console.error("Failed to save draft to review:", updateError);
      }
    }

    console.log("Review draft generated successfully");

    return new Response(
      JSON.stringify({ draft, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-review-draft:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
