import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Validate auth - this is for internal staff only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { application_id, organization_id } = await req.json();

    if (!application_id || !organization_id) {
      return new Response(JSON.stringify({ error: 'application_id and organization_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch application with all related data
    const [appResult, historyResult, docsResult, messagesResult] = await Promise.all([
      supabase
        .from('service_applications')
        .select(`
          *,
          crm_services(name, category, short_description, eligibility_notes, sla_target_days),
          partner_customers(first_name, last_name, email, nationality, country_of_residency),
          crm_contacts(first_name, last_name, email),
          client_portal_users(full_name, email)
        `)
        .eq('id', application_id)
        .eq('organization_id', organization_id)
        .single(),
      supabase
        .from('service_application_status_history')
        .select('*')
        .eq('application_id', application_id)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: true }),
      supabase
        .from('service_application_documents')
        .select('document_type, file_name, status, review_notes')
        .eq('application_id', application_id)
        .eq('organization_id', organization_id),
      supabase
        .from('service_application_messages')
        .select('sender_type, content, created_at')
        .eq('application_id', application_id)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: true })
        .limit(20),
    ]);

    if (!appResult.data) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const app = appResult.data;
    const history = historyResult.data || [];
    const docs = docsResult.data || [];
    const messages = messagesResult.data || [];

    // Build applicant info
    let applicantInfo = 'Unknown applicant';
    if (app.partner_customers) {
      const c = app.partner_customers;
      applicantInfo = `${c.first_name} ${c.last_name} (${c.email}), Nationality: ${c.nationality || 'N/A'}, Country: ${c.country_of_residency || 'N/A'}`;
    } else if (app.crm_contacts) {
      const c = app.crm_contacts;
      applicantInfo = `${c.first_name} ${c.last_name} (${c.email})`;
    } else if (app.client_portal_users) {
      applicantInfo = `${app.client_portal_users.full_name} (${app.client_portal_users.email})`;
    }

    const service = app.crm_services;
    const docsContext = docs.map(d => `- ${d.document_type || d.file_name}: ${d.status}`).join('\n') || 'No documents uploaded';
    const historyContext = history.map(h => `- ${h.new_status} (${new Date(h.created_at).toLocaleDateString()}): ${h.notes || ''}`).join('\n') || 'No status changes';
    const messagesContext = messages.slice(-10).map(m => `[${m.sender_type}]: ${m.content.substring(0, 200)}`).join('\n') || 'No messages';

    const prompt = `You are a staff assistant reviewing a service application. Generate a structured summary for internal review.

Application Details:
- Service: ${service?.name || 'Unknown'} (${service?.category || 'N/A'})
- Service Description: ${service?.short_description || 'N/A'}
- Status: ${app.status}
- Priority: ${app.priority || 'medium'}
- Created By: ${app.created_by_type}
- Submitted: ${app.submitted_at || 'Not yet submitted'}
- SLA Target: ${service?.sla_target_days || 'N/A'} days

Applicant:
${applicantInfo}

Documents:
${docsContext}

Status History:
${historyContext}

Recent Messages:
${messagesContext}

Form Responses:
${app.form_responses ? JSON.stringify(app.form_responses).substring(0, 1000) : 'None'}

Generate a JSON response with:
{
  "summary": "2-3 sentence overview of the application",
  "applicant_background": "Brief applicant profile summary",
  "document_status": "Assessment of document completeness",
  "risks": ["List any potential risks or concerns"],
  "recommended_actions": ["List 2-3 recommended next steps"],
  "sla_status": "On track / At risk / Overdue based on dates and SLA target"
}

Return ONLY valid JSON.`;

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let result = {
      summary: 'Could not generate summary',
      applicant_background: '',
      document_status: '',
      risks: [],
      recommended_actions: [],
      sla_status: 'Unknown',
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('Failed to parse AI summary response:', content);
    }

    // Log insight
    await supabase.from('ai_service_insights').insert({
      organization_id,
      insight_type: 'summary',
      entity_type: 'service_application',
      entity_id: application_id,
      input_data: { application_id },
      output_data: result,
      confidence_score: 0.8,
      created_by_type: 'staff',
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Application Summary error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate summary' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
