import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

  const { subject, preview_text, campaign_name } = await req.json();

  const prompt = `You are an expert email marketing copywriter. Generate 3 alternative subject lines for a bulk email campaign.

Campaign name: "${campaign_name ?? 'Email Campaign'}"
Current subject: "${subject}"
Preview text: "${preview_text ?? ''}"

Rules:
- Each subject line must be unique and meaningfully different
- Keep under 60 characters
- Make them engaging, curiosity-driven, or value-focused
- Do not use spam trigger words (FREE, URGENT, ACT NOW, etc.)
- Return ONLY a JSON array of 3 strings, nothing else

Example format: ["Subject 1", "Subject 2", "Subject 3"]`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), { status: 429, headers: corsHeaders });
    if (status === 402) return new Response(JSON.stringify({ error: 'AI usage credits required.' }), { status: 402, headers: corsHeaders });
    return new Response(JSON.stringify({ error: 'AI request failed' }), { status: 500, headers: corsHeaders });
  }

  const aiData = await response.json();
  const text = aiData.choices?.[0]?.message?.content ?? '[]';

  let suggestions: string[] = [];
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) suggestions = JSON.parse(match[0]);
  } catch {
    suggestions = [];
  }

  return new Response(JSON.stringify({ suggestions }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
