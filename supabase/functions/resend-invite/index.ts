import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendRequest {
  employeeId: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employeeId }: ResendRequest = await req.json();

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: 'Employee ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resending invite for employee:', employeeId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get employee details with profile
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        profiles!inner(full_name, email)
      `)
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      console.error('Error fetching employee:', employeeError);
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if employee is in invited status
    if (employee.status !== 'invited') {
      return new Response(
        JSON.stringify({ error: 'Can only resend invites to employees with invited status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = employee.profiles.email;
    const fullName = employee.profiles.full_name;
    const position = employee.position;
    const department = employee.department;
    const joinDate = employee.join_date;

    // Get the app URL from environment or use default
    const appUrl = Deno.env.get('APP_URL') || 'https://teamhub.lovable.app';

    // Send invitation email via Resend API
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #6366f1; margin: 0; font-size: 28px; }
          .content { background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
          .details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .details p { margin: 8px 0; }
          .details strong { color: #64748b; }
          .cta { text-align: center; margin: 30px 0; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .footer { text-align: center; color: #64748b; font-size: 14px; }
          .reminder { background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Reminder: Join TeamHub!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${fullName}</strong>,</p>
            <div class="reminder">
              <p><strong>This is a reminder to complete your TeamHub registration.</strong></p>
            </div>
            <p>You were invited to join TeamHub as a team member. Here are your details:</p>
            <div class="details">
              <p><strong>Position:</strong> ${position}</p>
              <p><strong>Department:</strong> ${department}</p>
              <p><strong>Start Date:</strong> ${joinDate ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed'}</p>
            </div>
            <p>To get started, click the button below and use the OTP login with your email address:</p>
            <div class="cta">
              <a href="${appUrl}/auth" class="button">Join TeamHub</a>
            </div>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact your administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'TeamHub <onboarding@resend.dev>',
        to: [email],
        subject: 'Reminder: Complete your TeamHub registration',
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Error sending invitation email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email. Please check your Resend configuration.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation email resent successfully to:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation resent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in resend-invite:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
