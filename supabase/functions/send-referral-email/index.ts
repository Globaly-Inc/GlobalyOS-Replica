import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      organization_id,
      job_id,
      job_title,
      referrer_employee_id,
      referrer_name,
      candidate_email,
      public_link,
    } = await req.json();

    // Validate required fields
    if (!organization_id || !job_id || !referrer_employee_id || !candidate_email || !public_link) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidate_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get org info
    const { data: org } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', organization_id)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify job is open and public
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, status, is_public_visible')
      .eq('id', job_id)
      .eq('organization_id', organization_id)
      .single();

    if (!job || job.status !== 'open' || !job.is_public_visible) {
      return new Response(
        JSON.stringify({ error: 'This position is not available for referrals' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeReferrerName = (referrer_name || 'A team member').slice(0, 200);
    const safeJobTitle = job_title || job.title || 'an open position';
    const companyName = org.name || 'GlobalyOS';

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${companyName}</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hi there,</p>
            <p><strong>${safeReferrerName}</strong> at <strong>${companyName}</strong> thinks you'd be a great fit for the <strong>${safeJobTitle}</strong> position!</p>
            <p>They've referred you to apply — check out the role and submit your application below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${public_link}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Position &amp; Apply
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">If you have any questions, feel free to reach out to ${safeReferrerName} directly.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p>Sent via ${companyName} Hiring</p>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${companyName} <hello@globalyos.com>`,
        to: [candidate_email],
        subject: `${safeReferrerName} referred you for a role at ${companyName}`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('Resend error:', errBody);
      throw new Error('Failed to send email');
    }

    // Create candidate record with referral source
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('email', candidate_email)
      .maybeSingle();

    if (!existingCandidate) {
      await supabase.from('candidates').insert({
        organization_id,
        email: candidate_email,
        name: candidate_email.split('@')[0],
        source: 'referral',
        referred_by_employee_id: referrer_employee_id,
      });
    }

    // Log activity
    await supabase.from('hiring_activity_logs').insert({
      organization_id,
      entity_type: 'referral',
      entity_id: job_id,
      action: 'referral_sent',
      actor_id: null,
      details: {
        referrer_employee_id,
        referrer_name: safeReferrerName,
        candidate_email,
        job_title: safeJobTitle,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Referral email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending referral:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send referral. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
