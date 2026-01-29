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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Verify user is super admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const userId = claims.claims.sub;

    // Check super admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Super admin access required" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { template_id } = await req.json();

    if (!template_id) {
      return new Response(JSON.stringify({ error: "Template ID required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Fetch the template
    const { data: template, error: fetchError } = await adminClient
      .from("template_wiki_documents")
      .select("*")
      .eq("id", template_id)
      .single();

    if (fetchError || !template) {
      return new Response(JSON.stringify({ error: "Template not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Generate content using Lovable AI
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Build context for AI
    let contextInfo = `Template: ${template.name}`;
    if (template.description) contextInfo += `\nDescription: ${template.description}`;
    if (template.category) contextInfo += `\nCategory: ${template.category}`;
    if (template.subcategory) contextInfo += `\nSubcategory: ${template.subcategory}`;
    if (template.business_category) contextInfo += `\nBusiness Category: ${template.business_category}`;
    if (template.country_code) contextInfo += `\nCountry: ${template.country_code}`;

    const categoryPrompts: Record<string, string> = {
      policies: "Create a comprehensive company policy document",
      sops: "Create a detailed Standard Operating Procedure with step-by-step instructions",
      business_plans: "Create a professional business plan document",
      hr_documents: "Create a professional HR document",
      compliance: "Create a compliance document with regulatory requirements",
      operations: "Create an operational documentation document",
    };

    const basePrompt = categoryPrompts[template.category] || "Create a professional document";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional document writer. Generate comprehensive business documents in HTML format.
Use proper HTML tags: <h1>, <h2>, <h3> for headings, <p> for paragraphs, <ul>/<ol> and <li> for lists, <strong> for emphasis, <table> for tables if needed.
Make the content professional, comprehensive, and practical.
Do not include any markdown formatting - only use HTML tags.`
          },
          {
            role: "user",
            content: `${basePrompt} based on this template information:\n\n${contextInfo}\n\nGenerate detailed, professional content for this document.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Update the template with generated content
    const { error: updateError } = await adminClient
      .from("template_wiki_documents")
      .update({ content })
      .eq("id", template_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update template" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      template_id,
      content_length: content.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
