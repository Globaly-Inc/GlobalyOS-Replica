/**
 * Get Organization Structure Templates
 * Fetches curated departments and positions from Super Admin templates
 * Falls back to General Business or hardcoded defaults if no templates found
 */

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
    const { industry, companySize } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration is missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedCategory = industry || 'General Business';

    console.log(`Fetching templates for category: ${normalizedCategory}`);

    // 1. Fetch departments from template_departments
    let { data: departments, error: deptError } = await supabase
      .from('template_departments')
      .select('name, description')
      .eq('business_category', normalizedCategory)
      .eq('is_active', true)
      .order('sort_order');

    if (deptError) {
      console.error('Error fetching departments:', deptError);
    }

    // 2. Fetch positions from template_positions
    let { data: positions, error: posError } = await supabase
      .from('template_positions')
      .select('name, department_name, description, responsibilities')
      .eq('business_category', normalizedCategory)
      .eq('is_active', true)
      .order('sort_order');

    if (posError) {
      console.error('Error fetching positions:', posError);
    }

    // 3. If no templates found for this category, try "General Business"
    if ((!departments || departments.length === 0) && normalizedCategory !== 'General Business') {
      console.log(`No templates for ${normalizedCategory}, falling back to General Business`);
      
      const { data: fallbackDepts } = await supabase
        .from('template_departments')
        .select('name, description')
        .eq('business_category', 'General Business')
        .eq('is_active', true)
        .order('sort_order');
      
      const { data: fallbackPositions } = await supabase
        .from('template_positions')
        .select('name, department_name, description, responsibilities')
        .eq('business_category', 'General Business')
        .eq('is_active', true)
        .order('sort_order');

      if (fallbackDepts && fallbackDepts.length > 0) {
        departments = fallbackDepts;
        positions = fallbackPositions || [];
        console.log(`Using General Business fallback: ${departments.length} departments, ${positions?.length || 0} positions`);
      }
    }

    // 4. If still no templates, use hardcoded defaults
    if (!departments || departments.length === 0) {
      console.log('No templates in database, using hardcoded defaults');
      const defaults = getDefaultStructure();
      return new Response(JSON.stringify({
        departments: defaults.departments,
        positions: defaults.positions,
        source: 'default'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Format response
    const deptNames = departments.map(d => d.name);
    
    // Ensure Executive is always first
    if (!deptNames.includes('Executive')) {
      deptNames.unshift('Executive');
    } else if (deptNames[0] !== 'Executive') {
      const execIndex = deptNames.indexOf('Executive');
      deptNames.splice(execIndex, 1);
      deptNames.unshift('Executive');
    }

    const formattedPositions = (positions || []).map(p => ({
      name: p.name,
      department: p.department_name
    }));

    // Ensure CEO exists if Executive department exists
    if (deptNames.includes('Executive') && !formattedPositions.some(p => p.department === 'Executive')) {
      formattedPositions.unshift({ name: 'Chief Executive Officer (CEO)', department: 'Executive' });
    }

    console.log(`Returning ${deptNames.length} departments, ${formattedPositions.length} positions for ${normalizedCategory}`);

    return new Response(JSON.stringify({
      departments: deptNames,
      positions: formattedPositions,
      departmentDetails: departments,
      positionDetails: positions || [],
      source: 'template'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in get-org-structure-templates:", error);
    const defaults = getDefaultStructure();
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      ...defaults,
      source: 'default'
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDefaultStructure() {
  return {
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
    ]
  };
}
