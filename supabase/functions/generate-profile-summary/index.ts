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
    const { employee, employeeId, forceRegenerate } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check for cached summary if not forcing regeneration
    if (!forceRegenerate && employeeId) {
      const { data: cached } = await supabase
        .from("profile_summaries")
        .select("summary, updated_at")
        .eq("employee_id", employeeId)
        .maybeSingle();
      
      if (cached) {
        console.log("Returning cached summary for employee:", employeeId);
        return new Response(JSON.stringify({ summary: cached.summary, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating new AI summary for employee:", employeeId);

    const prompt = `Generate a brief, professional 50-word summary about this team member based on their profile information. Focus on their role, department, skills/superpowers, tenure, and any notable achievements or kudos received. Do NOT mention any salary or compensation information. Keep it positive and professional.

Team Member Profile:
- Name: ${employee.name}
- Position: ${employee.position}
- Department: ${employee.department}
- Join Date: ${employee.joinDate}
- Office: ${employee.office || 'Not specified'}
- Superpowers: ${employee.superpowers?.join(', ') || 'Not specified'}
- Projects: ${employee.projects?.join(', ') || 'No projects assigned'}
- Kudos Received: ${employee.kudosCount || 0}
- Recent Kudos Messages: ${employee.recentKudos?.slice(0, 3).join(' | ') || 'None'}
- Direct Reports: ${employee.directReportsCount || 0}
- Manager: ${employee.managerName || 'None'}

Write a friendly, engaging summary in about 50 words.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a helpful HR assistant that writes concise, professional team member summaries. Keep summaries exactly around 50 words, positive and engaging." },
          { role: "user", content: prompt },
        ],
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate summary");
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Unable to generate summary.";

    // Cache the summary
    if (employeeId) {
      const { error: upsertError } = await supabase
        .from("profile_summaries")
        .upsert({
          employee_id: employeeId,
          organization_id: employee.organizationId || null,
          summary: summary,
        }, {
          onConflict: "employee_id"
        });
      
      if (upsertError) {
        console.error("Error caching summary:", upsertError);
      } else {
        console.log("Summary cached successfully for employee:", employeeId);
      }
    }

    return new Response(JSON.stringify({ summary, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating profile summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
