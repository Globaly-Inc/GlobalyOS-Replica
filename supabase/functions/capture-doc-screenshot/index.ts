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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY');

    if (!browserlessApiKey) {
      throw new Error('BROWSERLESS_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { screenshotId } = await req.json();

    if (!screenshotId) {
      throw new Error('screenshotId is required');
    }

    console.log(`Starting screenshot capture for: ${screenshotId}`);

    // Fetch the screenshot record
    const { data: screenshot, error: fetchError } = await supabase
      .from('support_screenshots')
      .select('*')
      .eq('id', screenshotId)
      .single();

    if (fetchError || !screenshot) {
      throw new Error(`Screenshot record not found: ${fetchError?.message}`);
    }

    // Update status to capturing
    await supabase
      .from('support_screenshots')
      .update({ status: 'capturing', updated_at: new Date().toISOString() })
      .eq('id', screenshotId);

    // Build the full URL - use the app URL from environment or construct it
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://globalyos.app';
    const targetUrl = `${appBaseUrl}${screenshot.route_path}`;

    console.log(`Capturing screenshot of: ${targetUrl}`);

    // Call Browserless.io screenshot API
    const browserlessResponse = await fetch(
      `https://chrome.browserless.io/screenshot?token=${browserlessApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetUrl,
          options: {
            type: 'png',
            fullPage: false,
            viewport: {
              width: 1920,
              height: 1080,
              deviceScaleFactor: 2, // Retina quality
            },
          },
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout: 30000,
          },
        }),
      }
    );

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      throw new Error(`Browserless API error: ${browserlessResponse.status} - ${errorText}`);
    }

    // Get the screenshot as a buffer
    const imageBuffer = await browserlessResponse.arrayBuffer();
    const imageData = new Uint8Array(imageBuffer);

    console.log(`Screenshot captured, size: ${imageData.length} bytes`);

    // Generate storage path
    const timestamp = Date.now();
    const storagePath = `screenshots/${screenshot.module}/${screenshot.route_path.replace(/\//g, '_')}_${timestamp}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('doc_screenshots')
      .upload(storagePath, imageData, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log(`Screenshot uploaded to: ${storagePath}`);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('doc_screenshots')
      .getPublicUrl(storagePath);

    // Update the screenshot record
    const { error: updateError } = await supabase
      .from('support_screenshots')
      .update({
        storage_path: storagePath,
        status: 'completed',
        captured_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', screenshotId);

    if (updateError) {
      throw new Error(`Failed to update screenshot record: ${updateError.message}`);
    }

    console.log(`Screenshot capture completed for: ${screenshotId}`);

    return new Response(
      JSON.stringify({
        success: true,
        screenshotId,
        storagePath,
        publicUrl: urlData.publicUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Screenshot capture error:', error);

    // Try to update status to failed if we have a screenshotId
    try {
      const { screenshotId } = await req.clone().json();
      if (screenshotId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('support_screenshots')
          .update({ 
            status: 'failed', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', screenshotId);
      }
    } catch {
      // Ignore cleanup errors
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
