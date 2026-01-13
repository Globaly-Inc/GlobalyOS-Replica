import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ErrorNotificationPayload {
  error_log_id: string;
  severity: string;
  error_message: string;
  error_type: string;
  user_id: string | null;
  organization_id: string | null;
  page_url: string;
  error_stack: string | null;
  component_name?: string | null;
  action_attempted?: string | null;
  console_logs?: any[] | null;
  network_requests?: any[] | null;
  breadcrumbs?: any[] | null;
  browser_info?: string | null;
  device_type?: string | null;
}

function formatConsoleLogs(logs: any[] | null): string {
  if (!logs || logs.length === 0) return 'No console logs captured.';
  
  return logs.slice(-10).map(entry => 
    `[${entry.level?.toUpperCase() || 'LOG'}] ${entry.message || ''}`
  ).join('\n');
}

function formatNetworkRequests(requests: any[] | null): string {
  if (!requests || requests.length === 0) return 'No network requests captured.';
  
  const failed = requests.filter(r => !r.success);
  if (failed.length === 0) return 'All network requests succeeded.';
  
  return failed.slice(-5).map(req => 
    `${req.method} ${req.url} - Status: ${req.status || 'Failed'}${req.error ? ` (${req.error})` : ''}`
  ).join('\n');
}

function formatBreadcrumbs(crumbs: any[] | null): string {
  if (!crumbs || crumbs.length === 0) return 'No user actions captured.';
  
  return crumbs.slice(-10).map(crumb => 
    `[${crumb.type?.toUpperCase() || 'ACTION'}] ${crumb.message || crumb.path || crumb.target || 'Action'}`
  ).join('\n');
}

function generateAIResolutionPrompt(payload: ErrorNotificationPayload, userName: string, orgName: string): string {
  const consoleLogs = Array.isArray(payload.console_logs) ? payload.console_logs : [];
  const networkRequests = Array.isArray(payload.network_requests) ? payload.network_requests : [];
  const breadcrumbs = Array.isArray(payload.breadcrumbs) ? payload.breadcrumbs : [];
  const failedRequests = networkRequests.filter(r => !r.success);

  return `## Error Analysis Request

You are an expert software engineer debugging a production error in GlobalyOS (React/TypeScript SaaS).

### Error Details
- **Error Type:** ${payload.error_type}
- **Severity:** ${payload.severity.toUpperCase()}
- **Error Message:** ${payload.error_message}
- **Component:** ${payload.component_name || 'Unknown'}
- **User Action:** ${payload.action_attempted || 'Unknown'}
- **Page URL:** ${payload.page_url}

### Stack Trace
\`\`\`
${payload.error_stack || 'No stack trace available.'}
\`\`\`

### Console Logs (last entries)
\`\`\`
${formatConsoleLogs(consoleLogs)}
\`\`\`

### Failed Network Requests
\`\`\`
${failedRequests.length > 0 ? formatNetworkRequests(failedRequests) : 'No failed requests.'}
\`\`\`

### User Action Trail
\`\`\`
${formatBreadcrumbs(breadcrumbs)}
\`\`\`

### Context
- **User:** ${userName}
- **Organization:** ${orgName}
- **Browser:** ${payload.browser_info || 'Unknown'}
- **Device:** ${payload.device_type || 'Unknown'}

---

Please provide:
1. **Root Cause Analysis** - Most likely cause and supporting evidence
2. **Recommended Fix** - Specific code changes needed
3. **Prevention** - How to prevent this in the future
4. **Priority** - P0-P3 rating with justification`;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email notification');
      return new Response(JSON.stringify({ success: false, reason: 'Email not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: ErrorNotificationPayload = await req.json();

    console.log('Received error notification:', payload);

    // Check throttle - max 10 notifications per hour per error type per org
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: throttleRecord } = await supabase
      .from('error_notification_throttle')
      .select('*')
      .eq('error_type', payload.error_type)
      .eq('organization_id', payload.organization_id)
      .gte('last_notified_at', oneHourAgo)
      .maybeSingle();

    if (throttleRecord && throttleRecord.notification_count >= 10) {
      console.log('Throttle limit reached, skipping notification');
      
      // Update counter
      await supabase
        .from('error_notification_throttle')
        .update({ notification_count: throttleRecord.notification_count + 1 })
        .eq('id', throttleRecord.id);
      
      return new Response(JSON.stringify({ success: false, reason: 'Throttled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get super admin emails
    const { data: superAdmins, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (adminError || !superAdmins?.length) {
      console.log('No super admins found or error:', adminError);
      return new Response(JSON.stringify({ success: false, reason: 'No super admins' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get admin emails from auth.users
    const adminEmails: string[] = [];
    for (const admin of superAdmins) {
      const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log('No admin emails found');
      return new Response(JSON.stringify({ success: false, reason: 'No admin emails' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user info if available
    let userName = 'Anonymous';
    let userEmail = 'N/A';
    if (payload.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', payload.user_id)
        .maybeSingle();
      
      if (profile) {
        userName = profile.full_name || 'Unknown User';
        userEmail = profile.email || 'N/A';
      }
    }

    // Get organization name if available
    let orgName = 'N/A';
    if (payload.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', payload.organization_id)
        .maybeSingle();
      
      if (org) {
        orgName = org.name;
      }
    }

    // Generate AI resolution prompt
    const aiResolutionPrompt = generateAIResolutionPrompt(payload, userName, orgName);

    // Format timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Build email HTML
    const severityColor = payload.severity === 'critical' ? '#dc2626' : '#f59e0b';
    const severityBg = payload.severity === 'critical' ? '#fef2f2' : '#fffbeb';
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error Alert - GlobalyOS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${severityColor}; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${payload.severity.toUpperCase()} ERROR</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <!-- Error Message -->
              <div style="background-color: ${severityBg}; border-left: 4px solid ${severityColor}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; font-size: 16px; color: #1f2937; font-weight: 500;">${escapeHtml(payload.error_message)}</p>
              </div>
              
              <!-- Details Table -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Error Type:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <span style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${payload.error_type}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Component:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    ${payload.component_name || 'Unknown'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Action:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    ${payload.action_attempted || 'Unknown'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">User:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    ${userName} (${userEmail})
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Organization:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    ${orgName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6b7280;">Page URL:</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; word-break: break-all;">
                    <a href="${payload.page_url}" style="color: #2563eb; text-decoration: none;">${payload.page_url}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #6b7280;">Time:</strong>
                  </td>
                  <td style="padding: 8px 0; text-align: right;">
                    ${timestamp}
                  </td>
                </tr>
              </table>
              
              ${payload.error_stack ? `
              <!-- Stack Trace -->
              <div style="margin-bottom: 20px;">
                <p style="font-weight: 600; color: #374151; margin-bottom: 8px;">Stack Trace:</p>
                <pre style="background-color: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; max-height: 200px;">${escapeHtml(payload.error_stack)}</pre>
              </div>
              ` : ''}
              
              <!-- AI Resolution Prompt -->
              <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #f3e8ff; padding: 12px 15px; border-bottom: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-weight: 600; color: #7c3aed; font-size: 14px;">🤖 AI Resolution Prompt</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Copy this prompt to get AI-powered analysis</p>
                </div>
                <pre style="background-color: #faf5ff; color: #374151; padding: 15px; margin: 0; overflow-x: auto; font-size: 11px; white-space: pre-wrap; max-height: 300px; line-height: 1.5;">${escapeHtml(aiResolutionPrompt)}</pre>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin-top: 20px;">
                <a href="https://preview--gos-office-hub.lovable.app/super-admin/error-logs/${payload.error_log_id}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Error Details</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">GlobalyOS Error Monitoring</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GlobalyOS <alerts@globalyos.com>',
        to: adminEmails,
        subject: `[${payload.severity.toUpperCase()}] ${payload.error_type} Error in GlobalyOS${orgName !== 'N/A' ? ` - ${orgName}` : ''}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    // Update throttle record
    if (throttleRecord) {
      await supabase
        .from('error_notification_throttle')
        .update({ 
          notification_count: throttleRecord.notification_count + 1,
          last_notified_at: new Date().toISOString(),
        })
        .eq('id', throttleRecord.id);
    } else {
      await supabase
        .from('error_notification_throttle')
        .insert({
          error_type: payload.error_type,
          organization_id: payload.organization_id,
          notification_count: 1,
        });
    }

    console.log('Email notification sent successfully to:', adminEmails);

    return new Response(JSON.stringify({ success: true, sentTo: adminEmails.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in notify-critical-error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
