// Shared email templates for onboarding lifecycle emails
const GLOBALYOS_LOGO_URL = 'https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/system-assets//GlobalyOS%20Blue%20BG%20Icon.png';

interface OnboardingCompleteEmailParams {
  fullName: string;
  orgName: string;
  profileUrl: string;
  homeUrl: string;
}

interface TeamMemberCompletedEmailParams {
  memberName: string;
  position: string;
  department: string;
  officeName?: string;
  completedAt: string;
  profileUrl: string;
  recipientName: string;
  orgName: string;
}

interface OnboardingReminderEmailParams {
  fullName: string;
  orgName: string;
  inviterName: string;
  inviterEmail: string;
  position: string;
  department: string;
  inviteCode: string;
  joinUrl: string;
}

export function generateOnboardingCompleteEmailHtml(params: OnboardingCompleteEmailParams): string {
  const { fullName, orgName, profileUrl, homeUrl } = params;
  const firstName = fullName.split(' ')[0];
  const currentYear = new Date().getFullYear();

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
<h1 style="color: #ffffff; margin: 0 0 4px 0; font-size: 22px; font-weight: 600;">You're All Set! 🎉</h1>
<p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Welcome aboard, ${firstName}</p>
</div>
<div style="padding: 24px;">
<p style="margin: 0 0 16px 0; font-size: 15px;">Hi <strong>${firstName}</strong>,</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">Congratulations! Your onboarding with <strong>${orgName}</strong> is now complete. You're ready to start using GlobalyOS.</p>

<div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
<p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #0369a1;">Here's what you can do next:</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px;">
<tr><td style="padding: 6px 0;"><span style="color: #22c55e; margin-right: 8px;">✓</span><span style="color: #1e293b;">View and update your profile</span></td></tr>
<tr><td style="padding: 6px 0;"><span style="color: #22c55e; margin-right: 8px;">✓</span><span style="color: #1e293b;">Check in when you start work</span></td></tr>
<tr><td style="padding: 6px 0;"><span style="color: #22c55e; margin-right: 8px;">✓</span><span style="color: #1e293b;">Request leave when needed</span></td></tr>
<tr><td style="padding: 6px 0;"><span style="color: #22c55e; margin-right: 8px;">✓</span><span style="color: #1e293b;">Connect with your team</span></td></tr>
</table>
</div>

<div style="text-align: center; margin: 24px 0;">
<a href="${homeUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to GlobalyOS</a>
</div>

<p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 16px 0 0 0;">Need to update your profile? <a href="${profileUrl}" style="color: #3b82f6; text-decoration: none;">Click here</a></p>
</div>
<div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
<p style="margin: 0; color: #64748b; font-size: 12px;">Questions? Contact <a href="mailto:support@globalyos.com" style="color: #3b82f6; text-decoration: none;">support@globalyos.com</a></p>
<p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">© ${currentYear} GlobalyOS. All rights reserved.</p>
</div>
</div>
</div>
</body>
</html>`;
}

export function generateTeamMemberCompletedEmailHtml(params: TeamMemberCompletedEmailParams): string {
  const { memberName, position, department, officeName, completedAt, profileUrl, recipientName, orgName } = params;
  const currentYear = new Date().getFullYear();
  const formattedDate = new Date(completedAt).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const officeRow = officeName ? `<tr><td style="color: #64748b; padding: 4px 0;">Office</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${officeName}</td></tr>` : '';

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
<h1 style="color: #ffffff; margin: 0 0 4px 0; font-size: 20px; font-weight: 600;">Onboarding Complete</h1>
<p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">${memberName} is ready to go!</p>
</div>
<div style="padding: 24px;">
<p style="margin: 0 0 16px 0; font-size: 15px;">Hi <strong>${recipientName}</strong>,</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;"><strong>${memberName}</strong> has completed their onboarding with <strong>${orgName}</strong>.</p>

<div style="background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px;">
<tr><td style="color: #64748b; padding: 4px 0;">Name</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${memberName}</td></tr>
<tr><td style="color: #64748b; padding: 4px 0;">Position</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${position}</td></tr>
<tr><td style="color: #64748b; padding: 4px 0;">Department</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${department}</td></tr>
${officeRow}
<tr><td style="color: #64748b; padding: 4px 0;">Completed</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${formattedDate}</td></tr>
</table>
</div>

<div style="text-align: center; margin: 24px 0;">
<a href="${profileUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Profile</a>
</div>
</div>
<div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
<p style="margin: 0; color: #64748b; font-size: 12px;">Questions? Contact <a href="mailto:support@globalyos.com" style="color: #3b82f6; text-decoration: none;">support@globalyos.com</a></p>
<p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">© ${currentYear} GlobalyOS. All rights reserved.</p>
</div>
</div>
</div>
</body>
</html>`;
}

export function generateOnboardingReminderEmailHtml(params: OnboardingReminderEmailParams): string {
  const { fullName, orgName, inviterName, inviterEmail, position, department, inviteCode, joinUrl } = params;
  const firstName = fullName.split(' ')[0];
  const currentYear = new Date().getFullYear();

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
<h1 style="color: #ffffff; margin: 0 0 4px 0; font-size: 20px; font-weight: 600;">Reminder</h1>
<p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Complete your ${orgName} setup</p>
</div>
<div style="padding: 24px;">
<p style="margin: 0 0 16px 0; font-size: 15px;">Hi <strong>${firstName}</strong>,</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">${inviterName} is waiting for you to join <strong>${orgName}</strong>. Complete your onboarding to get started!</p>

<div style="background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px;">
<tr><td style="color: #64748b; padding: 4px 0;">Position</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${position}</td></tr>
<tr><td style="color: #64748b; padding: 4px 0;">Department</td><td style="color: #1e293b; font-weight: 500; text-align: right; padding: 4px 0;">${department}</td></tr>
</table>
</div>

<div style="text-align: center; margin: 24px 0;">
<p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">New Login Code</p>
<div style="background: #f0f4ff; color: #4f46e5; font-size: 28px; font-weight: 700; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px; display: inline-block;">${inviteCode}</div>
</div>

<div style="text-align: center; margin: 20px 0;">
<a href="${joinUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Join Team</a>
</div>

<p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 16px 0 0 0;">Previous code deactivated • New code valid for 7 days</p>
</div>
<div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
<p style="margin: 0; color: #64748b; font-size: 12px;">Questions? Contact <a href="mailto:${inviterEmail || 'support@globalyos.com'}" style="color: #3b82f6; text-decoration: none;">${inviterEmail || 'support'}</a></p>
<p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">© ${currentYear} GlobalyOS. All rights reserved.</p>
</div>
</div>
</div>
</body>
</html>`;
}
