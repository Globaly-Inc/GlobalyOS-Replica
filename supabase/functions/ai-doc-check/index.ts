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
    const { organization_id, document_id, application_id, file_name, file_type, expected_document_type } = await req.json();

    if (!organization_id || !document_id || !file_name) {
      return new Response(JSON.stringify({ error: 'organization_id, document_id, and file_name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a document verification assistant for a service application system. Analyze the following document submission and determine its quality and completeness.

Document Details:
- File Name: ${file_name}
- File Type: ${file_type || 'unknown'}
- Expected Document Type: ${expected_document_type || 'Not specified'}

Based on the file name and type, assess:
1. Does the file name suggest it matches the expected document type?
2. Is the file format appropriate (PDF, image, or document format)?
3. Are there any red flags (e.g., "untitled", "screenshot", very generic names)?

Return ONLY valid JSON in this format:
{
  "status": "ok" | "unclear" | "wrong_doc" | "needs_review",
  "confidence": 0.0-1.0,
  "issues": ["list of specific issues if any"],
  "suggestions": ["list of suggestions for the applicant"],
  "summary": "One sentence summary of the assessment"
}`;

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let result = { status: 'needs_review', confidence: 0.5, issues: [], suggestions: [], summary: 'Could not analyze document' };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('Failed to parse AI doc check response:', content);
    }

    // Log insight
    await supabase.from('ai_service_insights').insert({
      organization_id,
      insight_type: 'doc_check',
      entity_type: 'service_application_document',
      entity_id: document_id,
      input_data: { file_name, file_type, expected_document_type, application_id },
      output_data: result,
      confidence_score: result.confidence || 0.5,
      created_by_type: 'system',
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Doc Check error:', error);
    return new Response(JSON.stringify({ error: 'Failed to check document' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
