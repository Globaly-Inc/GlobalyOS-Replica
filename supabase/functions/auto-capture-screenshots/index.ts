/**
 * Auto-capture Screenshots Edge Function
 * Orchestrates automatic screenshot capture for AI-generated articles
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestedScreenshot {
  route: string;
  description: string;
  highlight_selector?: string;
  annotation?: string;
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

    const { articleId, screenshots, module } = await req.json();

    if (!articleId) {
      throw new Error('articleId is required');
    }

    if (!screenshots || !Array.isArray(screenshots) || screenshots.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No screenshots to capture',
        captured: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting auto-capture for article ${articleId} with ${screenshots.length} screenshots`);

    const captureResults: { screenshotId: string; status: string; error?: string }[] = [];

    // Process each suggested screenshot
    for (const screenshot of screenshots as SuggestedScreenshot[]) {
      try {
        // Create screenshot record
        const { data: newScreenshot, error: insertError } = await supabase
          .from('support_screenshots')
          .insert({
            article_id: articleId,
            module: module || 'general',
            route_path: screenshot.route,
            description: screenshot.description,
            highlight_selector: screenshot.highlight_selector || null,
            status: 'pending',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create screenshot record:', insertError);
          captureResults.push({
            screenshotId: 'unknown',
            status: 'failed',
            error: insertError.message,
          });
          continue;
        }

        console.log(`Created screenshot record: ${newScreenshot.id}`);

        // Trigger capture-doc-screenshot function
        const { error: captureError } = await supabase.functions.invoke('capture-doc-screenshot', {
          body: { 
            screenshotId: newScreenshot.id,
            highlightSelector: screenshot.highlight_selector,
            annotation: screenshot.annotation,
          },
        });

        if (captureError) {
          console.error(`Capture error for ${newScreenshot.id}:`, captureError);
          captureResults.push({
            screenshotId: newScreenshot.id,
            status: 'failed',
            error: captureError.message,
          });
        } else {
          captureResults.push({
            screenshotId: newScreenshot.id,
            status: 'capturing',
          });
        }
      } catch (err) {
        console.error('Error processing screenshot:', err);
        captureResults.push({
          screenshotId: 'unknown',
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = captureResults.filter(r => r.status === 'capturing').length;
    const failedCount = captureResults.filter(r => r.status === 'failed').length;

    console.log(`Auto-capture complete: ${successCount} capturing, ${failedCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      articleId,
      captured: successCount,
      failed: failedCount,
      results: captureResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-capture error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
