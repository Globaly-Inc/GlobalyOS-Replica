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
    const { 
      businessCategory, 
      selectedDepartments, 
      selectedPositions,
      customDepartments,
      customPositions,
      organizationId 
    } = await req.json();

    if (!businessCategory || !organizationId) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: businessCategory and organizationId" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const learningRecords: Array<{
      business_category: string;
      department_name?: string;
      position_name?: string;
      position_department?: string;
      action: string;
      organization_id: string;
    }> = [];

    const customDeptSet = new Set(customDepartments || []);
    const customPosSet = new Set(customPositions || []);

    // Track approved/custom departments
    for (const dept of (selectedDepartments || [])) {
      learningRecords.push({
        business_category: businessCategory,
        department_name: dept,
        action: customDeptSet.has(dept) ? 'added' : 'approved',
        organization_id: organizationId
      });
    }

    // Track approved/custom positions
    for (const pos of (selectedPositions || [])) {
      learningRecords.push({
        business_category: businessCategory,
        position_name: pos.name,
        position_department: pos.department,
        action: customPosSet.has(pos.name) ? 'added' : 'approved',
        organization_id: organizationId
      });
    }

    if (learningRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('org_structure_learning')
        .insert(learningRecords);

      if (insertError) {
        console.error('Failed to insert learning records:', insertError);
      } else {
        console.log(`Saved ${learningRecords.length} learning records for ${businessCategory}`);
      }
    }

    // Increment approval count for the template
    const { error: rpcError } = await supabase
      .rpc('increment_template_approval', {
        p_category: businessCategory,
        p_size: 'small'
      });

    if (rpcError) {
      console.error('Failed to increment approval count:', rpcError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      recordsSaved: learningRecords.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in save-org-structure-learning:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
