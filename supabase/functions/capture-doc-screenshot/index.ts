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

    // Accept session tokens from request body (OTP-based auth flow)
    const { screenshotId, highlightSelector, annotation, privacyMasks, accessToken, refreshToken } = await req.json();

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
    // Handle trailing slash in APP_BASE_URL to avoid double slashes
    let appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://globalyos.com';
    // Remove trailing slash if present
    if (appBaseUrl.endsWith('/')) {
      appBaseUrl = appBaseUrl.slice(0, -1);
    }
    const targetUrl = `${appBaseUrl}${screenshot.route_path}`;

    console.log(`Capturing screenshot of: ${targetUrl}`);

    // Use session tokens from request if provided (OTP-based auth flow)
    let sessionCookies: any[] = [];
    if (accessToken && refreshToken) {
      console.log('Using provided session tokens for authentication');
      
      // Get the domain from app base URL
      const appDomain = new URL(appBaseUrl).hostname;
      
      // Prepare cookies for Browserless
      sessionCookies = [
        {
          name: 'sb-access-token',
          value: accessToken,
          domain: appDomain,
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        },
        {
          name: 'sb-refresh-token',
          value: refreshToken,
          domain: appDomain,
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        },
      ];
    } else {
      console.log('No session tokens provided - capturing without auth');
    }

    // Get the effective highlight selector
    const effectiveHighlightSelector = highlightSelector || screenshot.highlight_selector;

    // Build script to inject for privacy masking
    let addScriptTag: any[] = [];

    // Inject auth tokens into localStorage before page loads
    if (sessionCookies.length > 0) {
      const accessToken = sessionCookies.find(c => c.name === 'sb-access-token')?.value;
      const refreshToken = sessionCookies.find(c => c.name === 'sb-refresh-token')?.value;
      
      if (accessToken && refreshToken) {
        // Get project ref from supabase URL (e.g., "rygowmzkvxgnxagqlyxf" from "https://rygowmzkvxgnxagqlyxf.supabase.co")
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || 'rygowmzkvxgnxagqlyxf';
        
        addScriptTag.push({
          content: `
            (function() {
              try {
                // Set Supabase auth tokens in localStorage
                const storageKey = 'sb-${projectRef}-auth-token';
                const authData = {
                  access_token: '${accessToken}',
                  refresh_token: '${refreshToken}',
                  token_type: 'bearer',
                  expires_in: 3600,
                  expires_at: Math.floor(Date.now() / 1000) + 3600,
                };
                localStorage.setItem(storageKey, JSON.stringify(authData));
                console.log('Auth tokens injected into localStorage');
              } catch (e) {
                console.error('Failed to inject auth tokens:', e);
              }
            })();
          `
        });
      }
    }
    
    // Add privacy masking script (runs after page loads)
    if (privacyMasks && Array.isArray(privacyMasks) && privacyMasks.length > 0) {
      const masksJson = JSON.stringify(privacyMasks);
      addScriptTag.push({
        content: `
          (function() {
            const masks = ${masksJson};
            
            // Demo names for replacement
            const demoNames = ['Alex Johnson', 'Sarah Smith', 'John Doe', 'Emily Davis', 'Michael Brown', 'Jessica Wilson'];
            let nameIndex = 0;
            
            // Apply privacy masks
            masks.forEach(mask => {
              const elements = document.querySelectorAll(mask.selector);
              elements.forEach(el => {
                if (mask.type === 'blur') {
                  el.style.filter = 'blur(8px)';
                  el.style.transition = 'none';
                } else if (mask.type === 'replace') {
                  if (mask.selector.includes('name') || mask.selector.includes('Name')) {
                    el.textContent = demoNames[nameIndex % demoNames.length];
                    nameIndex++;
                  } else if (mask.replacement) {
                    el.textContent = mask.replacement;
                  }
                } else if (mask.type === 'hide') {
                  el.style.visibility = 'hidden';
                }
              });
            });
            
            // Also apply common privacy patterns
            // Blur all avatar images
            document.querySelectorAll('.avatar img, [class*="avatar"] img, img[class*="profile"]').forEach(img => {
              img.style.filter = 'blur(8px)';
            });
            
            console.log('Privacy masks applied:', masks.length);
          })();
        `
      });
    }

    // Build script to inject for highlighting elements
    if (effectiveHighlightSelector) {
      addScriptTag.push({
        content: `
          (function() {
            // Wait for page to load
            setTimeout(() => {
              const el = document.querySelector('${effectiveHighlightSelector}');
              if (el) {
                // Add highlight styling
                el.style.outline = '3px solid #3b82f6';
                el.style.outlineOffset = '4px';
                el.style.boxShadow = '0 0 0 6px rgba(59, 130, 246, 0.25)';
                el.style.borderRadius = '4px';
                el.style.position = 'relative';
                el.style.zIndex = '9999';
                
                // Scroll element into view
                el.scrollIntoView({ behavior: 'instant', block: 'center' });
              }
            }, 1000);
          })();
        `
      });
    }

    // Add annotation overlay if provided
    const effectiveAnnotation = annotation || screenshot.description;
    if (effectiveAnnotation && effectiveHighlightSelector) {
      addScriptTag.push({
        content: `
          (function() {
            setTimeout(() => {
              const el = document.querySelector('${effectiveHighlightSelector}');
              if (el) {
                const rect = el.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.innerText = '${effectiveAnnotation.replace(/'/g, "\\'")}';
                tooltip.style.cssText = \`
                  position: fixed;
                  top: \${rect.top - 40}px;
                  left: \${rect.left}px;
                  background: #1e293b;
                  color: white;
                  padding: 8px 12px;
                  border-radius: 6px;
                  font-size: 14px;
                  font-weight: 500;
                  z-index: 10000;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  max-width: 300px;
                \`;
                document.body.appendChild(tooltip);
                
                // Add arrow
                const arrow = document.createElement('div');
                arrow.style.cssText = \`
                  position: fixed;
                  top: \${rect.top - 8}px;
                  left: \${rect.left + 16}px;
                  width: 0;
                  height: 0;
                  border-left: 8px solid transparent;
                  border-right: 8px solid transparent;
                  border-top: 8px solid #1e293b;
                  z-index: 10000;
                \`;
                document.body.appendChild(arrow);
              }
            }, 1200);
          })();
        `
      });
    }

    // Call Browserless.io screenshot API with enhanced options
    // Note: viewport is at root level, not inside options
    const browserlessPayload: any = {
      url: targetUrl,
      options: {
        type: 'png',
        fullPage: false,
      },
      viewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2, // Retina quality
      },
      gotoOptions: {
        waitUntil: 'networkidle2',
        timeout: 60000, // Increased timeout for auth
      },
    };

    // Add cookies for authentication if we have them
    if (sessionCookies.length > 0) {
      browserlessPayload.cookies = sessionCookies;
    }

    // Add script injection if we have any scripts
    if (addScriptTag.length > 0) {
      browserlessPayload.addScriptTag = addScriptTag;
      // Wait longer for scripts to execute and auth to settle
      browserlessPayload.waitFor = sessionCookies.length > 0 ? 5000 : 2000;
    }

    console.log(`Browserless payload: cookies=${sessionCookies.length}, scripts=${addScriptTag.length}`);

    const browserlessResponse = await fetch(
      `https://chrome.browserless.io/screenshot?token=${browserlessApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(browserlessPayload),
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
            error_message: errorMessage,
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
