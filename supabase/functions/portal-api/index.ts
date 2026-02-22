import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-token',
};

async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validatePortalSession(supabase: any, token: string) {
  if (!token) return null;
  const tokenHash = await hashValue(token);
  const { data: session } = await supabase
    .from('client_portal_sessions')
    .select('*, client_portal_users(*)')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();
  return session;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Extract portal token from header
  const portalToken = req.headers.get('x-portal-token') || '';
  
  // Parse URL to determine action
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // Public actions that don't need auth
  if (action === 'check-portal') {
    const orgSlug = url.searchParams.get('orgSlug');
    if (!orgSlug) {
      return jsonResponse({ error: 'orgSlug required' }, 400);
    }
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', orgSlug)
      .single();
    if (!org) return jsonResponse({ error: 'Organization not found' }, 404);

    const { data: settings } = await supabase
      .from('client_portal_settings')
      .select('is_enabled, branding_logo_url, branding_primary_color, branding_company_name')
      .eq('organization_id', org.id)
      .single();

    return jsonResponse({
      enabled: settings?.is_enabled || false,
      branding: settings ? {
        logo_url: settings.branding_logo_url,
        primary_color: settings.branding_primary_color,
        company_name: settings.branding_company_name || org.name,
      } : { company_name: org.name },
    });
  }

  // All other actions require auth
  const session = await validatePortalSession(supabase, portalToken);
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const clientUser = session.client_portal_users;
  const orgId = session.organization_id;
  const clientUserId = clientUser.id;

  try {
    switch (action) {
      // ─── Dashboard ───
      case 'dashboard': {
        const [casesRes, tasksRes, notifsRes] = await Promise.all([
          supabase.from('client_cases').select('id, title, status, priority, updated_at')
            .eq('organization_id', orgId).eq('client_user_id', clientUserId)
            .neq('status', 'cancelled').order('updated_at', { ascending: false }).limit(20),
          supabase.from('client_tasks').select('id, title, status, due_at, case_id')
            .in('case_id', (await supabase.from('client_cases').select('id').eq('organization_id', orgId).eq('client_user_id', clientUserId)).data?.map((c: any) => c.id) || [])
            .eq('status', 'pending').order('due_at', { ascending: true }).limit(10),
          supabase.from('client_notifications').select('id, type, title, body, link, created_at')
            .eq('client_user_id', clientUserId).is('read_at', null).order('created_at', { ascending: false }).limit(10),
        ]);

        // Get unread message count
        const { data: threads } = await supabase
          .from('client_threads').select('id, unread_by_client')
          .eq('organization_id', orgId)
          .in('case_id', casesRes.data?.map((c: any) => c.id) || []);
        const totalUnread = threads?.reduce((sum: number, t: any) => sum + (t.unread_by_client || 0), 0) || 0;

        return jsonResponse({
          cases: casesRes.data || [],
          pendingTasks: tasksRes.data || [],
          notifications: notifsRes.data || [],
          unreadMessages: totalUnread,
        });
      }

      // ─── Case Detail ───
      case 'case-detail': {
        const caseId = url.searchParams.get('caseId');
        if (!caseId) return jsonResponse({ error: 'caseId required' }, 400);

        // Verify client owns this case
        const { data: caseData } = await supabase
          .from('client_cases').select('*')
          .eq('id', caseId).eq('organization_id', orgId).eq('client_user_id', clientUserId)
          .single();
        if (!caseData) return jsonResponse({ error: 'Case not found' }, 404);

        const [historyRes, milestonesRes, tasksRes, docsRes, threadRes] = await Promise.all([
          supabase.from('client_case_status_history').select('*')
            .eq('case_id', caseId).eq('client_visible', true).order('created_at', { ascending: true }),
          supabase.from('client_case_milestones').select('*')
            .eq('case_id', caseId).order('sort_order', { ascending: true }),
          supabase.from('client_tasks').select('*')
            .eq('case_id', caseId).order('created_at', { ascending: true }),
          supabase.from('client_documents').select('*')
            .eq('case_id', caseId).eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('client_threads').select('*')
            .eq('case_id', caseId).eq('organization_id', orgId).limit(1).maybeSingle(),
        ]);

        return jsonResponse({
          case: caseData,
          statusHistory: historyRes.data || [],
          milestones: milestonesRes.data || [],
          tasks: tasksRes.data || [],
          documents: docsRes.data || [],
          thread: threadRes.data,
        });
      }

      // ─── Messages ───
      case 'messages': {
        const threadId = url.searchParams.get('threadId');
        if (!threadId) return jsonResponse({ error: 'threadId required' }, 400);

        // Verify client has access to this thread
        const { data: thread } = await supabase
          .from('client_threads').select('*, client_cases!inner(client_user_id)')
          .eq('id', threadId).eq('organization_id', orgId)
          .single();
        if (!thread || thread.client_cases?.client_user_id !== clientUserId) {
          return jsonResponse({ error: 'Thread not found' }, 404);
        }

        const { data: messages } = await supabase
          .from('client_messages').select('*')
          .eq('thread_id', threadId).eq('client_visible', true)
          .order('created_at', { ascending: true });

        // Mark as read
        await supabase.from('client_threads').update({ unread_by_client: 0 }).eq('id', threadId);

        return jsonResponse({ messages: messages || [] });
      }

      case 'send-message': {
        if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);
        const body = await req.json();
        const { threadId, message, attachments } = body;
        if (!threadId || !message) return jsonResponse({ error: 'threadId and message required' }, 400);

        // Input validation
        if (typeof message !== 'string' || message.trim().length === 0) {
          return jsonResponse({ error: 'Message cannot be empty' }, 400);
        }
        if (message.length > 5000) {
          return jsonResponse({ error: 'Message too long (max 5000 characters)' }, 400);
        }

        // Verify access
        const { data: thread } = await supabase
          .from('client_threads').select('*, client_cases!inner(client_user_id, organization_id)')
          .eq('id', threadId).single();
        if (!thread || thread.client_cases?.client_user_id !== clientUserId) {
          return jsonResponse({ error: 'Thread not found' }, 404);
        }

        const { data: newMsg, error: msgError } = await supabase
          .from('client_messages').insert({
            thread_id: threadId,
            sender_type: 'client',
            sender_id: clientUserId,
            message,
            attachments: attachments || [],
          }).select().single();

        if (msgError) return jsonResponse({ error: 'Failed to send message' }, 500);

        // Update thread
        await supabase.from('client_threads').update({
          unread_by_staff: (thread.unread_by_staff || 0) + 1,
          last_message_at: new Date().toISOString(),
        }).eq('id', threadId);

        return jsonResponse({ message: newMsg });
      }

      // ─── Tasks ───
      case 'complete-task': {
        if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);
        const { taskId } = await req.json();
        if (!taskId) return jsonResponse({ error: 'taskId required' }, 400);

        // Verify ownership
        const { data: task } = await supabase
          .from('client_tasks').select('*, client_cases!inner(client_user_id, organization_id)')
          .eq('id', taskId).single();
        if (!task || task.client_cases?.client_user_id !== clientUserId) {
          return jsonResponse({ error: 'Task not found' }, 404);
        }

        await supabase.from('client_tasks').update({
          status: 'completed', completed_at: new Date().toISOString(),
        }).eq('id', taskId);

        return jsonResponse({ success: true });
      }

      // ─── Notifications ───
      case 'notifications': {
        const { data: notifs } = await supabase
          .from('client_notifications').select('*')
          .eq('client_user_id', clientUserId)
          .order('created_at', { ascending: false }).limit(50);
        return jsonResponse({ notifications: notifs || [] });
      }

      case 'mark-notification-read': {
        if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);
        const { notificationId } = await req.json();
        if (notificationId) {
          await supabase.from('client_notifications').update({ read_at: new Date().toISOString() })
            .eq('id', notificationId).eq('client_user_id', clientUserId);
        } else {
          // Mark all as read
          await supabase.from('client_notifications').update({ read_at: new Date().toISOString() })
            .eq('client_user_id', clientUserId).is('read_at', null);
        }
        return jsonResponse({ success: true });
      }

      // ─── Profile ───
      case 'profile': {
        return jsonResponse({ user: clientUser });
      }

      case 'update-profile': {
        if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);
        const { full_name, phone } = await req.json();
        const updateData: any = {};

        // Input validation & sanitization
        if (full_name !== undefined) {
          if (typeof full_name !== 'string') return jsonResponse({ error: 'Invalid full_name' }, 400);
          const sanitized = full_name.trim().replace(/<[^>]*>/g, '').slice(0, 200);
          if (sanitized.length === 0) return jsonResponse({ error: 'Name cannot be empty' }, 400);
          updateData.full_name = sanitized;
        }
        if (phone !== undefined) {
          if (typeof phone !== 'string') return jsonResponse({ error: 'Invalid phone' }, 400);
          const sanitizedPhone = phone.trim().replace(/<[^>]*>/g, '').slice(0, 30);
          updateData.phone = sanitizedPhone || null;
        }

        const { data: updated } = await supabase
          .from('client_portal_users').update(updateData)
          .eq('id', clientUserId).select().single();
        return jsonResponse({ user: updated });
      }

      // ─── Upload Document ───
      case 'upload-document': {
        if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);
        const { caseId: uploadCaseId, fileName: uploadFileName, fileType: uploadFileType, fileBase64 } = await req.json();
        if (!uploadCaseId || !uploadFileName || !fileBase64) {
          return jsonResponse({ error: 'caseId, fileName, and fileBase64 required' }, 400);
        }

        // Verify client owns this case
        const { data: uploadCase } = await supabase
          .from('client_cases').select('id')
          .eq('id', uploadCaseId).eq('organization_id', orgId).eq('client_user_id', clientUserId)
          .single();
        if (!uploadCase) return jsonResponse({ error: 'Case not found' }, 404);

        // Decode base64 and upload to storage
        const fileBytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
        const storagePath = `${orgId}/${clientUserId}/${uploadCaseId}/${Date.now()}-${uploadFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('client-portal-documents')
          .upload(storagePath, fileBytes, {
            contentType: uploadFileType || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          return jsonResponse({ error: 'Failed to upload file' }, 500);
        }

        const { data: publicUrlData } = supabase.storage
          .from('client-portal-documents')
          .getPublicUrl(storagePath);

        // Create document record
        const { data: newDoc, error: docError } = await supabase
          .from('client_documents').insert({
            organization_id: orgId,
            case_id: uploadCaseId,
            file_name: uploadFileName.slice(0, 255),
            file_url: publicUrlData.publicUrl,
            file_type: uploadFileType || null,
            document_type: 'uploaded',
            status: 'submitted',
            uploaded_by_type: 'client',
            uploaded_by_id: clientUserId,
          }).select().single();

        if (docError) return jsonResponse({ error: 'Failed to save document record' }, 500);
        return jsonResponse({ document: newDoc });
      }

      // ─── Services Marketplace ───
      case 'list-services': {
        const search = url.searchParams.get('search') || '';
        const category = url.searchParams.get('category') || '';

        let query = supabase
          .from('crm_services')
          .select('id, name, category, short_description, tags, sla_target_days')
          .eq('organization_id', orgId)
          .eq('status', 'published')
          .in('visibility', ['client_portal', 'both_portals'])
          .order('name', { ascending: true });

        if (search) {
          query = query.or(`name.ilike.%${search}%,short_description.ilike.%${search}%,category.ilike.%${search}%`);
        }
        if (category) {
          query = query.eq('category', category);
        }

        const { data: services, error: svcErr } = await query;
        if (svcErr) throw svcErr;
        return jsonResponse({ services: services || [] });
      }

      case 'get-service': {
        const serviceId = url.searchParams.get('serviceId');
        if (!serviceId) return jsonResponse({ error: 'serviceId required' }, 400);

        const { data: svc, error: svcErr } = await supabase
          .from('crm_services')
          .select('id, name, category, short_description, long_description, tags, sla_target_days, required_docs_template, workflow_stages')
          .eq('id', serviceId)
          .eq('organization_id', orgId)
          .eq('status', 'published')
          .in('visibility', ['client_portal', 'both_portals'])
          .single();
        if (svcErr || !svc) return jsonResponse({ error: 'Service not found' }, 404);
        return jsonResponse({ service: svc });
      }

      case 'apply-service': {
        if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);
        const { serviceId: applySvcId, officeId, formResponses } = await req.json();
        if (!applySvcId) return jsonResponse({ error: 'serviceId required' }, 400);

        // Verify service is published & visible to client portal
        const { data: applySvc } = await supabase
          .from('crm_services')
          .select('id')
          .eq('id', applySvcId)
          .eq('organization_id', orgId)
          .eq('status', 'published')
          .in('visibility', ['client_portal', 'both_portals'])
          .single();
        if (!applySvc) return jsonResponse({ error: 'Service not found or not available' }, 404);

        // Find linked CRM contact
        const { data: linkedContact } = await supabase
          .from('crm_contacts')
          .select('id')
          .eq('organization_id', orgId)
          .eq('email', clientUser.email)
          .limit(1)
          .maybeSingle();

        const { data: newApp, error: appErr } = await supabase
          .from('service_applications')
          .insert({
            organization_id: orgId,
            service_id: applySvcId,
            office_id: officeId || null,
            created_by_type: 'client',
            client_portal_user_id: clientUserId,
            crm_contact_id: linkedContact?.id || null,
            status: 'submitted',
            priority: 'medium',
            form_responses: formResponses || null,
            submitted_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (appErr) throw appErr;

        // Create initial status history entry
        await supabase.from('service_application_status_history').insert({
          application_id: newApp.id,
          organization_id: orgId,
          old_status: null,
          new_status: 'submitted',
          is_internal_note: false,
          notes: 'Application submitted via client portal',
        });

        return jsonResponse({ application: newApp });
      }

      case 'list-my-applications': {
        const { data: apps, error: appsErr } = await supabase
          .from('service_applications')
          .select('id, service_id, status, priority, submitted_at, created_at, updated_at, service:crm_services(id, name, category)')
          .eq('organization_id', orgId)
          .eq('client_portal_user_id', clientUserId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (appsErr) throw appsErr;
        return jsonResponse({ applications: apps || [] });
      }

      case 'get-application': {
        const appId = url.searchParams.get('applicationId');
        if (!appId) return jsonResponse({ error: 'applicationId required' }, 400);

        const { data: app } = await supabase
          .from('service_applications')
          .select('*, service:crm_services(id, name, category, short_description, workflow_stages)')
          .eq('id', appId)
          .eq('organization_id', orgId)
          .eq('client_portal_user_id', clientUserId)
          .single();
        if (!app) return jsonResponse({ error: 'Application not found' }, 404);

        const [historyRes, docsRes] = await Promise.all([
          supabase.from('service_application_status_history')
            .select('*')
            .eq('application_id', appId)
            .eq('is_internal_note', false)
            .order('created_at', { ascending: true }),
          supabase.from('service_application_documents')
            .select('*')
            .eq('application_id', appId)
            .order('created_at', { ascending: false }),
        ]);

        return jsonResponse({
          application: app,
          statusHistory: historyRes.data || [],
          documents: docsRes.data || [],
        });
      }

      // ─── Logout ───
      case 'logout': {
        await supabase.from('client_portal_sessions').update({ revoked_at: new Date().toISOString() })
          .eq('id', session.id);
        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('Portal API error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
