import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the request is from a super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is super admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      throw new Error("Only super admins can reject organizations");
    }

    const { organizationId, reason } = await req.json();
    
    if (!organizationId) {
      throw new Error("Organization ID is required");
    }
    
    if (!reason || !reason.trim()) {
      throw new Error("Rejection reason is required");
    }

    // Get the organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    if (org.approval_status !== 'pending') {
      throw new Error("Organization is not pending approval");
    }

    // Update the organization
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        approval_status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason.trim(),
      })
      .eq('id', organizationId);

    if (updateError) {
      throw new Error(`Failed to reject organization: ${updateError.message}`);
    }

    // Send rejection email (optional - implement later)
    // await sendRejectionEmail(org.owner_email, org.name, reason);

    return new Response(
      JSON.stringify({ success: true, message: "Organization rejected" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error rejecting organization:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
