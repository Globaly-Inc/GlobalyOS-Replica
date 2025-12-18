/**
 * AI Suggest Screenshots Edge Function
 * Uses Lovable AI to analyze article content and suggest optimal screenshot routes
 * with privacy masking recommendations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrivacyOptions {
  maskNames?: boolean;
  blurAvatars?: boolean;
  hideEmails?: boolean;
}

interface ScreenshotSuggestion {
  route: string;
  description: string;
  highlight_selector?: string;
  annotation?: string;
  privacy_masks?: {
    type: 'blur' | 'replace' | 'hide';
    selector: string;
    replacement?: string;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { 
      articleContent, 
      articleTitle, 
      module, 
      orgSlug = 'globalyhub',
      privacyOptions = { maskNames: true, blurAvatars: true, hideEmails: true }
    } = await req.json();

    if (!articleContent || !articleTitle) {
      throw new Error('articleContent and articleTitle are required');
    }

    console.log(`Analyzing article: ${articleTitle} for module: ${module}`);

    // Build privacy masking instructions
    const privacyInstructions = [];
    if (privacyOptions.maskNames) {
      privacyInstructions.push('- Replace real employee names with demo names (e.g., "John Doe", "Jane Smith", "Alex Johnson")');
    }
    if (privacyOptions.blurAvatars) {
      privacyInstructions.push('- Blur profile photos/avatars using selector patterns like ".avatar", "[data-avatar]", "img.profile-photo"');
    }
    if (privacyOptions.hideEmails) {
      privacyInstructions.push('- Hide email addresses by replacing with demo emails like "demo@example.com"');
    }

    const systemPrompt = `You are an expert at analyzing help documentation for a SaaS HR/Business Operating System called GlobalyOS and suggesting optimal screenshots to visually illustrate the content.

The app uses the URL structure: /org/{orgSlug}/... for authenticated pages.
Available modules: team, attendance, leave, kpis, wiki, calendar, chat, settings, announcements

For each screenshot suggestion:
1. Identify the most valuable page/view to capture that illustrates the documentation
2. Use the orgSlug "${orgSlug}" in routes (e.g., /org/${orgSlug}/team)
3. Suggest which element to highlight (CSS selector) if applicable
4. Provide a brief annotation to display on the screenshot
5. Include privacy masks to protect real user data:
${privacyInstructions.join('\n')}

Common selectors patterns in GlobalyOS:
- Cards: ".card", "[data-card]"
- Buttons: "button", ".btn"
- Forms: "form", ".form-group"
- Tables: "table", "[role='grid']"
- Navigation: "nav", ".sidebar"
- Dialogs: "[role='dialog']", ".dialog-content"
- User info: ".avatar", ".employee-name", ".user-email"
- Data displays: ".stat-card", ".kpi-card", ".attendance-record"`;

    const userPrompt = `Analyze this support article and suggest 2-4 optimal screenshots:

ARTICLE TITLE: ${articleTitle}
MODULE: ${module || 'general'}

ARTICLE CONTENT:
${articleContent.substring(0, 4000)}

Return a JSON array of screenshot suggestions with this structure:
[
  {
    "route": "/org/${orgSlug}/...",
    "description": "Brief description of what this screenshot shows",
    "highlight_selector": "CSS selector for element to highlight (optional)",
    "annotation": "Text annotation to display on screenshot (optional)",
    "privacy_masks": [
      { "type": "blur|replace|hide", "selector": "CSS selector", "replacement": "text for replace type" }
    ]
  }
]

Focus on screenshots that:
- Show the main feature being documented
- Highlight key UI elements users need to find
- Include step-by-step flows if the article is instructional`;

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
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_screenshots',
              description: 'Suggest optimal screenshots for documentation',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        route: { type: 'string', description: 'Route path to capture' },
                        description: { type: 'string', description: 'Description of screenshot' },
                        highlight_selector: { type: 'string', description: 'CSS selector to highlight' },
                        annotation: { type: 'string', description: 'Annotation text' },
                        privacy_masks: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', enum: ['blur', 'replace', 'hide'] },
                              selector: { type: 'string' },
                              replacement: { type: 'string' }
                            },
                            required: ['type', 'selector']
                          }
                        }
                      },
                      required: ['route', 'description']
                    }
                  }
                },
                required: ['suggestions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_screenshots' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let suggestions: ScreenshotSuggestion[] = [];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        suggestions = parsed.suggestions || [];
      } catch (parseError) {
        console.error('Failed to parse tool response:', parseError);
        // Try fallback: parse from content if tool call failed
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            suggestions = JSON.parse(jsonMatch[0]);
          }
        }
      }
    }

    // Add default privacy masks if enabled but not specified
    suggestions = suggestions.map(s => {
      const masks = s.privacy_masks || [];
      
      if (privacyOptions.maskNames && !masks.some(m => m.selector.includes('name'))) {
        masks.push({ type: 'replace', selector: '.employee-name, .user-name, [data-name]', replacement: 'Demo User' });
      }
      if (privacyOptions.blurAvatars && !masks.some(m => m.type === 'blur')) {
        masks.push({ type: 'blur', selector: '.avatar img, [data-avatar], img.profile-photo' });
      }
      if (privacyOptions.hideEmails && !masks.some(m => m.selector.includes('email'))) {
        masks.push({ type: 'replace', selector: '.user-email, [data-email]', replacement: 'demo@example.com' });
      }
      
      return { ...s, privacy_masks: masks };
    });

    console.log(`Generated ${suggestions.length} screenshot suggestions for ${articleTitle}`);

    return new Response(JSON.stringify({
      success: true,
      suggestions,
      articleTitle,
      module,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI suggest screenshots error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
