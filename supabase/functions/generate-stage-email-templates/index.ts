import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, stages, company_name } = await req.json();

    if (!organization_id || !stages || !Array.isArray(stages) || stages.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Check which stages already have templates — skip those
    const stageIds = stages.map((s: any) => s.stage_id);
    const { data: existingTemplates } = await supabase
      .from('hiring_email_templates')
      .select('stage_id')
      .in('stage_id', stageIds)
      .eq('organization_id', organization_id);

    const existingStageIds = new Set((existingTemplates || []).map((t: any) => t.stage_id));
    const stagesToGenerate = stages.filter((s: any) => !existingStageIds.has(s.stage_id));

    if (stagesToGenerate.length === 0) {
      return new Response(JSON.stringify({ message: 'All stages already have templates', generated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stageList = stagesToGenerate.map((s: any) => s.stage_name).join(', ');
    const companyDisplayName = company_name || 'our company';

    const systemPrompt = `You are an HR communications expert writing professional, warm, and encouraging candidate-facing emails for a company called "${companyDisplayName}". Each email should be 80–120 words, use a friendly tone, and include placeholders {{candidate_name}}, {{job_title}}, and {{company_name}} where appropriate.`;

    const userPrompt = `Generate email templates for the following hiring pipeline stages: ${stageList}.

For each stage, write a unique email appropriate to that stage in the hiring process:
- Applied / Application Received: warm "thank you for applying" confirmation
- Screening / Phone Screen: "we're reviewing your application" status update  
- Assignment / Take-home: "please complete this assignment" with encouragement
- Interview 1 / Interview 2 / Interview 3: "you've been selected for an interview" scheduling email
- Offer: "we're pleased to extend an offer" notification
- Hired / Welcome: "welcome to the team" onboarding email
- Any other stage: write a professional stage-appropriate email

Return one template per stage.`;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'generate_stage_templates',
          description: 'Return email templates for each hiring stage',
          parameters: {
            type: 'object',
            properties: {
              templates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    stage_name: { type: 'string', description: 'The stage name exactly as provided' },
                    name: { type: 'string', description: 'Short friendly template name, e.g. "Application Received"' },
                    subject: { type: 'string', description: 'Email subject line using {{job_title}} and {{company_name}} variables' },
                    body: { type: 'string', description: 'Full email body using {{candidate_name}}, {{job_title}}, {{company_name}} variables, 80-120 words' },
                  },
                  required: ['stage_name', 'name', 'subject', 'body'],
                  additionalProperties: false,
                },
              },
            },
            required: ['templates'],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: 'generate_stage_templates' } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage credits required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: 'AI did not return structured output' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let generated: Array<{ stage_name: string; name: string; subject: string; body: string }>;
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      generated = parsed.templates;
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse AI output' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Match generated templates back to stage_ids by stage_name
    const inserts = generated
      .map((tpl) => {
        const matchedStage = stagesToGenerate.find(
          (s: any) => s.stage_name.toLowerCase() === tpl.stage_name.toLowerCase(),
        );
        if (!matchedStage) {
          // Fallback: match by index order
          const idx = generated.indexOf(tpl);
          return stagesToGenerate[idx]
            ? {
                organization_id,
                stage_id: stagesToGenerate[idx].stage_id,
                name: tpl.name,
                subject: tpl.subject,
                body: tpl.body,
                template_type: 'stage_entry',
                is_active: true,
              }
            : null;
        }
        return {
          organization_id,
          stage_id: matchedStage.stage_id,
          name: tpl.name,
          subject: tpl.subject,
          body: tpl.body,
          template_type: 'stage_entry',
          is_active: true,
        };
      })
      .filter(Boolean);

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('hiring_email_templates')
        .insert(inserts as any[]);

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to save templates' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({ message: 'Templates generated successfully', generated: inserts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
