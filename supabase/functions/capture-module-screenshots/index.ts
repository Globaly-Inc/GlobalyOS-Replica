import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptureResult {
  routeId: string;
  routePath: string;
  featureName: string;
  status: 'created' | 'skipped' | 'error';
  screenshotId?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      module, 
      orgSlug = 'globalyhub',
      captureAll = false,
      analyzeAfterCapture = true,
      skipExisting = true,
      accessToken,
      refreshToken,
    } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Capturing screenshots for module: ${module || 'ALL'}`);

    // Get routes to capture
    let routesQuery = supabase
      .from('support_screenshot_routes')
      .select('*')
      .eq('is_active', true)
      .order('module')
      .order('flow_order', { nullsFirst: true });

    if (module && !captureAll) {
      routesQuery = routesQuery.eq('module', module);
    }

    const { data: routes, error: routesError } = await routesQuery;

    if (routesError) {
      throw new Error(`Failed to fetch routes: ${routesError.message}`);
    }

    if (!routes || routes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No routes found to capture',
          results: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${routes.length} routes to process`);

    // Get existing screenshots to avoid duplicates
    const existingPaths = new Set<string>();
    if (skipExisting) {
      const { data: existing } = await supabase
        .from('support_screenshots')
        .select('route_path')
        .in('status', ['completed', 'pending', 'capturing']);

      existing?.forEach(s => existingPaths.add(s.route_path));
    }

    const results: CaptureResult[] = [];
    const screenshotsToCapture: string[] = [];

    // Create screenshot records for each route
    for (const route of routes) {
      // Replace {slug} with actual org slug
      const routePath = route.route_template
        .replace('{slug}', orgSlug)
        .replace('{id}', 'demo')
        .replace('{pageId}', 'demo');

      // Skip if already exists
      if (existingPaths.has(routePath)) {
        results.push({
          routeId: route.id,
          routePath,
          featureName: route.feature_name,
          status: 'skipped',
        });
        continue;
      }

      // Create screenshot record
      const { data: screenshot, error: insertError } = await supabase
        .from('support_screenshots')
        .insert({
          route_path: routePath,
          description: route.description,
          module: route.module,
          highlight_selector: route.highlight_selector,
          feature_context: route.feature_name,
          flow_group: route.flow_name,
          flow_order: route.flow_order,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Failed to create screenshot record for ${routePath}:`, insertError);
        results.push({
          routeId: route.id,
          routePath,
          featureName: route.feature_name,
          status: 'error',
          error: insertError.message,
        });
        continue;
      }

      results.push({
        routeId: route.id,
        routePath,
        featureName: route.feature_name,
        status: 'created',
        screenshotId: screenshot.id,
      });

      screenshotsToCapture.push(screenshot.id);
    }

    console.log(`Created ${screenshotsToCapture.length} screenshot records`);

    // Helper: wait for screenshot completion with polling
    const waitForCompletion = async (screenshotId: string, timeoutMs = 90000): Promise<'completed' | 'failed' | 'timeout'> => {
      const startTime = Date.now();
      const pollInterval = 2000;
      
      while (Date.now() - startTime < timeoutMs) {
        const { data } = await supabase
          .from('support_screenshots')
          .select('status')
          .eq('id', screenshotId)
          .maybeSingle();
        
        if (data?.status === 'completed') return 'completed';
        if (data?.status === 'failed') return 'failed';
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      return 'timeout';
    };

    // Helper: capture with retry and exponential backoff
    const captureWithRetry = async (screenshotId: string, maxRetries = 3): Promise<boolean> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Capture attempt ${attempt}/${maxRetries} for ${screenshotId}`);
          
          const { error: captureError } = await supabase.functions.invoke('capture-doc-screenshot', {
            body: { 
              screenshotId,
              accessToken,
              refreshToken,
            },
          });

          if (!captureError) {
            const result = await waitForCompletion(screenshotId);
            if (result === 'completed') return true;
          }

          // If failed and not last attempt, retry with exponential backoff
          if (attempt < maxRetries) {
            const backoffDelay = Math.min(15000 * Math.pow(2, attempt - 1), 60000);
            console.log(`Retry in ${backoffDelay / 1000}s after attempt ${attempt}...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            
            // Reset status for retry
            await supabase
              .from('support_screenshots')
              .update({ status: 'pending', error_message: null })
              .eq('id', screenshotId);
          }
        } catch (err) {
          console.error(`Attempt ${attempt} error for ${screenshotId}:`, err);
          if (attempt < maxRetries) {
            const backoffDelay = Math.min(15000 * Math.pow(2, attempt - 1), 60000);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }
      }
      return false;
    };

    // Capture screenshots sequentially with proper delays for 1 max concurrent session
    const DELAY_BETWEEN_CAPTURES = 15000; // 15 seconds between captures
    let capturedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < screenshotsToCapture.length; i++) {
      const screenshotId = screenshotsToCapture[i];
      console.log(`Processing screenshot ${i + 1}/${screenshotsToCapture.length}: ${screenshotId}`);
      
      const success = await captureWithRetry(screenshotId);
      
      if (success) {
        capturedCount++;
        
        // Analyze after capture if enabled
        if (analyzeAfterCapture) {
          try {
            await supabase.functions.invoke('ai-analyze-screenshot', {
              body: { screenshotId },
            });
          } catch (analyzeError) {
            console.warn(`Analysis failed for ${screenshotId}:`, analyzeError);
          }
        }
      } else {
        failedCount++;
      }

      // Wait between captures to ensure Browserless session is fully released
      if (i < screenshotsToCapture.length - 1) {
        console.log(`Waiting ${DELAY_BETWEEN_CAPTURES / 1000}s before next capture...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CAPTURES));
      }
    }

    console.log(`Capture complete: ${capturedCount} successful, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: routes.length,
          created: results.filter(r => r.status === 'created').length,
          skipped: results.filter(r => r.status === 'skipped').length,
          errors: results.filter(r => r.status === 'error').length,
          captured: capturedCount,
          captureFailed: failedCount,
        },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Module capture error:', error);

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
