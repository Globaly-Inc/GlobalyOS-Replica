/**
 * Create Welcome Post Edge Function
 * Automatically creates a welcome announcement post when an organization completes onboarding
 * Includes PDF attachment of the GlobalyOS pitch deck
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomePostRequest {
  organizationId: string;
  employeeId: string;
  orgName: string;
  industry: string;
  enabledFeatures?: string[];
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { organizationId, employeeId, orgName, industry, enabledFeatures = [] }: WelcomePostRequest = await req.json();

    if (!organizationId || !employeeId || !orgName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organizationId, employeeId, orgName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-welcome-post] Creating welcome post for:', { organizationId, orgName, industry });

    // Generate welcome message content
    const content = generateWelcomeContent(orgName, industry, enabledFeatures);

    // Create the post (pinned announcement)
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        organization_id: organizationId,
        employee_id: employeeId,
        post_type: 'announcement',
        content,
        access_scope: 'company',
        is_published: true,
        is_pinned: true,
        pinned_at: new Date().toISOString(),
        pinned_by: employeeId,
      })
      .select('id')
      .single();

    if (postError) {
      console.error('[create-welcome-post] Error creating post:', postError);
      throw postError;
    }

    console.log('[create-welcome-post] Post created with ID:', post.id);

    // Try to fetch the PDF from multiple sources
    const pdfSources = [
      `${supabaseUrl}/storage/v1/object/public/static-assets/globalyos-pitch-deck.pdf`,
      'https://globalyos.lovable.app/assets/globalyos-pitch-deck.pdf',
    ];
    
    let pdfBlob: Uint8Array | null = null;
    
    for (const pdfUrl of pdfSources) {
      try {
        console.log('[create-welcome-post] Trying to fetch PDF from:', pdfUrl);
        const pdfResponse = await fetch(pdfUrl);
        
        if (pdfResponse.ok) {
          const pdfArrayBuffer = await pdfResponse.arrayBuffer();
          pdfBlob = new Uint8Array(pdfArrayBuffer);
          console.log('[create-welcome-post] PDF fetched successfully from:', pdfUrl);
          break;
        }
      } catch (err) {
        console.warn('[create-welcome-post] Failed to fetch from:', pdfUrl, err);
      }
    }
    
    if (pdfBlob) {
      try {
        // Upload PDF to post-media bucket
        const fileName = `${employeeId}/${post.id}/globalyos-pitch-deck.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.error('[create-welcome-post] Error uploading PDF:', uploadError);
        } else {
          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('post-media')
            .getPublicUrl(fileName);

          // Attach media to post
          const { error: mediaError } = await supabase.from('post_media').insert({
            post_id: post.id,
            organization_id: organizationId,
            media_type: 'pdf',
            file_url: urlData.publicUrl,
            file_name: 'GlobalyOS Pitch Deck.pdf',
            file_size: pdfBlob.length,
            sort_order: 0,
          });

          if (mediaError) {
            console.error('[create-welcome-post] Error attaching media:', mediaError);
          } else {
            console.log('[create-welcome-post] PDF attached successfully');
          }
        }
      } catch (pdfError) {
        console.error('[create-welcome-post] Error handling PDF upload:', pdfError);
      }
    } else {
      console.warn('[create-welcome-post] Could not fetch PDF from any source');
    }

    return new Response(
      JSON.stringify({ success: true, postId: post.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[create-welcome-post] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateWelcomeContent(orgName: string, industry: string, enabledFeatures: string[]): string {
  // Map industry to a friendly business category description
  const industryLabel = getIndustryLabel(industry);
  
  // Build features list based on enabled features
  const featuresList = buildFeaturesList(enabledFeatures);

  return `<p>🎉 <strong>Exciting News: ${orgName} is Now on GlobalyOS!</strong></p>

<p>We've started using GlobalyOS as our new Business Operating System. This modern platform will help ${industryLabel} like us streamline our operations and achieve greater success.</p>

<p><strong>What this means for our team:</strong></p>
${featuresList}

<p>Welcome aboard, everyone! If you have any questions or need help getting started, reach out to <a href="mailto:support@globalyos.com">support@globalyos.com</a>.</p>

<p>Let's make great things happen together! 🚀</p>`;
}

function getIndustryLabel(industry: string): string {
  const industryMap: Record<string, string> = {
    'technology': 'technology companies',
    'healthcare': 'healthcare organizations',
    'finance': 'financial services firms',
    'education': 'educational institutions',
    'retail': 'retail businesses',
    'manufacturing': 'manufacturing companies',
    'consulting': 'consulting firms',
    'marketing': 'marketing agencies',
    'real_estate': 'real estate companies',
    'legal': 'legal practices',
    'nonprofit': 'nonprofit organizations',
    'hospitality': 'hospitality businesses',
    'construction': 'construction companies',
    'media': 'media companies',
    'transportation': 'transportation companies',
    'energy': 'energy companies',
    'agriculture': 'agricultural businesses',
    'government': 'government organizations',
    'education_consultancy': 'education consultancies',
  };

  return industryMap[industry?.toLowerCase()] || 'businesses';
}

function buildFeaturesList(enabledFeatures: string[]): string {
  // Default features if none specified
  const defaultFeatures = [
    { key: 'attendance', emoji: '✅', text: 'Attendance tracking made simple with QR check-in' },
    { key: 'leave', emoji: '📅', text: 'Easy leave requests and balance tracking' },
    { key: 'team', emoji: '👥', text: 'Team directory and organizational charts' },
    { key: 'wiki', emoji: '📚', text: 'Knowledge base and documentation wiki' },
    { key: 'social', emoji: '🎉', text: 'Team celebrations and kudos' },
  ];

  const featureItems = defaultFeatures
    .filter(f => enabledFeatures.length === 0 || enabledFeatures.includes(f.key))
    .map(f => `<li>${f.emoji} ${f.text}</li>`)
    .join('\n');

  return `<ul>\n${featureItems}\n</ul>`;
}
