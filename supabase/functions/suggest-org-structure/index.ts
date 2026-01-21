import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { industry, companySize, forceRegenerate } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client for caching
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const normalizedCategory = industry || 'General Business';
    const normalizedSize = companySize || 'small';

    // 1. Check for cached template (unless force regenerate)
    if (!forceRegenerate) {
      console.log(`Checking cache for: ${normalizedCategory} (${normalizedSize})`);
      
      const { data: template, error: cacheError } = await supabase
        .from('org_structure_templates')
        .select('*')
        .eq('business_category', normalizedCategory)
        .eq('company_size', normalizedSize)
        .is('organization_id', null) // Global templates only
        .order('approval_count', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheError) {
        console.error('Cache lookup error:', cacheError);
      } else if (template && template.approval_count >= 2) {
        console.log(`Using cached template with ${template.approval_count} approvals`);
        
        // Increment usage count
        await supabase
          .from('org_structure_templates')
          .update({ usage_count: (template.usage_count || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', template.id);

        return new Response(JSON.stringify({
          departments: template.departments,
          positions: template.positions,
          source: 'cached',
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Get learning data for context - prioritize custom additions
    let learningContext = '';
    
    // Get custom-added departments (most valuable learning signal)
    const { data: customDepts, error: customDeptsErr } = await supabase
      .from('org_structure_learning')
      .select('department_name')
      .eq('business_category', normalizedCategory)
      .eq('action', 'added')
      .not('department_name', 'is', null);
    
    if (customDeptsErr) {
      console.error('Failed to fetch custom departments:', customDeptsErr);
    }
    
    // Get custom-added positions
    const { data: customPositions, error: customPosErr } = await supabase
      .from('org_structure_learning')
      .select('position_name, position_department')
      .eq('business_category', normalizedCategory)
      .eq('action', 'added')
      .not('position_name', 'is', null);
    
    if (customPosErr) {
      console.error('Failed to fetch custom positions:', customPosErr);
    }

    // Count occurrences for popularity
    const deptCounts: Record<string, number> = {};
    (customDepts || []).forEach(d => {
      if (d.department_name) {
        deptCounts[d.department_name] = (deptCounts[d.department_name] || 0) + 1;
      }
    });
    
    const posCounts: Record<string, { count: number; dept: string }> = {};
    (customPositions || []).forEach(p => {
      if (p.position_name) {
        const key = p.position_name;
        if (!posCounts[key]) {
          posCounts[key] = { count: 0, dept: p.position_department || '' };
        }
        posCounts[key].count++;
      }
    });

    // Sort by popularity
    const popularDepts = Object.entries(deptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => `${name} (added ${count}x)`);
    
    const popularPositions = Object.entries(posCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
      .map(([name, data]) => `${name} in ${data.dept} (added ${data.count}x)`);

    if (popularDepts.length > 0 || popularPositions.length > 0) {
      learningContext = `\n\nIMPORTANT - Users in this industry frequently ADD these custom items (you MUST include them):`;
      if (popularDepts.length > 0) {
        learningContext += `\nCustom Departments: ${popularDepts.join(', ')}`;
      }
      if (popularPositions.length > 0) {
        learningContext += `\nCustom Positions: ${popularPositions.join(', ')}`;
      }
      console.log('Including learning context:', { 
        customDepts: popularDepts.length, 
        customPositions: popularPositions.length 
      });
    } else {
      console.log('No learning data found for category:', normalizedCategory);
    }

    const sizeContext = companySize === 'large' 
      ? 'large enterprise (500+ employees)' 
      : companySize === 'medium' 
        ? 'medium-sized company (50-500 employees)' 
        : 'small business or startup (under 50 employees)';

    const systemPrompt = `You are an HR consultant specializing in organizational design. Generate department and position suggestions for companies.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.`;

const userPrompt = `For a ${sizeContext} in the ${normalizedCategory} industry, suggest:
1. 6-8 relevant departments (MUST always include "Executive" as the first department)
2. 10-15 common positions with their departments. For executive roles, use full forms: "Chief Executive Officer (CEO)", "Chief Technology Officer (CTO)", "Chief Financial Officer (CFO)", "Chief Operating Officer (COO)"

Focus on practical, commonly used structures. Consider the industry-specific roles.${learningContext}

Return this exact JSON structure:
{
  "departments": ["Executive", "Department2", ...],
  "positions": [
    {"name": "CEO", "department": "Executive"},
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

    // 3. Cache the result for future use
    try {
      await supabase
        .from('org_structure_templates')
        .upsert({
          business_category: normalizedCategory,
          company_size: normalizedSize,
          departments: parsed.departments,
          positions: parsed.positions,
          source: 'ai',
          usage_count: 1,
          approval_count: 0,
          organization_id: null,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'business_category,company_size,organization_id',
          ignoreDuplicates: false
        });
      console.log('Cached template for future use');
    } catch (cacheErr) {
      console.error('Failed to cache template:', cacheErr);
    }

    return new Response(JSON.stringify({ ...parsed, source: 'ai' }), {
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
        { name: 'Chief Executive Officer (CEO)', department: 'Executive' },
        { name: 'Chief Technology Officer (CTO)', department: 'Executive' },
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
    'Education Consultancy': {
      departments: ['Executive', 'Visa & Immigration', 'Student Services', 'Admissions', 'Counseling', 'Marketing', 'Finance', 'Administration'],
      positions: [
        { name: 'Chief Executive Officer (CEO)', department: 'Executive' },
        { name: 'Director of Immigration', department: 'Visa & Immigration' },
        { name: 'Migration Agent', department: 'Visa & Immigration' },
        { name: 'Visa Consultant', department: 'Visa & Immigration' },
        { name: 'Student Services Manager', department: 'Student Services' },
        { name: 'Student Coordinator', department: 'Student Services' },
        { name: 'Admissions Manager', department: 'Admissions' },
        { name: 'Admissions Officer', department: 'Admissions' },
        { name: 'Education Counselor', department: 'Counseling' },
        { name: 'Career Advisor', department: 'Counseling' },
        { name: 'Marketing Manager', department: 'Marketing' },
        { name: 'Finance Manager', department: 'Finance' },
        { name: 'Office Administrator', department: 'Administration' },
      ],
    },
    'Healthcare': {
      departments: ['Executive', 'Medical', 'Nursing', 'Administration', 'Finance', 'Human Resources', 'Operations'],
      positions: [
        { name: 'Chief Executive Officer (CEO)', department: 'Executive' },
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
        { name: 'Chief Executive Officer (CEO)', department: 'Executive' },
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
    'Migration Agency': {
      departments: ['Executive', 'Immigration Consulting', 'Case Management', 'Compliance', 'Client Services', 'Marketing', 'Administration'],
      positions: [
        { name: 'Chief Executive Officer (CEO)', department: 'Executive' },
        { name: 'Principal Migration Agent', department: 'Immigration Consulting' },
        { name: 'Migration Agent', department: 'Immigration Consulting' },
        { name: 'Case Manager', department: 'Case Management' },
        { name: 'Compliance Officer', department: 'Compliance' },
        { name: 'Client Services Manager', department: 'Client Services' },
        { name: 'Client Coordinator', department: 'Client Services' },
        { name: 'Marketing Manager', department: 'Marketing' },
        { name: 'Office Administrator', department: 'Administration' },
      ],
    },
  };

  // Ensure Executive is always first in the result
  const result = industryDefaults[industry || ''] || {
    departments: ['Executive', 'Operations', 'Sales', 'Marketing', 'Finance', 'Human Resources', 'Customer Service'],
    positions: [
      { name: 'Chief Executive Officer (CEO)', department: 'Executive' },
      { name: 'Chief Operating Officer (COO)', department: 'Executive' },
      { name: 'Chief Financial Officer (CFO)', department: 'Executive' },
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
  
  // Ensure Executive is always first
  if (!result.departments.includes('Executive')) {
    result.departments.unshift('Executive');
    result.positions.unshift({ name: 'Chief Executive Officer (CEO)', department: 'Executive' });
  } else if (result.departments[0] !== 'Executive') {
    result.departments = ['Executive', ...result.departments.filter(d => d !== 'Executive')];
  }
  
  return result;
}
