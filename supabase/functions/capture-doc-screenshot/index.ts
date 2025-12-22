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

    // Get project ref from supabase URL (e.g., "rygowmzkvxgnxagqlyxf" from "https://rygowmzkvxgnxagqlyxf.supabase.co")
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || 'rygowmzkvxgnxagqlyxf';

    // Determine if we need authenticated capture (two-phase navigation)
    const useAuthenticatedCapture = accessToken && refreshToken;

    // Get the effective highlight selector
    const effectiveHighlightSelector = highlightSelector || screenshot.highlight_selector;
    const effectiveAnnotation = annotation || screenshot.description;

    // Build scripts for post-navigation (privacy masks, highlights, annotations)
    let postNavigationScripts: any[] = [];
    
    // Default GlobalyOS privacy masks - always apply these for consistent privacy protection
    const defaultPrivacyMasks = [
      // Data-privacy attribute selectors (most reliable)
      { type: 'replace', selector: '[data-privacy="name"]', replacement: 'Demo User' },
      { type: 'blur', selector: '[data-privacy="avatar"]' },
      { type: 'replace', selector: '[data-privacy="email"]', replacement: 'demo@example.com' },
      
      // Employee/Team member selectors
      { type: 'replace', selector: '.employee-name, .profile-name, .team-member-name, .member-name', replacement: 'Demo User' },
      { type: 'blur', selector: '.employee-avatar, .profile-avatar, .team-member-avatar' },
      { type: 'replace', selector: '.employee-email, .user-email, .profile-email', replacement: 'demo@example.com' },
      
      // Avatar image selectors
      { type: 'blur', selector: '[data-slot="avatar-image"]' },
      { type: 'blur', selector: '.avatar img, [class*="avatar"] img, img[class*="profile"]' },
      
      // Card content selectors (EmployeeCard, etc.)
      { type: 'replace', selector: 'h3.font-bold.text-lg', replacement: 'Demo User' },
      
      // General name-like text (be careful with this one)
      { type: 'replace', selector: '[class*="name"]:not([class*="icon"]):not([class*="container"]):not([class*="file"]):not([class*="class"])', replacement: 'Demo User' },
    ];
    
    // Merge default masks with any custom ones provided
    const effectiveMasks = [
      ...defaultPrivacyMasks,
      ...(privacyMasks && Array.isArray(privacyMasks) ? privacyMasks : [])
    ];
    
    // Add privacy masking script (runs after page loads)
    const masksJson = JSON.stringify(effectiveMasks);
    postNavigationScripts.push({
      content: `
        (function() {
          const masks = ${masksJson};
          
          // Demo names for variety when replacing multiple elements
          const demoNames = ['Alex Johnson', 'Sarah Smith', 'John Doe', 'Emily Davis', 'Michael Brown', 'Jessica Wilson', 'David Lee', 'Lisa Chen'];
          let nameIndex = 0;
          
          // Apply privacy masks
          masks.forEach(mask => {
            try {
              const elements = document.querySelectorAll(mask.selector);
              elements.forEach(el => {
                if (mask.type === 'blur') {
                  el.style.filter = 'blur(8px)';
                  el.style.transition = 'none';
                } else if (mask.type === 'replace') {
                  // For name fields, use rotating demo names for variety
                  if (mask.selector.includes('name') || mask.selector.includes('Name') || mask.replacement === 'Demo User') {
                    el.textContent = demoNames[nameIndex % demoNames.length];
                    nameIndex++;
                  } else if (mask.replacement) {
                    el.textContent = mask.replacement;
                  }
                } else if (mask.type === 'hide') {
                  el.style.visibility = 'hidden';
                }
              });
            } catch (e) {
              console.log('Selector error:', mask.selector, e);
            }
          });
          
          // Additional comprehensive avatar blur
          document.querySelectorAll('img[src*="avatar"], img[src*="profile"], img[alt*="avatar"], img[alt*="profile"]').forEach(img => {
            img.style.filter = 'blur(8px)';
          });
          
          console.log('Privacy masks applied: ' + masks.length + ' rules, ' + nameIndex + ' names replaced');
        })();
      `
    });

    // Build script to inject for highlighting elements
    if (effectiveHighlightSelector) {
      postNavigationScripts.push({
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
    if (effectiveAnnotation && effectiveHighlightSelector) {
      postNavigationScripts.push({
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

    let browserlessPayload: any;

    if (useAuthenticatedCapture) {
      console.log('Using TWO-PHASE navigation for authenticated capture');
      
      // TWO-PHASE NAVIGATION STRATEGY:
      // 1. Navigate to public landing page first (to establish localStorage on correct domain)
      // 2. Inject auth tokens into localStorage
      // 3. Redirect via JavaScript to the target protected route
      // 4. Wait for the redirect to complete before taking screenshot
      
      const authInjectionScript = `
        (function() {
          try {
            // Inject Supabase auth tokens into localStorage
            const storageKey = 'sb-${projectRef}-auth-token';
            const authData = {
              access_token: '${accessToken}',
              refresh_token: '${refreshToken}',
              token_type: 'bearer',
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            };
            localStorage.setItem(storageKey, JSON.stringify(authData));
            console.log('Auth tokens injected into localStorage, redirecting to target...');
            
            // Set a flag so we know auth was injected
            window.__authInjected = true;
            
            // Now redirect to the actual target URL
            window.location.href = '${targetUrl}';
          } catch (e) {
            console.error('Failed to inject auth tokens:', e);
          }
        })();
      `;

      // Build the payload for two-phase navigation
      // Use a simpler approach: inject auth, wait for network idle, then let scripts run
      
      // Combine auth injection with a wait-for-redirect mechanism
      const combinedScript = `
        (function() {
          try {
            // Inject Supabase auth tokens into localStorage
            const storageKey = 'sb-${projectRef}-auth-token';
            const authData = {
              access_token: '${accessToken}',
              refresh_token: '${refreshToken}',
              token_type: 'bearer',
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            };
            localStorage.setItem(storageKey, JSON.stringify(authData));
            console.log('Auth tokens injected, redirecting to target...');
            
            // Redirect to the actual target URL
            window.location.replace('${targetUrl}');
          } catch (e) {
            console.error('Failed to inject auth tokens:', e);
          }
        })();
      `;

      browserlessPayload = {
        // Phase 1: Navigate to public landing page first
        url: `${appBaseUrl}/`,
        
        // Inject auth tokens and trigger redirect
        addScriptTag: [
          { content: combinedScript }
        ],
        
        // Use waitForSelector instead of waitForFunction to avoid DOM issues
        // Wait for the body to exist after navigation
        waitForSelector: {
          selector: 'body',
          timeout: 30000,
        },
        
        // Wait for the page to fully render after redirect
        waitForTimeout: 8000,
        
        viewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 2,
        },
        options: {
          type: 'png',
          fullPage: false,
        },
        gotoOptions: {
          waitUntil: 'networkidle0',
          timeout: 60000,
        },
      };

      // Add post-navigation scripts (for highlights, privacy masks, etc.)
      // These run AFTER the redirect is complete
      if (postNavigationScripts.length > 0) {
        // Wrap post-navigation scripts to run after a delay
        const delayedPostScripts = postNavigationScripts.map(script => ({
          content: `setTimeout(function() { ${script.content} }, 3000);`
        }));
        browserlessPayload.addScriptTag.push(...delayedPostScripts);
      }

    } else {
      // Non-authenticated capture - direct navigation
      console.log('Using direct navigation for non-authenticated capture');
      
      browserlessPayload = {
        url: targetUrl,
        options: {
          type: 'png',
          fullPage: false,
        },
        viewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 2,
        },
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 60000,
        },
      };

      // Add post-navigation scripts if any
      if (postNavigationScripts.length > 0) {
        browserlessPayload.addScriptTag = postNavigationScripts;
        browserlessPayload.waitForTimeout = 2000;
      }
    }

    console.log(`Browserless payload: authenticated=${useAuthenticatedCapture}, scripts=${postNavigationScripts.length}`);

    // Helper: call Browserless with retry logic for 429 errors
    const callBrowserlessWithRetry = async (payload: any, maxRetries = 3): Promise<Response> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Browserless API call attempt ${attempt}/${maxRetries}`);
        
        const response = await fetch(
          `https://chrome.browserless.io/screenshot?token=${browserlessApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        // If success or non-retryable error, return
        if (response.ok || (response.status !== 429 && response.status !== 503)) {
          return response;
        }

        // 429 Too Many Requests or 503 Service Unavailable - wait and retry
        if (attempt < maxRetries) {
          const backoffDelay = Math.min(15000 * Math.pow(2, attempt - 1), 60000);
          console.log(`Browserless rate limited (${response.status}), retrying in ${backoffDelay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          return response; // Return last failed response
        }
      }
      throw new Error('Browserless API max retries exceeded');
    };

    const browserlessResponse = await callBrowserlessWithRetry(browserlessPayload);

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
