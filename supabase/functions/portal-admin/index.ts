import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Verify staff auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const staffSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await staffSupabase.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { action, organizationId } = body;

    if (!action || !organizationId) {
      return jsonResponse({ error: 'action and organizationId required' }, 400);
    }

    // Verify org membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();
    if (!membership) return jsonResponse({ error: 'Not an org member' }, 403);

    // RBAC: only admin, hr, or owner can perform portal admin actions
    const allowedRoles = ['admin', 'hr', 'owner'];
    if (!allowedRoles.includes(membership.role)) {
      return jsonResponse({ error: 'Insufficient permissions. Admin, HR, or Owner role required.' }, 403);
    }

    switch (action) {
      // ─── Invite Client ───
      case 'invite-client': {
        const { email, fullName, officeId } = body;
        if (!email) return jsonResponse({ error: 'email required' }, 400);

        const normalizedEmail = email.toLowerCase().trim();

        // Check if already exists
        const { data: existing } = await supabase
          .from('client_portal_users')
          .select('id, status')
          .eq('organization_id', organizationId)
          .eq('email', normalizedEmail)
          .maybeSingle();

        let clientUserId: string;
        if (existing) {
          clientUserId = existing.id;
          if (existing.status === 'suspended') {
            await supabase.from('client_portal_users').update({ status: 'invited' }).eq('id', existing.id);
          }
        } else {
          const { data: newClient, error } = await supabase
            .from('client_portal_users')
            .insert({
              organization_id: organizationId,
              email: normalizedEmail,
              full_name: fullName || null,
              primary_office_id: officeId || null,
              status: 'invited',
            })
            .select()
            .single();
          if (error) return jsonResponse({ error: 'Failed to create client' }, 500);
          clientUserId = newClient.id;
        }

        // Get org + portal settings for branding
        const { data: org } = await supabase
          .from('organizations').select('name, slug').eq('id', organizationId).single();
        const { data: settings } = await supabase
          .from('client_portal_settings').select('branding_company_name, branding_logo_url')
          .eq('organization_id', organizationId).single();

        const brandingName = settings?.branding_company_name || org?.name || 'Our Portal';
        const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://globalyos.lovable.app';
        const portalUrl = `${appBaseUrl}/org/${org?.slug}/portal/login`;

        // Send invite email
        await resend.emails.send({
          from: `${brandingName} <hello@globalyos.com>`,
          to: [normalizedEmail],
          subject: `You're invited to the ${brandingName} Client Portal`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:40px;">
              <h2>Welcome to ${brandingName}</h2>
              <p>You've been invited to access your client portal where you can track your cases, exchange messages, and upload documents.</p>
              <p style="margin:24px 0;">
                <a href="${portalUrl}" style="background:#3B82F6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Access Your Portal</a>
              </p>
              <p style="color:#6b7280;font-size:14px;">Use your email address <strong>${normalizedEmail}</strong> to sign in with a one-time code.</p>
            </div>
          `,
        });

        return jsonResponse({ success: true, clientUserId });
      }

      // ─── Create Case ───
      case 'create-case': {
        const { clientUserId: cuid, title, description, officeId, priority } = body;
        if (!cuid || !title) return jsonResponse({ error: 'clientUserId and title required' }, 400);

        const { data: newCase, error } = await supabase
          .from('client_cases')
          .insert({
            organization_id: organizationId,
            office_id: officeId || null,
            client_user_id: cuid,
            title,
            description: description || null,
            priority: priority || 'normal',
            status: 'active',
            created_by: user.id,
          })
          .select()
          .single();

        if (error) return jsonResponse({ error: 'Failed to create case' }, 500);

        // Create initial status history
        await supabase.from('client_case_status_history').insert({
          case_id: newCase.id,
          status: 'active',
          note: 'Case created',
          created_by_type: 'staff',
          created_by_id: user.id,
        });

        // Create default thread
        await supabase.from('client_threads').insert({
          organization_id: organizationId,
          case_id: newCase.id,
          subject: title,
        });

        return jsonResponse({ success: true, case: newCase });
      }

      // ─── Update Case Status ───
      case 'update-case-status': {
        const { caseId, status, note, clientVisible } = body;
        if (!caseId || !status) return jsonResponse({ error: 'caseId and status required' }, 400);

        // Verify case belongs to org
        const { data: caseCheck } = await supabase.from('client_cases')
          .select('id').eq('id', caseId).eq('organization_id', organizationId).single();
        if (!caseCheck) return jsonResponse({ error: 'Case not found in this organization' }, 404);

        await supabase.from('client_cases').update({ status }).eq('id', caseId).eq('organization_id', organizationId);
        await supabase.from('client_case_status_history').insert({
          case_id: caseId,
          status,
          note: note || null,
          client_visible: clientVisible !== false,
          created_by_type: 'staff',
          created_by_id: user.id,
        });

        return jsonResponse({ success: true });
      }

      // ─── Send Staff Message ───
      case 'send-message': {
        const { threadId, message, isInternalNote, attachments } = body;
        if (!threadId || !message) return jsonResponse({ error: 'threadId and message required' }, 400);

        // Get employee ID for sender
        // Verify thread belongs to org
        const { data: threadCheck } = await supabase.from('client_threads')
          .select('id').eq('id', threadId).eq('organization_id', organizationId).single();
        if (!threadCheck) return jsonResponse({ error: 'Thread not found in this organization' }, 404);

        const { data: employee } = await supabase
          .from('employees').select('id').eq('user_id', user.id)
          .eq('organization_id', organizationId).single();

        // Validate message length
        if (message.length > 5000) return jsonResponse({ error: 'Message too long (max 5000 characters)' }, 400);

        await supabase.from('client_messages').insert({
          thread_id: threadId,
          sender_type: 'staff',
          sender_id: employee?.id || user.id,
          message,
          attachments: attachments || [],
          client_visible: !isInternalNote,
          is_internal_note: isInternalNote || false,
        });

        if (!isInternalNote) {
          // Update unread count for client
          const { data: thread } = await supabase.from('client_threads').select('unread_by_client').eq('id', threadId).single();
          await supabase.from('client_threads').update({
            unread_by_client: (thread?.unread_by_client || 0) + 1,
            last_message_at: new Date().toISOString(),
          }).eq('id', threadId);
        }

        return jsonResponse({ success: true });
      }

      // ─── Create Task ───
      case 'create-task': {
        const { caseId, title, description: desc, taskType, dueAt } = body;
        if (!caseId || !title) return jsonResponse({ error: 'caseId and title required' }, 400);

        // Verify case belongs to org
        const { data: taskCaseCheck } = await supabase.from('client_cases')
          .select('id').eq('id', caseId).eq('organization_id', organizationId).single();
        if (!taskCaseCheck) return jsonResponse({ error: 'Case not found in this organization' }, 404);

        const { data: task } = await supabase.from('client_tasks').insert({
          case_id: caseId,
          title,
          description: desc || null,
          task_type: taskType || 'custom',
          due_at: dueAt || null,
          created_by: user.id,
        }).select().single();

        return jsonResponse({ success: true, task });
      }

      // ─── Request Document ───
      case 'request-document': {
        const { caseId, fileName, fileType: docFileType } = body;
        if (!caseId || !fileName) return jsonResponse({ error: 'caseId and fileName required' }, 400);

        const { data: doc } = await supabase.from('client_documents').insert({
          organization_id: organizationId,
          case_id: caseId,
          file_name: fileName,
          document_type: 'requested',
          status: 'pending',
          file_type: docFileType || null,
          uploaded_by_type: 'staff',
          uploaded_by_id: user.id,
        }).select().single();

        return jsonResponse({ success: true, document: doc });
      }

      // ─── Review Document ───
      case 'review-document': {
        const { documentId, status: docStatus, reviewNote } = body;
        if (!documentId || !docStatus) return jsonResponse({ error: 'documentId and status required' }, 400);

        // Verify document belongs to org
        const { data: docCheck } = await supabase.from('client_documents')
          .select('id').eq('id', documentId).eq('organization_id', organizationId).single();
        if (!docCheck) return jsonResponse({ error: 'Document not found in this organization' }, 404);

        await supabase.from('client_documents').update({
          status: docStatus,
          review_note: reviewNote || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        }).eq('id', documentId).eq('organization_id', organizationId);

        return jsonResponse({ success: true });
      }

      // ─── Revoke Client Sessions ───
      case 'revoke-sessions': {
        const { clientUserId: revokeId } = body;
        if (!revokeId) return jsonResponse({ error: 'clientUserId required' }, 400);

        await supabase.from('client_portal_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('client_user_id', revokeId)
          .eq('organization_id', organizationId)
          .is('revoked_at', null);

        return jsonResponse({ success: true });
      }

      // ─── Suspend/Activate Client ───
      case 'update-client-status': {
        const { clientUserId: statusId, status: newStatus } = body;
        if (!statusId || !newStatus) return jsonResponse({ error: 'clientUserId and status required' }, 400);

        await supabase.from('client_portal_users')
          .update({ status: newStatus })
          .eq('id', statusId)
          .eq('organization_id', organizationId);

        if (newStatus === 'suspended') {
          // Also revoke sessions
          await supabase.from('client_portal_sessions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('client_user_id', statusId)
            .eq('organization_id', organizationId)
            .is('revoked_at', null);
        }

        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('Portal admin error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
