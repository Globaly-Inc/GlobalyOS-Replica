/**
 * Submit Public Application Edge Function
 * Handles job applications from anonymous users on the public careers site
 * Uses service role to bypass RLS policies
 * Accepts multipart/form-data with optional resume file upload
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

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

    const contentType = req.headers.get('content-type') || '';
    
    let orgCode: string;
    let jobId: string;
    let candidateName: string;
    let candidateEmail: string;
    let candidatePhone: string | null = null;
    let candidateLinkedin: string | null = null;
    let candidatePortfolio: string | null = null;
    let candidateLocation: string | null = null;
    let coverLetter: string | null = null;
    let sourceOfApplication: string | null = null;
    let resumeFile: File | null = null;
    let additionalFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      orgCode = formData.get('org_code') as string;
      jobId = formData.get('job_id') as string;
      candidateName = formData.get('candidate_name') as string;
      candidateEmail = formData.get('candidate_email') as string;
      candidatePhone = formData.get('candidate_phone') as string || null;
      candidateLinkedin = formData.get('candidate_linkedin_url') as string || null;
      candidatePortfolio = formData.get('candidate_portfolio_url') as string || null;
      candidateLocation = formData.get('candidate_location') as string || null;
      coverLetter = formData.get('cover_letter') as string || null;
      sourceOfApplication = formData.get('source_of_application') as string || null;
      resumeFile = formData.get('resume') as File | null;
      // Collect additional files
      const allAdditional = formData.getAll('additional_files');
      for (const f of allAdditional) {
        if (f instanceof File) additionalFiles.push(f);
      }
    } else {
      // Fallback to JSON for backwards compatibility
      const input = await req.json();
      orgCode = input.org_code;
      jobId = input.job_id;
      candidateName = input.candidate?.name;
      candidateEmail = input.candidate?.email;
      candidatePhone = input.candidate?.phone || null;
      candidateLinkedin = input.candidate?.linkedin_url || null;
      candidatePortfolio = input.candidate?.portfolio_url || null;
      candidateLocation = input.candidate?.location || null;
      coverLetter = input.cover_letter || null;
      sourceOfApplication = input.source_of_application || null;
    }

    // Validate required fields
    if (!orgCode || !jobId || !candidateName || !candidateEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: org_code, job_id, candidate name, candidate email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate all files (resume + additional)
    const allFiles = resumeFile ? [resumeFile, ...additionalFiles] : [...additionalFiles];
    for (const file of allFiles) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return new Response(
          JSON.stringify({ error: `Invalid file type for "${file.name}". Allowed: PDF, DOC, DOCX, JPEG, PNG` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: `"${file.name}" exceeds 25MB limit` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Sanitize input
    const sanitizedCandidate = {
      name: candidateName.trim().slice(0, 200),
      email: candidateEmail.trim().toLowerCase().slice(0, 255),
      phone: candidatePhone?.trim().slice(0, 50) || null,
      linkedin_url: candidateLinkedin?.trim().slice(0, 500) || null,
      portfolio_url: candidatePortfolio?.trim().slice(0, 500) || null,
      location: candidateLocation?.trim().slice(0, 200) || null,
    };

    const sanitizedCoverLetter = coverLetter?.trim().slice(0, 10000) || null;

    console.log(`Processing application for org: ${orgCode}, job: ${jobId}, email: ${sanitizedCandidate.email}`);

    // Step 1: Get organization by code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('code', orgCode)
      .single();

    if (orgError || !org) {
      console.error('Organization not found:', orgCode);
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Verify job exists, is open, and is public
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, status, is_public_visible')
      .eq('id', jobId)
      .eq('organization_id', org.id)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobId);
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
        .eq('job_id', jobId)
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

    // Step 4: Upload all files (resume + additional)
    let cvFilePath: string | null = null;
    const uploadedFilePaths: string[] = [];

    const filesToUpload = resumeFile ? [resumeFile, ...additionalFiles] : [...additionalFiles];
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const fileExt = file.name.split('.').pop() || 'pdf';
      const prefix = i === 0 ? 'resume' : `portfolio-${i}`;
      const fileName = `${prefix}-${Date.now()}.${fileExt}`;
      const filePath = `${org.id}/${candidateId}/${fileName}`;

      const fileBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('hiring-documents')
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error(`Error uploading ${file.name}:`, uploadError);
      } else {
        uploadedFilePaths.push(filePath);
        if (i === 0) cvFilePath = filePath;
        console.log(`Uploaded file: ${filePath}`);
      }
    }

    // Step 5: Create the application
    const { data: application, error: appError } = await supabase
      .from('candidate_applications')
      .insert({
        organization_id: org.id,
        candidate_id: candidateId,
        job_id: jobId,
        stage: 'applied',
        status: 'active',
        cover_letter: sanitizedCoverLetter,
        cv_file_path: cvFilePath,
        custom_fields: uploadedFilePaths.length > 1
          ? { additional_files: uploadedFilePaths.slice(1) }
          : null,
        source_of_application: sourceOfApplication || 'careers_site',
      })
      .select('id')
      .single();

    if (appError) {
      console.error('Error creating application:', appError);
      throw appError;
    }

    console.log(`Created application: ${application.id}`);

    // Step 6: Log activity
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
