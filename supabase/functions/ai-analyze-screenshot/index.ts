import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { screenshotId, imageUrl } = await req.json();

    if (!screenshotId) {
      throw new Error('screenshotId is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Analyzing screenshot: ${screenshotId}`);

    // Get screenshot record
    const { data: screenshot, error: fetchError } = await supabase
      .from('support_screenshots')
      .select('*')
      .eq('id', screenshotId)
      .single();

    if (fetchError || !screenshot) {
      throw new Error(`Screenshot not found: ${fetchError?.message}`);
    }

    // Get the image URL - either from param or storage
    let actualImageUrl = imageUrl;
    if (!actualImageUrl && screenshot.storage_path) {
      const { data: urlData } = supabase.storage
        .from('doc_screenshots')
        .getPublicUrl(screenshot.storage_path);
      actualImageUrl = urlData.publicUrl;
    }

    if (!actualImageUrl) {
      throw new Error('No image available for analysis');
    }

    console.log(`Analyzing image: ${actualImageUrl}`);

    // Use Gemini 2.5 Flash with vision capability
    const systemPrompt = `You are an AI that analyzes screenshots of a SaaS application called GlobalyOS.
Your job is to describe what you see in the screenshot in detail, identifying:
1. The main UI section or feature being shown
2. Key UI elements visible (buttons, forms, cards, tables, navigation, etc.)
3. What actions a user could take on this screen
4. What data or information is being displayed

Be specific and accurate. Describe what you actually see, not what you assume.
Focus on elements that would be useful for documentation purposes.`;

    const userPrompt = `Analyze this screenshot from GlobalyOS.

Route: ${screenshot.route_path}
Module: ${screenshot.module || 'unknown'}
Current description: ${screenshot.description || 'none'}

Please provide:
1. A detailed description of what's shown (2-3 sentences)
2. A list of UI elements visible
3. The primary feature or action this screen enables
4. Any notable data or state shown

Return as JSON with these fields:
{
  "description": "Detailed description of what the screenshot shows",
  "ui_elements": ["element1", "element2", ...],
  "feature_context": "Primary feature name (e.g., 'Leave Request Dashboard')",
  "suggested_highlight": "CSS selector for the most important element to highlight, if any",
  "data_visible": "What kind of data/content is shown",
  "user_actions": ["action1", "action2", ...]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: actualImageUrl } }
            ]
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No analysis received from AI');
    }

    console.log('AI analysis response:', aiContent);

    // Parse AI response
    let analysis;
    try {
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using raw text');
      analysis = {
        description: aiContent,
        ui_elements: [],
        feature_context: screenshot.description || 'Unknown feature',
      };
    }

    // Update the screenshot record with analysis
    const { error: updateError } = await supabase
      .from('support_screenshots')
      .update({
        ai_description: analysis.description,
        ui_elements: analysis.ui_elements || [],
        feature_context: analysis.feature_context,
        is_analyzed: true,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Update highlight selector if AI suggests one and we don't have one
        highlight_selector: screenshot.highlight_selector || analysis.suggested_highlight || null,
      })
      .eq('id', screenshotId);

    if (updateError) {
      throw new Error(`Failed to save analysis: ${updateError.message}`);
    }

    console.log(`Screenshot analysis completed for: ${screenshotId}`);

    return new Response(
      JSON.stringify({
        success: true,
        screenshotId,
        analysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Screenshot analysis error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
