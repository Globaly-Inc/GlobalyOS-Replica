import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-token',
};

async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateAgentSession(supabase: any, token: string) {
  if (!token) return null;
  const tokenHash = await hashValue(token);
  const { data: session } = await supabase
    .from('partner_user_sessions')
    .select('*, partner_users(*, crm_partners(id, name, type, organization_id))')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();
  return session;
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

  const agentToken = req.headers.get('x-agent-token') || '';
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // All actions require auth
  const session = await validateAgentSession(supabase, agentToken);
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const agentUser = session.partner_users;
  const partner = agentUser?.crm_partners;
  const orgId = partner?.organization_id;
  const partnerId = partner?.id;
  const agentUserId = agentUser?.id;

  if (!orgId || !partnerId || !agentUserId) {
    return jsonResponse({ error: 'Invalid session data' }, 403);
  }

  try {
    switch (action) {
      case 'dashboard': {
        // Get counts for agent dashboard
        const [appsResult, customersResult] = await Promise.all([
          supabase
            .from('service_applications')
            .select('status', { count: 'exact' })
            .eq('organization_id', orgId)
            .eq('agent_user_id', agentUserId),
          supabase
            .from('partner_customers')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('partner_user_id', agentUserId),
        ]);

        const apps = appsResult.data || [];
        const statusCounts: Record<string, number> = {};
        apps.forEach((a: any) => {
          statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        });

        return jsonResponse({
          applications: { total: apps.length, by_status: statusCounts },
          customers: { total: customersResult.count || 0 },
        });
      }

      case 'list-services': {
        const { data: services } = await supabase
          .from('crm_services')
          .select('id, name, category, short_description, service_type, tags, sla_target_days')
          .eq('organization_id', orgId)
          .eq('status', 'published')
          .in('visibility', ['agent_portal', 'both_portals']);

        return jsonResponse({ services: services || [] });
      }

      case 'get-service': {
        const serviceId = url.searchParams.get('serviceId');
        if (!serviceId) return jsonResponse({ error: 'serviceId required' }, 400);

        const { data: service } = await supabase
          .from('crm_services')
          .select('*')
          .eq('id', serviceId)
          .eq('organization_id', orgId)
          .eq('status', 'published')
          .in('visibility', ['agent_portal', 'both_portals'])
          .single();

        if (!service) return jsonResponse({ error: 'Service not found' }, 404);
        return jsonResponse({ service });
      }

      case 'list-customers': {
        const { data: customers } = await supabase
          .from('partner_customers')
          .select('*')
          .eq('organization_id', orgId)
          .eq('partner_user_id', agentUserId)
          .order('created_at', { ascending: false });

        return jsonResponse({ customers: customers || [] });
      }

      case 'create-customer': {
        const body = await req.json();
        const { first_name, last_name, email, phone, date_of_birth, nationality, country_of_residency, notes } = body;

        if (!first_name || !last_name || !email) {
          return jsonResponse({ error: 'first_name, last_name, and email are required' }, 400);
        }

        const { data: customer, error } = await supabase
          .from('partner_customers')
          .insert({
            organization_id: orgId,
            partner_id: partnerId,
            partner_user_id: agentUserId,
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone?.trim() || null,
            date_of_birth: date_of_birth || null,
            nationality: nationality?.trim() || null,
            country_of_residency: country_of_residency?.trim() || null,
            notes: notes?.trim() || null,
          })
          .select()
          .single();

        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ customer }, 201);
      }

      case 'update-customer': {
        const customerId = url.searchParams.get('customerId');
        if (!customerId) return jsonResponse({ error: 'customerId required' }, 400);

        const body = await req.json();
        const { data: customer, error } = await supabase
          .from('partner_customers')
          .update({
            ...body,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerId)
          .eq('organization_id', orgId)
          .eq('partner_user_id', agentUserId)
          .select()
          .single();

        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ customer });
      }

      case 'list-applications': {
        const { data: applications } = await supabase
          .from('service_applications')
          .select('*, crm_services(name, category), partner_customers(first_name, last_name, email)')
          .eq('organization_id', orgId)
          .eq('agent_user_id', agentUserId)
          .order('created_at', { ascending: false });

        return jsonResponse({ applications: applications || [] });
      }

      case 'get-application': {
        const applicationId = url.searchParams.get('applicationId');
        if (!applicationId) return jsonResponse({ error: 'applicationId required' }, 400);

        const [appResult, historyResult, docsResult, messagesResult] = await Promise.all([
          supabase
            .from('service_applications')
            .select('*, crm_services(name, category), partner_customers(first_name, last_name, email)')
            .eq('id', applicationId)
            .eq('organization_id', orgId)
            .eq('agent_user_id', agentUserId)
            .single(),
          supabase
            .from('service_application_status_history')
            .select('*')
            .eq('application_id', applicationId)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: true }),
          supabase
            .from('service_application_documents')
            .select('*')
            .eq('application_id', applicationId)
            .eq('organization_id', orgId),
          supabase
            .from('service_application_messages')
            .select('*')
            .eq('application_id', applicationId)
            .eq('organization_id', orgId)
            .eq('is_internal_note', false)
            .order('created_at', { ascending: true }),
        ]);

        if (!appResult.data) return jsonResponse({ error: 'Application not found' }, 404);

        return jsonResponse({
          application: appResult.data,
          status_history: historyResult.data || [],
          documents: docsResult.data || [],
          messages: messagesResult.data || [],
        });
      }

      case 'apply-service': {
        const body = await req.json();
        const { service_id, customer_id, form_responses } = body;

        if (!service_id || !customer_id) {
          return jsonResponse({ error: 'service_id and customer_id are required' }, 400);
        }

        // Verify customer belongs to this agent
        const { data: customer } = await supabase
          .from('partner_customers')
          .select('id')
          .eq('id', customer_id)
          .eq('organization_id', orgId)
          .eq('partner_user_id', agentUserId)
          .single();

        if (!customer) return jsonResponse({ error: 'Customer not found' }, 404);

        // Verify service is available
        const { data: service } = await supabase
          .from('crm_services')
          .select('id')
          .eq('id', service_id)
          .eq('organization_id', orgId)
          .eq('status', 'published')
          .in('visibility', ['agent_portal', 'both_portals'])
          .single();

        if (!service) return jsonResponse({ error: 'Service not available' }, 404);

        const { data: application, error } = await supabase
          .from('service_applications')
          .insert({
            organization_id: orgId,
            service_id,
            created_by_type: 'agent',
            partner_customer_id: customer_id,
            agent_partner_id: partnerId,
            agent_user_id: agentUserId,
            status: 'submitted',
            form_responses: form_responses || {},
            submitted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) return jsonResponse({ error: error.message }, 400);

        // Create status history entry
        await supabase.from('service_application_status_history').insert({
          application_id: application.id,
          organization_id: orgId,
          new_status: 'submitted',
          changed_by: agentUserId,
          notes: 'Application submitted by agent',
        });

        return jsonResponse({ application }, 201);
      }

      case 'send-message': {
        const body = await req.json();
        const { application_id, content } = body;

        if (!application_id || !content?.trim()) {
          return jsonResponse({ error: 'application_id and content are required' }, 400);
        }

        // Verify application belongs to this agent
        const { data: app } = await supabase
          .from('service_applications')
          .select('id')
          .eq('id', application_id)
          .eq('organization_id', orgId)
          .eq('agent_user_id', agentUserId)
          .single();

        if (!app) return jsonResponse({ error: 'Application not found' }, 404);

        const { data: message, error } = await supabase
          .from('service_application_messages')
          .insert({
            application_id,
            organization_id: orgId,
            sender_type: 'agent',
            sender_id: agentUserId,
            content: content.trim(),
            is_internal_note: false,
          })
          .select()
          .single();

        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ message }, 201);
      }

      case 'logout': {
        const tokenHash = await hashValue(agentToken);
        await supabase
          .from('partner_user_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('token_hash', tokenHash);
        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('Agent API error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
