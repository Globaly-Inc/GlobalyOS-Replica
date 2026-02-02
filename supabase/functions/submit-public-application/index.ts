/**
 * Submit Public Application Edge Function
 * Handles job applications from anonymous users on the public careers site
 * Uses service role to bypass RLS policies
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplicationInput {
  org_code: string;
  job_id: string;
  candidate: {
    name: string;
    email: string;
    phone?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    location?: string;
  };
  cover_letter?: string;
  source_of_application?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create admin client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const input: ApplicationInput = await req.json();

    // Validate required fields
    if (!input.org_code || !input.job_id || !input.candidate?.name || !input.candidate?.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: org_code, job_id, candidate.name, candidate.email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.candidate.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize input - trim strings and limit lengths
    const sanitizedCandidate = {
      name: input.candidate.name.trim().slice(0, 200),
      email: input.candidate.email.trim().toLowerCase().slice(0, 255),
      phone: input.candidate.phone?.trim().slice(0, 50) || null,
      linkedin_url: input.candidate.linkedin_url?.trim().slice(0, 500) || null,
      portfolio_url: input.candidate.portfolio_url?.trim().slice(0, 500) || null,
      location: input.candidate.location?.trim().slice(0, 200) || null,
    };

    const sanitizedCoverLetter = input.cover_letter?.trim().slice(0, 10000) || null;

    console.log(`Processing application for org: ${input.org_code}, job: ${input.job_id}, email: ${sanitizedCandidate.email}`);

    // Step 1: Get organization by code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('code', input.org_code)
      .single();

    if (orgError || !org) {
      console.error('Organization not found:', input.org_code);
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Verify job exists, is open, and is public
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, status, is_public_visible')
      .eq('id', input.job_id)
      .eq('organization_id', org.id)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', input.job_id);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status !== 'open') {
      return new Response(
        JSON.stringify({ error: 'This position is no longer accepting applications' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!job.is_public_visible) {
      return new Response(
        JSON.stringify({ error: 'This position is not available for public applications' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Check if candidate already exists by email
    let candidateId: string;
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('organization_id', org.id)
      .eq('email', sanitizedCandidate.email)
      .maybeSingle();

    if (existingCandidate) {
      candidateId = existingCandidate.id;
      console.log(`Found existing candidate: ${candidateId}`);
      
      // Check if already applied for this job
      const { data: existingApp } = await supabase
        .from('candidate_applications')
        .select('id')
        .eq('candidate_id', candidateId)
        .eq('job_id', input.job_id)
        .maybeSingle();

      if (existingApp) {
        return new Response(
          JSON.stringify({ error: 'You have already applied for this position' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new candidate
      const { data: newCandidate, error: candError } = await supabase
        .from('candidates')
        .insert({
          organization_id: org.id,
          email: sanitizedCandidate.email,
          name: sanitizedCandidate.name,
          phone: sanitizedCandidate.phone,
          linkedin_url: sanitizedCandidate.linkedin_url,
          portfolio_url: sanitizedCandidate.portfolio_url,
          location: sanitizedCandidate.location,
          source: 'careers_site',
        })
        .select('id')
        .single();

      if (candError) {
        console.error('Error creating candidate:', candError);
        throw candError;
      }

      candidateId = newCandidate.id;
      console.log(`Created new candidate: ${candidateId}`);
    }

    // Step 4: Create the application
    const { data: application, error: appError } = await supabase
      .from('candidate_applications')
      .insert({
        organization_id: org.id,
        candidate_id: candidateId,
        job_id: input.job_id,
        stage: 'applied',
        status: 'active',
        cover_letter: sanitizedCoverLetter,
        source_of_application: input.source_of_application || 'careers_site',
      })
      .select('id')
      .single();

    if (appError) {
      console.error('Error creating application:', appError);
      throw appError;
    }

    console.log(`Created application: ${application.id}`);

    // Step 5: Log activity
    await supabase
      .from('hiring_activity_logs')
      .insert({
        organization_id: org.id,
        entity_type: 'application',
        entity_id: application.id,
        action: 'application_created',
        actor_id: null, // Public submission, no actor
        details: {
          job_title: job.title,
          candidate_name: sanitizedCandidate.name,
          source: 'careers_site',
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        application_id: application.id,
        message: 'Application submitted successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing application:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to submit application. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
