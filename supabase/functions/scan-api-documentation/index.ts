import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Edge function metadata - since we can't read files at runtime, we define metadata here
// This should be kept in sync with actual edge functions
const EDGE_FUNCTIONS_METADATA = [
  {
    function_name: 'invite-team-member',
    description: 'Sends an invitation email to a new team member to join the organization',
    method: 'POST',
    is_public: true,
    tags: ['auth', 'team'],
    request_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address of the invitee' },
        organizationId: { type: 'string', description: 'Organization UUID' },
        role: { type: 'string', enum: ['member', 'hr', 'admin'], description: 'Role to assign' },
      },
      required: ['email', 'organizationId'],
    },
    response_schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  },
  {
    function_name: 'send-otp',
    description: 'Sends a one-time password to the user for authentication',
    method: 'POST',
    is_public: true,
    tags: ['auth'],
    request_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'User email address' },
        type: { type: 'string', enum: ['signup', 'login', 'recovery'] },
      },
      required: ['email'],
    },
  },
  {
    function_name: 'verify-otp',
    description: 'Verifies a one-time password and completes authentication',
    method: 'POST',
    is_public: true,
    tags: ['auth'],
    request_schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        token: { type: 'string', description: '6-digit OTP code' },
      },
      required: ['email', 'token'],
    },
  },
  {
    function_name: 'notify-leave-request',
    description: 'Sends notification when a leave request is submitted',
    method: 'POST',
    is_public: true,
    tags: ['hr', 'notifications'],
  },
  {
    function_name: 'notify-leave-decision',
    description: 'Sends notification when a leave request is approved or rejected',
    method: 'POST',
    is_public: true,
    tags: ['hr', 'notifications'],
  },
  {
    function_name: 'bulk-import-employees',
    description: 'Imports multiple employees from a CSV file',
    method: 'POST',
    is_public: true,
    tags: ['hr', 'import'],
  },
  {
    function_name: 'generate-profile-summary',
    description: 'Generates an AI-powered summary of an employee profile',
    method: 'POST',
    is_public: true,
    tags: ['ai', 'profiles'],
  },
  {
    function_name: 'generate-kpi-insights',
    description: 'Generates AI insights for KPI performance data',
    method: 'POST',
    is_public: true,
    tags: ['ai', 'kpis'],
  },
  {
    function_name: 'generate-review-draft',
    description: 'Generates an AI-powered draft for performance reviews',
    method: 'POST',
    is_public: true,
    tags: ['ai', 'reviews'],
  },
  {
    function_name: 'ai-writing-assist',
    description: 'AI writing assistant for various content types',
    method: 'POST',
    is_public: true,
    tags: ['ai', 'content'],
  },
  {
    function_name: 'wiki-ask-ai',
    description: 'Ask AI questions about wiki content (requires authentication)',
    method: 'POST',
    is_public: false,
    tags: ['ai', 'wiki'],
  },
  {
    function_name: 'global-ask-ai',
    description: 'Global AI assistant that can answer questions about all organization data',
    method: 'POST',
    is_public: false,
    tags: ['ai'],
  },
  {
    function_name: 'calculate-payroll',
    description: 'Calculates payroll for employees (requires authentication)',
    method: 'POST',
    is_public: false,
    tags: ['payroll', 'hr'],
  },
  {
    function_name: 'send-push-notification',
    description: 'Sends push notifications to user devices',
    method: 'POST',
    is_public: true,
    tags: ['notifications'],
  },
  {
    function_name: 'send-attendance-report',
    description: 'Sends scheduled attendance reports via email',
    method: 'POST',
    is_public: true,
    tags: ['attendance', 'reports'],
  },
  {
    function_name: 'process-attendance-adjustments',
    description: 'Processes overtime/undertime adjustments against leave balances',
    method: 'POST',
    is_public: true,
    tags: ['attendance', 'hr'],
  },
  {
    function_name: 'capture-doc-screenshot',
    description: 'Captures screenshots of app routes for documentation',
    method: 'POST',
    is_public: false,
    tags: ['admin', 'documentation'],
  },
  {
    function_name: 'scan-api-documentation',
    description: 'Scans and updates API documentation for edge functions',
    method: 'POST',
    is_public: false,
    tags: ['admin', 'documentation'],
  },
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Scanning ${EDGE_FUNCTIONS_METADATA.length} edge functions for documentation`);

    const results = {
      scanned: 0,
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const funcMeta of EDGE_FUNCTIONS_METADATA) {
      try {
        results.scanned++;

        // Check if record exists
        const { data: existing } = await supabase
          .from('api_documentation')
          .select('id')
          .eq('function_name', funcMeta.function_name)
          .single();

        const docRecord = {
          function_name: funcMeta.function_name,
          description: funcMeta.description,
          method: funcMeta.method || 'POST',
          is_public: funcMeta.is_public,
          tags: funcMeta.tags || [],
          request_schema: funcMeta.request_schema || null,
          response_schema: funcMeta.response_schema || null,
          last_scanned_at: new Date().toISOString(),
          is_active: true,
        };

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('api_documentation')
            .update(docRecord)
            .eq('id', existing.id);

          if (error) throw error;
          results.updated++;
          console.log(`Updated: ${funcMeta.function_name}`);
        } else {
          // Insert new record
          const { error } = await supabase
            .from('api_documentation')
            .insert(docRecord);

          if (error) throw error;
          results.created++;
          console.log(`Created: ${funcMeta.function_name}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errMsg = `Error processing ${funcMeta.function_name}: ${errorMessage}`;
        console.error(errMsg);
        results.errors.push(errMsg);
      }
    }

    console.log(`Scan complete: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`);
    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API scan error:', error);

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
