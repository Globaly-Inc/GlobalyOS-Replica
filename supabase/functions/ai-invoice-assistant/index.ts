import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { action, invoiceId, organizationId, context } = await req.json();

    // Verify user belongs to org
    const { data: emp } = await supabase
      .from('employees')
      .select('organization_id')
      .eq('user_id', authData.user.id)
      .single();
    if (!emp || emp.organization_id !== organizationId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'AI not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let prompt = '';
    let systemPrompt = 'You are a professional accounting assistant for GlobalyOS. Provide concise, helpful responses.';

    switch (action) {
      case 'generate-description': {
        prompt = `Generate a professional invoice line item description for the following service/fee context:\n${JSON.stringify(context)}\nKeep it under 100 words, professional and clear.`;
        break;
      }
      case 'payment-reminder': {
        prompt = `Generate a polite but firm payment reminder message for an overdue invoice. Context:\n${JSON.stringify(context)}\nKeep it under 150 words.`;
        break;
      }
      case 'financial-summary': {
        prompt = `Provide a plain-English financial summary of this invoice:\n${JSON.stringify(context)}\nInclude key figures, payment status, and any notable items. Keep it under 200 words.`;
        break;
      }
      case 'anomaly-check': {
        systemPrompt = 'You are a financial auditor. Check for anomalies, errors, or unusual patterns in invoice data.';
        prompt = `Review this invoice data for any anomalies, duplicate fees, unusual amounts, or potential errors:\n${JSON.stringify(context)}\nRespond with a JSON array of findings: [{ "type": "warning"|"error"|"info", "message": "description" }]. If nothing unusual, return [].`;
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OpenAI error:', errText);
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const result = aiData.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ result, action }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('AI invoice assistant error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
