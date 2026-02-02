/**
 * Upload Assignment File Edge Function
 * Allows public file uploads for assignment submissions using secure token verification
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, file_name, file_type, file_data } = await req.json();

    // Validate required fields
    if (!token || !file_name || !file_type || !file_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token and get assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignment_instances')
      .select('id, status, organization_id, candidate_application_id')
      .eq('secure_token', token)
      .single();

    if (assignmentError || !assignment) {
      console.error('Token verification failed:', assignmentError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check assignment status
    if (assignment.status === 'submitted' || assignment.status === 'reviewed') {
      return new Response(
        JSON.stringify({ error: 'Assignment has already been submitted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 file data
    const binaryData = Uint8Array.from(atob(file_data), c => c.charCodeAt(0));

    // Generate file path
    const filePath = `${assignment.organization_id}/assignments/${assignment.id}/${file_name}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('hiring-documents')
      .upload(filePath, binaryData, {
        contentType: file_type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signed URL for the uploaded file
    const { data: signedData } = await supabase.storage
      .from('hiring-documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

    console.log(`File uploaded: ${filePath}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: signedData?.signedUrl || filePath,
        path: filePath,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
