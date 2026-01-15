import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckApprovalRequest {
  email: string;
}

interface ApprovalStatusResponse {
  status: 'pending' | 'approved' | 'rejected' | 'not_found';
  name?: string;
  rejectionReason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: CheckApprovalRequest = await req.json();

    // Validate email is provided
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ 
          status: 'not_found',
          error: 'Email is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          status: 'not_found',
          error: 'Invalid email format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Query only the minimal fields needed
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('approval_status, rejection_reason, name')
      .eq('owner_email', email.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Database query error:', error);
      return new Response(
        JSON.stringify({ 
          status: 'not_found',
          error: 'Failed to check status' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!org) {
      console.log(`No organization found for email: ${email}`);
      return new Response(
        JSON.stringify({ status: 'not_found' } as ApprovalStatusResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Only return minimal data
    const response: ApprovalStatusResponse = {
      status: org.approval_status as ApprovalStatusResponse['status'],
      name: org.name,
    };

    // Only include rejection reason if rejected
    if (org.approval_status === 'rejected' && org.rejection_reason) {
      response.rejectionReason = org.rejection_reason;
    }

    console.log(`Approval status for ${email}: ${org.approval_status}`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error('Error in check-approval-status:', error);
    return new Response(
      JSON.stringify({ 
        status: 'not_found',
        error: 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
