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
    const { employeeId, forceRegenerate = false } = await req.json();
    
    if (!employeeId) {
      return new Response(JSON.stringify({ error: 'Employee ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch employee with related data
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select(`
        id, position, department, join_date, office_id, manager_id,
        role_description, role_description_generated_at,
        user_id,
        profiles:user_id (first_name, last_name),
        offices:office_id (name, city, country),
        manager:manager_id (
          user_id,
          profiles:user_id (first_name, last_name)
        )
      `)
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      console.error('Error fetching employee:', empError);
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if we already have a cached description
    if (!forceRegenerate && employee.role_description && employee.role_description_generated_at) {
      return new Response(JSON.stringify({ 
        description: employee.role_description,
        generatedAt: employee.role_description_generated_at,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count direct reports
    const { count: directReportsCount } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('manager_id', employeeId)
      .eq('status', 'active');

    // Build context for AI
    const profile = employee.profiles as any;
    const employeeName = profile ? `${profile.first_name} ${profile.last_name}` : 'This employee';
    const office = employee.offices as any;
    const manager = employee.manager as any;
    const managerProfile = manager?.profiles as any;
    
    const joinYear = employee.join_date ? new Date(employee.join_date).getFullYear() : null;
    const tenure = joinYear ? `since ${joinYear}` : '';
    
    const locationContext = office ? `based in ${office.city || office.name}${office.country ? `, ${office.country}` : ''}` : '';
    const teamContext = directReportsCount && directReportsCount > 0 
      ? `leads a team of ${directReportsCount} direct report${directReportsCount > 1 ? 's' : ''}`
      : '';
    const managerContext = managerProfile 
      ? `reports to ${managerProfile.first_name} ${managerProfile.last_name}`
      : '';

    const prompt = `Generate a personalized role description for an employee with the following context:

Name: ${employeeName}
Position: ${employee.position}
Department: ${employee.department}
${tenure ? `Tenure: With the company ${tenure}` : ''}
${locationContext ? `Location: ${locationContext}` : ''}
${teamContext ? `Team: ${teamContext}` : ''}
${managerContext ? `Reporting: ${managerContext}` : ''}

Write a professional, personalized 2-3 sentence role description that:
1. Starts with their name and position
2. Mentions their key responsibilities in the ${employee.department} department
3. Incorporates their tenure, team leadership (if applicable), or other context naturally

Keep it concise, professional, and personalized. Do not use generic placeholder text.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an HR assistant that writes professional, personalized role descriptions. Be concise and specific.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const description = aiData.choices?.[0]?.message?.content?.trim();

    if (!description) {
      return new Response(JSON.stringify({ error: 'No description generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save to database
    const generatedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        role_description: description,
        role_description_generated_at: generatedAt,
      })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Error saving description:', updateError);
    }

    return new Response(JSON.stringify({ 
      description,
      generatedAt,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-employee-role-description:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
