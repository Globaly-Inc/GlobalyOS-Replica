import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamMember {
  email: string;
  officeId?: string;
}

interface RequestBody {
  organizationId: string;
  teamMembers: TeamMember[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId, teamMembers }: RequestBody = await req.json();

    console.log('Request received:', { 
      organizationId, 
      teamMembersCount: teamMembers?.length,
      teamMembers: teamMembers?.map(m => ({ email: m.email, officeId: m.officeId }))
    });

    if (!organizationId || !teamMembers?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Setting up employee schedules for ${teamMembers.length} team members in org ${organizationId}`);

    // Get all office schedules for this organization
    const { data: officeSchedules, error: schedulesError } = await supabase
      .from('office_schedules')
      .select('*')
      .eq('organization_id', organizationId);

    if (schedulesError) {
      console.error('Error fetching office schedules:', schedulesError);
      throw schedulesError;
    }

    // Create a map of office_id -> schedule for quick lookup
    const scheduleByOffice = new Map(
      (officeSchedules || []).map(s => [s.office_id, s])
    );

    console.log('Office schedules found:', {
      count: officeSchedules?.length || 0,
      officeIds: officeSchedules?.map(s => s.office_id)
    });

    let createdCount = 0;
    let skippedCount = 0;

    for (const member of teamMembers) {
      if (!member.officeId) {
        console.log(`Skipping ${member.email} - no office assigned`);
        skippedCount++;
        continue;
      }

      // Look up employee by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', member.email)
        .maybeSingle();

      if (!profile) {
        console.log(`Skipping ${member.email} - profile not found`);
        skippedCount++;
        continue;
      }

      // Get employee record
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!employee) {
        console.log(`Skipping ${member.email} - employee not found`);
        skippedCount++;
        continue;
      }

      // Check if employee already has a schedule
      const { data: existingSchedule } = await supabase
        .from('employee_schedules')
        .select('id')
        .eq('employee_id', employee.id)
        .maybeSingle();

      if (existingSchedule) {
        console.log(`Skipping ${member.email} - already has schedule`);
        skippedCount++;
        continue;
      }

      // Get office schedule
      const officeSchedule = scheduleByOffice.get(member.officeId);
      
      if (!officeSchedule) {
        console.log(`Skipping ${member.email} - no office schedule for office ${member.officeId}`);
        skippedCount++;
        continue;
      }

      // Create employee schedule from office schedule
      const { error: insertError } = await supabase
        .from('employee_schedules')
        .insert({
          employee_id: employee.id,
          organization_id: organizationId,
          work_start_time: officeSchedule.work_start_time || '09:00',
          work_end_time: officeSchedule.work_end_time || '17:00',
          work_days: officeSchedule.work_days || [1, 2, 3, 4, 5],
          day_schedules: officeSchedule.day_schedules,
          timezone: officeSchedule.timezone || 'UTC',
          late_threshold_minutes: officeSchedule.late_threshold_minutes || 15,
          break_start_time: officeSchedule.break_start_time,
          break_end_time: officeSchedule.break_end_time,
          work_location: 'office',
        });

      if (insertError) {
        console.error(`Error creating schedule for ${member.email}:`, insertError);
        skippedCount++;
        continue;
      }

      console.log(`Created schedule for ${member.email}`);
      createdCount++;
    }

    console.log(`Setup complete: ${createdCount} created, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        created: createdCount, 
        skipped: skippedCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in setup-employee-schedules:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
