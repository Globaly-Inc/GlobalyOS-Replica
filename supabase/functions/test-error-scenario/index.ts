import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  testType: 'edge_function' | 'network_request';
  functionName?: string;
  originalMethod?: string;
  url?: string;
  method?: string;
}

interface TestResponse {
  success: boolean;
  status?: number;
  responseTime: number;
  error?: string;
  details?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: TestRequest = await req.json();
    console.log('Test request received:', body);

    if (body.testType === 'edge_function' && body.functionName) {
      // Test an edge function by making a health check request
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/${body.functionName}`;
      console.log(`Testing edge function: ${functionUrl}`);

      try {
        // Make a test request to the function
        // We use OPTIONS or a minimal POST to avoid side effects
        const testMethod = body.originalMethod === 'GET' ? 'GET' : 'POST';
        const testBody = testMethod === 'POST' ? JSON.stringify({ _test: true, _healthCheck: true }) : undefined;

        const response = await fetch(functionUrl, {
          method: testMethod,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: testBody,
        });

        const responseTime = Date.now() - startTime;

        // Check if the function is accessible
        // A 4xx or 5xx error indicates the function is having issues
        // A 2xx or even a controlled error response means it's working
        const success = response.status >= 200 && response.status < 500;

        let details: string | undefined;
        try {
          const responseText = await response.text();
          if (responseText.length < 500) {
            details = responseText;
          }
        } catch {
          // Ignore response parsing errors
        }

        const result: TestResponse = {
          success,
          status: response.status,
          responseTime,
          details,
        };

        if (!success) {
          result.error = `Function returned status ${response.status}`;
        }

        console.log('Edge function test result:', result);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchError) {
        console.error('Edge function test failed:', fetchError);
        return new Response(JSON.stringify({
          success: false,
          responseTime: Date.now() - startTime,
          error: fetchError instanceof Error ? fetchError.message : 'Failed to reach edge function',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (body.testType === 'network_request' && body.url) {
      // Test a network endpoint
      console.log(`Testing network endpoint: ${body.url}`);

      try {
        // Only test if it's a same-origin or safe URL
        const url = new URL(body.url);
        
        // Security: Only allow testing Supabase URLs or relative URLs
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        if (!body.url.startsWith(supabaseUrl) && !url.hostname.includes('supabase')) {
          return new Response(JSON.stringify({
            success: false,
            responseTime: Date.now() - startTime,
            error: 'For security, only Supabase endpoints can be tested automatically',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const response = await fetch(body.url, {
          method: body.method || 'HEAD', // Use HEAD to avoid side effects
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
        });

        const responseTime = Date.now() - startTime;
        const success = response.status >= 200 && response.status < 400;

        const result: TestResponse = {
          success,
          status: response.status,
          responseTime,
        };

        if (!success) {
          result.error = `Endpoint returned status ${response.status}`;
        }

        console.log('Network test result:', result);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchError) {
        console.error('Network test failed:', fetchError);
        return new Response(JSON.stringify({
          success: false,
          responseTime: Date.now() - startTime,
          error: fetchError instanceof Error ? fetchError.message : 'Failed to reach endpoint',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Unsupported test type
    return new Response(JSON.stringify({
      success: false,
      responseTime: Date.now() - startTime,
      error: 'Invalid test type or missing parameters',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test error scenario failed:', error);
    return new Response(JSON.stringify({
      success: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
