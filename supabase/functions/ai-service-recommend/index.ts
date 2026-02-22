import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-token',
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
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id, client_profile, portal_type } = await req.json();

    if (!organization_id || !client_profile) {
      return new Response(JSON.stringify({ error: 'organization_id and client_profile are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user belongs to the target organization
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (!orgMembership) {
      return new Response(JSON.stringify({ error: 'Access denied: Not a member of this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine visibility filter based on portal type
    const visibilityFilter = portal_type === 'agent'
      ? ['agent_portal', 'both_portals']
      : ['client_portal', 'both_portals'];

    // Fetch published services
    const { data: services } = await supabase
      .from('crm_services')
      .select('id, name, category, short_description, long_description, tags, eligibility_notes, sla_target_days, service_type')
      .eq('organization_id', organization_id)
      .eq('status', 'published')
      .in('visibility', visibilityFilter);

    if (!services || services.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], message: 'No services available' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build prompt for AI
    const servicesContext = services.map(s =>
      `- ${s.name} (${s.category || 'General'}): ${s.short_description || s.long_description || 'No description'}. Tags: ${(s.tags || []).join(', ')}. Eligibility: ${s.eligibility_notes || 'None specified'}. SLA: ${s.sla_target_days || 'N/A'} days.`
    ).join('\n');

    const profileContext = typeof client_profile === 'string'
      ? client_profile
      : JSON.stringify(client_profile);

    const prompt = `You are a service recommendation assistant. Based on the client profile below, recommend the most relevant services from the available catalog. Return a JSON array of recommendations, each with: service_id, service_name, relevance_score (0-100), and explanation (1-2 sentences).

Client Profile:
${profileContext}

Available Services:
${servicesContext}

Return ONLY valid JSON in this format:
{"recommendations": [{"service_id": "...", "service_name": "...", "relevance_score": 85, "explanation": "..."}]}

Order by relevance_score descending. Include only services with relevance_score >= 40.`;

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

    // Parse AI response
    let recommendations = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        recommendations = parsed.recommendations || [];
      }
    } catch {
      console.error('Failed to parse AI response:', content);
    }

    // Log insight
    if (recommendations.length > 0) {
      await supabase.from('ai_service_insights').insert({
        organization_id,
        insight_type: 'recommendation',
        entity_type: 'client_profile',
        entity_id: organization_id,
        input_data: { client_profile, portal_type },
        output_data: { recommendations },
        confidence_score: recommendations[0]?.relevance_score / 100 || 0.5,
        created_by_type: portal_type === 'agent' ? 'agent' : 'client',
      });
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Service Recommend error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate recommendations' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
