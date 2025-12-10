import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  fullName: string;
  position: string;
  department: string;
  joinDate: string;
  phone?: string;
  location?: string;
  role: 'admin' | 'user';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, position, department, joinDate, phone, location, role }: InviteRequest = await req.json();

    // Validate required fields
    if (!email || !fullName || !position || !department || !joinDate || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('Inviting team member:', normalizedEmail, 'with role:', role);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'A user with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth user with a temporary password (they'll use OTP to login)
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('Created auth user:', userId);

    // Create employee record
    const { error: employeeError } = await supabase
      .from('employees')
      .insert({
        user_id: userId,
        position: position.trim(),
        department: department.trim(),
        join_date: joinDate,
        phone: phone?.trim() || null,
        location: location?.trim() || null,
      });

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      // Cleanup: delete the auth user if employee creation fails
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Failed to create employee record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Continue anyway - role can be assigned later
    }

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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to TeamHub!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${fullName}</strong>,</p>
            <p>You've been invited to join TeamHub as a team member. Here are your details:</p>
            <div class="details">
              <p><strong>Position:</strong> ${position}</p>
              <p><strong>Department:</strong> ${department}</p>
              <p><strong>Start Date:</strong> ${new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Role:</strong> ${role === 'admin' ? 'Administrator' : 'Team Member'}</p>
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

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'TeamHub <onboarding@resend.dev>',
          to: [normalizedEmail],
          subject: 'Welcome to TeamHub - You\'ve been invited!',
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text();
        console.error('Error sending invitation email:', emailError);
      } else {
        console.log('Invitation email sent successfully');
      }
    } catch (emailErr) {
      console.error('Error sending invitation email:', emailErr);
      // Don't fail the whole operation if email fails
    }

    console.log('Team member invited successfully:', normalizedEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Team member invited successfully',
        userId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in invite-team-member:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
