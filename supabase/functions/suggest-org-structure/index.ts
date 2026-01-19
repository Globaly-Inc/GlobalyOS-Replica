import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industry, companySize } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const sizeContext = companySize === 'large' 
      ? 'large enterprise (500+ employees)' 
      : companySize === 'medium' 
        ? 'medium-sized company (50-500 employees)' 
        : 'small business or startup (under 50 employees)';

    const systemPrompt = `You are an HR consultant specializing in organizational design. Generate department and position suggestions for companies.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.`;

    const userPrompt = `For a ${sizeContext} in the ${industry || 'General Business'} industry, suggest:
1. 6-8 relevant departments
2. 10-15 common positions with their departments

Focus on practical, commonly used structures. Consider the industry-specific roles.

Return this exact JSON structure:
{
  "departments": ["Department1", "Department2", ...],
  "positions": [
    {"name": "Position Name", "department": "Department Name"},
    ...
  ]
}`;

    console.log('Calling Lovable AI for org structure suggestions...');
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          fallback: getDefaultStructure(industry)
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Return fallback for any error
      return new Response(JSON.stringify(getDefaultStructure(industry)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(JSON.stringify(getDefaultStructure(industry)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      // Remove potential markdown code blocks
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      return new Response(JSON.stringify(getDefaultStructure(industry)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate structure
    if (!parsed.departments || !Array.isArray(parsed.departments) || 
        !parsed.positions || !Array.isArray(parsed.positions)) {
      console.error("Invalid structure in parsed response:", parsed);
      return new Response(JSON.stringify(getDefaultStructure(industry)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generated ${parsed.departments.length} departments and ${parsed.positions.length} positions`);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-org-structure:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      ...getDefaultStructure("General Business")
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDefaultStructure(industry?: string) {
  const industryDefaults: Record<string, { departments: string[], positions: Array<{name: string, department: string}> }> = {
    'Technology': {
      departments: ['Executive', 'Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Human Resources', 'Finance'],
      positions: [
        { name: 'CEO', department: 'Executive' },
        { name: 'CTO', department: 'Executive' },
        { name: 'Software Engineer', department: 'Engineering' },
        { name: 'Senior Engineer', department: 'Engineering' },
        { name: 'Engineering Manager', department: 'Engineering' },
        { name: 'Product Manager', department: 'Product' },
        { name: 'UX Designer', department: 'Design' },
        { name: 'Marketing Manager', department: 'Marketing' },
        { name: 'Sales Representative', department: 'Sales' },
        { name: 'HR Manager', department: 'Human Resources' },
        { name: 'Recruiter', department: 'Human Resources' },
        { name: 'Finance Manager', department: 'Finance' },
      ],
    },
    'Healthcare': {
      departments: ['Executive', 'Medical', 'Nursing', 'Administration', 'Finance', 'Human Resources', 'Operations'],
      positions: [
        { name: 'CEO', department: 'Executive' },
        { name: 'Medical Director', department: 'Medical' },
        { name: 'Physician', department: 'Medical' },
        { name: 'Nurse Manager', department: 'Nursing' },
        { name: 'Registered Nurse', department: 'Nursing' },
        { name: 'Office Manager', department: 'Administration' },
        { name: 'Medical Receptionist', department: 'Administration' },
        { name: 'Finance Manager', department: 'Finance' },
        { name: 'HR Manager', department: 'Human Resources' },
        { name: 'Operations Manager', department: 'Operations' },
      ],
    },
    'Retail': {
      departments: ['Executive', 'Store Operations', 'Sales', 'Merchandising', 'Marketing', 'Finance', 'Human Resources'],
      positions: [
        { name: 'CEO', department: 'Executive' },
        { name: 'Store Manager', department: 'Store Operations' },
        { name: 'Assistant Manager', department: 'Store Operations' },
        { name: 'Sales Associate', department: 'Sales' },
        { name: 'Merchandiser', department: 'Merchandising' },
        { name: 'Marketing Manager', department: 'Marketing' },
        { name: 'Finance Manager', department: 'Finance' },
        { name: 'HR Manager', department: 'Human Resources' },
        { name: 'Inventory Specialist', department: 'Store Operations' },
      ],
    },
  };

  return industryDefaults[industry || ''] || {
    departments: ['Executive', 'Operations', 'Sales', 'Marketing', 'Finance', 'Human Resources', 'Customer Service'],
    positions: [
      { name: 'CEO', department: 'Executive' },
      { name: 'COO', department: 'Executive' },
      { name: 'Operations Manager', department: 'Operations' },
      { name: 'Sales Manager', department: 'Sales' },
      { name: 'Sales Representative', department: 'Sales' },
      { name: 'Marketing Manager', department: 'Marketing' },
      { name: 'Finance Manager', department: 'Finance' },
      { name: 'Accountant', department: 'Finance' },
      { name: 'HR Manager', department: 'Human Resources' },
      { name: 'Customer Service Rep', department: 'Customer Service' },
    ],
  };
}
