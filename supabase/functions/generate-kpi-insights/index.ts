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
    const { employee_id, quarter, year } = await req.json();

    if (!employee_id || !quarter || !year) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: employee_id, quarter, year" }),
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
      .select("id, position, department, organization_id, profiles(full_name)")
      .eq("id", employee_id)
      .single();

    if (empError || !employee) {
      console.error("Employee fetch error:", empError);
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch KPIs for the quarter
    const { data: kpis, error: kpiError } = await supabase
      .from("kpis")
      .select("*")
      .eq("employee_id", employee_id)
      .eq("quarter", quarter)
      .eq("year", year);

    if (kpiError) {
      console.error("KPIs fetch error:", kpiError);
    }

    // Fetch recent achievements
    const { data: achievements } = await supabase
      .from("achievements")
      .select("title, description, achieved_at")
      .eq("employee_id", employee_id)
      .order("achieved_at", { ascending: false })
      .limit(5);

    // Fetch recent kudos received
    const { data: kudos } = await supabase
      .from("kudos")
      .select("comment, created_at")
      .eq("employee_id", employee_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Build context for AI
    const kpiSummary = kpis?.map((k) => ({
      title: k.title,
      target: k.target_value,
      current: k.current_value,
      progress: k.target_value ? Math.round((k.current_value / k.target_value) * 100) : 0,
      status: k.status,
      unit: k.unit,
    })) || [];

    const prompt = `You are an HR analytics assistant. Analyze this employee's performance data and provide actionable insights.

Employee: ${(employee.profiles as any)?.full_name || "Team Member"}
Position: ${employee.position}
Department: ${employee.department}
Quarter: Q${quarter} ${year}

KPIs/OKRs:
${kpiSummary.length > 0 ? kpiSummary.map((k) => `- ${k.title}: ${k.current}/${k.target} ${k.unit || ""} (${k.progress}% complete, status: ${k.status})`).join("\n") : "No KPIs set for this quarter"}

Recent Achievements:
${achievements?.length ? achievements.map((a) => `- ${a.title}: ${a.description}`).join("\n") : "None recorded"}

Recent Recognition (Kudos):
${kudos?.length ? kudos.map((k) => `- "${k.comment}"`).join("\n") : "None recorded"}

Provide insights in the following JSON format exactly:
{
  "trends": [
    { "type": "improving|declining|stagnant", "metric": "metric name", "description": "brief description" }
  ],
  "focus_areas": [
    { "priority": "high|medium|low", "title": "area title", "action": "specific action to take" }
  ],
  "recommendations": [
    { "type": "training|mentorship|project|habit", "title": "recommendation title", "description": "brief description" }
  ],
  "summary": "2-3 sentence overall performance summary"
}

Be specific, actionable, and constructive. If no KPIs exist, focus on general recommendations based on their role.`;

    console.log("Calling Lovable AI for KPI insights...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert HR analytics assistant. Always respond with valid JSON only." },
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
    let insights;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      insights = {
        trends: [],
        focus_areas: [{ priority: "medium", title: "Set KPIs", action: "Work with your manager to define measurable goals for this quarter" }],
        recommendations: [{ type: "habit", title: "Regular check-ins", description: "Schedule weekly progress reviews" }],
        summary: "Unable to generate detailed insights. Consider setting specific KPIs for more accurate analysis.",
      };
    }

    // Save insights to database
    const { error: upsertError } = await supabase
      .from("kpi_ai_insights")
      .upsert({
        employee_id,
        organization_id: employee.organization_id,
        quarter,
        year,
        insights,
        generated_at: new Date().toISOString(),
      }, { onConflict: "employee_id,quarter,year" });

    if (upsertError) {
      console.error("Failed to save insights:", upsertError);
    }

    console.log("KPI insights generated successfully");

    return new Response(
      JSON.stringify({ insights, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-kpi-insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
