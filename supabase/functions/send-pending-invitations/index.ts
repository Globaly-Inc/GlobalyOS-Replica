import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamMember {
  email: string;
  fullName: string;
  position?: string;
  department?: string;
  role?: string;
}

interface SendPendingInvitationsRequest {
  organizationId: string;
  teamMembers: TeamMember[];
}

// Stable logo URL from Supabase Storage
const GLOBALYOS_LOGO_URL = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';
const APP_URL = 'https://www.globalyos.com';

// Generate a 6-digit OTP code
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('send-pending-invitations: Starting...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: verifyError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (verifyError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SendPendingInvitationsRequest = await req.json();
    const { organizationId, teamMembers } = body;

    if (!organizationId || !teamMembers || teamMembers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing organizationId or teamMembers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${teamMembers.length} pending invitations for org:`, organizationId);

    // Get organization name for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    const orgName = org?.name || 'your organization';
    const results = { sent: [] as string[], failed: [] as string[] };

    for (const member of teamMembers) {
      const normalizedEmail = member.email.trim().toLowerCase();
      
      try {
        // Check if user exists and get their OTP code
        const { data: otpData } = await supabase
          .from('otp_codes')
          .select('code, expires_at')
          .eq('email', normalizedEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let inviteCode = otpData?.code;
        const now = new Date();
        const expiresAt = otpData?.expires_at ? new Date(otpData.expires_at) : null;

        // Generate new code if none exists or expired
        if (!inviteCode || !expiresAt || expiresAt < now) {
          inviteCode = generateOtpCode();
          const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

          await supabase
            .from('otp_codes')
            .insert({
              email: normalizedEmail,
              code: inviteCode,
              expires_at: newExpiresAt.toISOString(),
            });

          console.log('Generated new OTP code for:', normalizedEmail);
        }

        const joinUrl = `${APP_URL}/join?code=${inviteCode}&email=${encodeURIComponent(normalizedEmail)}`;
        const fullName = member.fullName || normalizedEmail.split('@')[0];
        const position = member.position || 'Team Member';
        const department = member.department || 'General';

        // Build email HTML
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to GlobalyOS</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 32px 24px; text-align: center; }
            .header img { width: 56px; height: 56px; border-radius: 14px; margin-bottom: 12px; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
            .content { padding: 28px 24px; }
            .content p { color: #374151; line-height: 1.6; margin: 0 0 16px; font-size: 15px; }
            .details { background: #f9fafb; border-radius: 10px; padding: 16px; margin: 20px 0; }
            .details p { margin: 6px 0; font-size: 14px; color: #4b5563; }
            .code-box { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; font-size: 28px; letter-spacing: 6px; padding: 16px 24px; border-radius: 10px; text-align: center; font-weight: 700; margin: 20px 0; }
            .cta { text-align: center; margin: 24px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; }
            .note { background: #fef3c7; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; margin: 20px 0; }
            .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${GLOBALYOS_LOGO_URL}" alt="GlobalyOS" style="width: 56px; height: 56px; border-radius: 14px; margin-bottom: 12px;" />
              <h1>Welcome to GlobalyOS!</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${fullName}</strong>,</p>
              <p>You've been added to <strong>${orgName}</strong> on GlobalyOS! Your account is now active. Here are your details:</p>
              <div class="details">
                <p><strong>Position:</strong> ${position}</p>
                <p><strong>Department:</strong> ${department}</p>
              </div>
              <p style="text-align: center; font-weight: 600;">Your Login Code:</p>
              <div class="code-box">${inviteCode}</div>
              <p>Click the button below and enter this code to log in:</p>
              <div class="cta">
                <a href="${joinUrl}" class="button">Log In to GlobalyOS</a>
              </div>
              <div class="note">
                <strong>Note:</strong> This code is valid for 7 days. After first login, you can request a new code anytime.
              </div>
            </div>
            <div class="footer">
              <p>If you have any questions, please contact your administrator.</p>
            </div>
          </div>
        </body>
        </html>
        `;

        // Send email via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'GlobalyOS <hello@globalyos.com>',
            to: [normalizedEmail],
            subject: `Welcome to ${orgName} on GlobalyOS - Your Account is Ready!`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const emailError = await emailResponse.text();
          console.error('Error sending email to:', normalizedEmail, emailError);
          results.failed.push(normalizedEmail);
        } else {
          console.log('Invitation email sent to:', normalizedEmail);
          results.sent.push(normalizedEmail);
        }
      } catch (err) {
        console.error('Error processing invitation for:', normalizedEmail, err);
        results.failed.push(normalizedEmail);
      }
    }

    console.log(`Completed: ${results.sent.length} sent, ${results.failed.length} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.sent.length,
        failed: results.failed.length,
        details: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-pending-invitations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
