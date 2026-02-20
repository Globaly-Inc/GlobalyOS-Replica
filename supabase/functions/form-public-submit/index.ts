import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { formId, answers, submitterMeta } = await req.json();

    if (!formId || !answers) {
      return new Response(JSON.stringify({ error: "Missing formId or answers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get form and published version
    const { data: form, error: formErr } = await supabase
      .from("forms")
      .select("id, organization_id, published_version_id, status, settings")
      .eq("id", formId)
      .single();

    if (formErr || !form || form.status !== "published" || !form.published_version_id) {
      return new Response(JSON.stringify({ error: "Form not found or not published" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check honeypot
    const settings = (form.settings || {}) as Record<string, unknown>;
    if (settings.honeypotEnabled && answers._hp_field) {
      return new Response(JSON.stringify({ error: "Spam detected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert submission using service role (bypasses RLS)
    const { data: submission, error: subErr } = await supabase
      .from("form_submissions")
      .insert({
        form_id: formId,
        form_version_id: form.published_version_id,
        organization_id: form.organization_id,
        answers,
        computed: {},
        status: "new",
        submitter_meta: submitterMeta || {},
        tags: [],
        notes: [],
      })
      .select("id")
      .single();

    if (subErr) {
      console.error("Submission error:", subErr);
      return new Response(JSON.stringify({ error: "Failed to save submission" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, submissionId: submission.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
