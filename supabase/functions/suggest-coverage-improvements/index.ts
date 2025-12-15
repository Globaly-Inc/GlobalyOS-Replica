import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoverageFile {
  path: string;
  coverage: number;
  uncoveredLines: number[];
}

interface CoverageSuggestionRequest {
  files: CoverageFile[];
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

    const { files }: CoverageSuggestionRequest = await req.json();
    console.log(`Generating coverage suggestions for ${files.length} files`);

    // Filter to files with coverage below 100%
    const lowCoverageFiles = files.filter(f => f.coverage < 100).slice(0, 10); // Limit to 10 files

    if (lowCoverageFiles.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt
    const fileDescriptions = lowCoverageFiles.map(f => 
      `- ${f.path} (${f.coverage}% coverage, uncovered lines: ${f.uncoveredLines.slice(0, 20).join(', ')}${f.uncoveredLines.length > 20 ? '...' : ''})`
    ).join('\n');

    const systemPrompt = `You are a senior software engineer specializing in test coverage. Your task is to suggest specific, actionable test cases that would improve code coverage to 100%.

For each file, provide:
1. Clear test descriptions explaining what scenario is being tested
2. Actual test code using Vitest syntax (describe, it, expect)
3. Priority level (high for critical paths, medium for edge cases, low for minor branches)

Focus on:
- Testing uncovered branches and conditions
- Edge cases and error handling
- Integration points
- User interaction flows for UI components

Use modern TypeScript and React testing patterns.`;

    const userPrompt = `I need test suggestions to achieve 100% code coverage for these files:

${fileDescriptions}

Generate 2-3 specific test suggestions per file. Each suggestion should include actual test code that can be copied and used directly.`;

    // Call Lovable AI
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
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_test_suggestions',
              description: 'Provide test suggestions for improving code coverage',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        file: { type: 'string', description: 'The file path' },
                        currentCoverage: { type: 'number', description: 'Current coverage percentage' },
                        suggestions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              testDescription: { type: 'string', description: 'Description of what the test verifies' },
                              testCode: { type: 'string', description: 'The actual test code in Vitest syntax' },
                              priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Priority level' },
                              targetLines: { type: 'array', items: { type: 'number' }, description: 'Line numbers this test would cover' },
                            },
                            required: ['testDescription', 'testCode', 'priority'],
                          },
                        },
                      },
                      required: ['file', 'currentCoverage', 'suggestions'],
                    },
                  },
                },
                required: ['suggestions'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'provide_test_suggestions' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    // Extract suggestions from tool call
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'provide_test_suggestions') {
      throw new Error('Unexpected AI response format');
    }

    const suggestions = JSON.parse(toolCall.function.arguments);
    console.log(`Generated ${suggestions.suggestions?.length || 0} file suggestions`);

    return new Response(
      JSON.stringify(suggestions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-coverage-improvements:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
