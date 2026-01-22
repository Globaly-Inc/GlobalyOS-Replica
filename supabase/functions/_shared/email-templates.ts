// Shared email templates for invite functions
const GLOBALYOS_LOGO_URL = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';

interface InviteEmailParams {
  fullName: string;
  inviterName: string;
  inviterEmail: string;
  businessName: string;
  position: string;
  department: string;
  officeName?: string;
  officeAddress?: string;
  joinDate: string | null;
  inviteCode: string;
  joinUrl: string;
  isReminder?: boolean;
}

export function generateInviteEmailHtml(params: InviteEmailParams): string {
  const {
    fullName,
    inviterName,
    inviterEmail,
    businessName,
    position,
    department,
    officeName,
    officeAddress,
    joinDate,
    inviteCode,
    joinUrl,
    isReminder = false
  } = params;

  const formattedDate = joinDate 
    ? new Date(joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
    : 'TBC';

  const title = isReminder ? 'Reminder' : "You're Invited";
  const subtitle = isReminder ? 'Complete your registration' : `Join ${businessName} on GlobalyOS`;
  const message = isReminder 
    ? `${inviterName} is waiting for you to join <strong>${businessName}</strong>.`
    : `${inviterName} has invited you to join <strong>${businessName}</strong>.`;
  const codeLabel = isReminder ? 'New Login Code' : 'Your Login Code';
  const footerNote = isReminder ? 'Previous code deactivated • New code valid for 7 days' : 'Code valid for 7 days';

  // Build office details row if available
  const officeRow = officeName ? `<tr><td style="color: #64748b; padding: 4px 0;">Office</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${officeName}</td></tr>` : '';
  const locationRow = officeAddress ? `<tr><td style="color: #64748b; padding: 4px 0;">Location</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${officeAddress}</td></tr>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
<div style="background-color: #f8fafc; padding: 24px 16px;">
<div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
<div style="background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); padding: 24px; text-align: center;">
<img src="${GLOBALYOS_LOGO_URL}" alt="GlobalyOS" style="width: 56px; height: 56px; border-radius: 12px; margin: 0 auto 12px auto; display: block;" />
<h1 style="color: #ffffff; margin: 0 0 4px 0; font-size: 20px; font-weight: 600;">${title}</h1>
<p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">${subtitle}</p>
</div>
<div style="padding: 24px;">
<p style="margin: 0 0 16px 0; font-size: 15px;">Hi <strong>${fullName}</strong>,</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">${message}</p>
<div style="background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px;">
${officeRow}
${locationRow}
<tr><td style="color: #64748b; padding: 4px 0;">Position</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${position}</td></tr>
<tr><td style="color: #64748b; padding: 4px 0;">Department</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${department}</td></tr>
<tr><td style="color: #64748b; padding: 4px 0;">Start Date</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${formattedDate}</td></tr>
</table>
</div>
<div style="text-align: center; margin: 24px 0;">
<p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">${codeLabel}</p>
<div style="background: #f0f4ff; color: #4f46e5; font-size: 28px; font-weight: 700; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px; display: inline-block;">${inviteCode}</div>
</div>
<div style="text-align: center; margin: 20px 0;">
<a href="${joinUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Join Team</a>
</div>
<p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 16px 0 0 0;">${footerNote}</p>
</div>
<div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
<p style="margin: 0; color: #64748b; font-size: 12px;">Questions? Contact <a href="mailto:${inviterEmail || 'support@globalyos.com'}" style="color: #3b82f6; text-decoration: none;">${inviterEmail || 'support'}</a></p>
</div>
</div>
</div>
</body>
</html>`;
}
