import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Module to routes mapping with role information
const MODULE_ROUTES: Record<string, { routes: { path: string; description: string; roles: string[] }[]; features: string[] }> = {
  team: {
    routes: [
      { path: '/org/:slug/team', description: 'Team overview and directory', roles: ['owner', 'admin', 'hr', 'user'] },
      { path: '/org/:slug/team/:id', description: 'Employee profile view', roles: ['owner', 'admin', 'hr', 'user'] },
      { path: '/org/:slug/settings/team', description: 'Team settings', roles: ['owner', 'admin'] },
    ],
    features: ['View team directory', 'Search and filter employees', 'View org chart', 'Access employee profiles', 'Manage team settings'],
  },
  leave: {
    routes: [
      { path: '/org/:slug/leave', description: 'Leave requests dashboard', roles: ['owner', 'admin', 'hr', 'user'] },
      { path: '/org/:slug/leave/history', description: 'Leave history', roles: ['owner', 'admin', 'hr', 'user'] },
      { path: '/org/:slug/settings/leave', description: 'Leave type settings', roles: ['owner', 'admin', 'hr'] },
    ],
    features: ['Request time off', 'View leave balance', 'Approve/reject requests', 'Configure leave types', 'View team leave calendar'],
  },
  attendance: {
    routes: [
      { path: '/org/:slug/attendance', description: 'Attendance tracking', roles: ['owner', 'admin', 'hr', 'user'] },
      { path: '/org/:slug/attendance/reports', description: 'Attendance reports', roles: ['owner', 'admin', 'hr'] },
    ],
    features: ['Check in/out', 'View attendance history', 'Track work hours', 'Generate attendance reports', 'Manage attendance policies'],
  },
  calendar: {
    routes: [
      { path: '/org/:slug/calendar', description: 'Company calendar', roles: ['owner', 'admin', 'hr', 'user'] },
    ],
    features: ['View company holidays', 'See team events', 'Manage calendar events', 'View team availability'],
  },
  kpis: {
    routes: [
      { path: '/org/:slug/kpis', description: 'KPI dashboard', roles: ['owner', 'admin', 'hr', 'user'] },
      { path: '/org/:slug/kpis/templates', description: 'KPI templates', roles: ['owner', 'admin', 'hr'] },
    ],
    features: ['Track personal KPIs', 'Update KPI progress', 'Create KPI templates', 'View team performance', 'AI-powered insights'],
  },
  okrs: {
    routes: [
      { path: '/org/:slug/okrs', description: 'OKRs management', roles: ['owner', 'admin', 'hr', 'user'] },
    ],
    features: ['Create objectives', 'Define key results', 'Track OKR progress', 'Align team goals'],
  },
  reviews: {
    routes: [
      { path: '/org/:slug/reviews', description: 'Performance reviews', roles: ['owner', 'admin', 'hr', 'user'] },
      { path: '/org/:slug/reviews/cycles', description: 'Review cycles', roles: ['owner', 'admin', 'hr'] },
    ],
    features: ['Submit self-reviews', 'Conduct peer reviews', 'Manager evaluations', 'AI-assisted review drafts', 'Review cycle management'],
  },
  wiki: {
    routes: [
      { path: '/org/:slug/wiki', description: 'Knowledge base', roles: ['owner', 'admin', 'hr', 'user'] },
    ],
    features: ['Create wiki pages', 'Organize folders', 'Set access permissions', 'Search documentation', 'AI-powered Q&A'],
  },
  chat: {
    routes: [
      { path: '/org/:slug/chat', description: 'Team chat', roles: ['owner', 'admin', 'hr', 'user'] },
    ],
    features: ['Direct messages', 'Group channels', 'File sharing', 'Reactions and mentions', 'Thread discussions'],
  },
  crm: {
    routes: [
      { path: '/org/:slug/crm', description: 'CRM dashboard', roles: ['owner', 'admin', 'user'] },
      { path: '/org/:slug/crm/contacts', description: 'Contact management', roles: ['owner', 'admin', 'user'] },
      { path: '/org/:slug/crm/deals', description: 'Deal pipeline', roles: ['owner', 'admin', 'user'] },
    ],
    features: ['Manage contacts', 'Track deals', 'Pipeline management', 'Activity logging', 'Company profiles'],
  },
  updates: {
    routes: [
      { path: '/org/:slug', description: 'Company feed', roles: ['owner', 'admin', 'hr', 'user'] },
    ],
    features: ['Post updates', 'Share wins', 'Give kudos', 'Company announcements', 'React to posts'],
  },
  settings: {
    routes: [
      { path: '/org/:slug/settings', description: 'Organization settings', roles: ['owner', 'admin'] },
      { path: '/org/:slug/settings/users', description: 'User management', roles: ['owner', 'admin'] },
    ],
    features: ['Manage organization', 'User permissions', 'Billing settings', 'Integration settings', 'Security configuration'],
  },
  general: {
    routes: [
      { path: '/org/:slug', description: 'Dashboard', roles: ['owner', 'admin', 'hr', 'user'] },
    ],
    features: ['Getting started', 'Navigation', 'Profile settings', 'Notifications', 'Mobile access'],
  },
};

// Module to category mapping for auto-assignment
const MODULE_CATEGORY_MAP: Record<string, string> = {
  team: 'getting-started',
  leave: 'hr-management',
  attendance: 'hr-management',
  kpis: 'performance',
  okrs: 'performance',
  reviews: 'performance',
  wiki: 'knowledge-base',
  crm: 'crm',
  calendar: 'collaboration',
  chat: 'collaboration',
  updates: 'collaboration',
  settings: 'admin',
  general: 'getting-started',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode = 'generate', module, categoryId, existingSlugs = [], article } = body;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Handle UPDATE mode - check if existing article needs updates
    if (mode === 'update' && article) {
      console.log(`Checking article for updates: ${article.title}`);
      
      const moduleInfo = MODULE_ROUTES[article.module];
      if (!moduleInfo) {
        return new Response(JSON.stringify({ needsUpdate: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const systemPrompt = `You are a documentation quality analyst for GlobalyOS. 
Your job is to analyze existing support documentation and determine if it needs updates based on current best practices.

Analyze the provided article and determine:
1. Is the content still accurate and relevant?
2. Does it cover all current features for this module?
3. Are the instructions clear and up-to-date?
4. Does it need better screenshots or visual aids?

Current module features: ${moduleInfo.features.join(', ')}
Current routes: ${JSON.stringify(moduleInfo.routes)}`;

      const userPrompt = `Analyze this support article and determine if it needs updates:

Title: ${article.title}
Module: ${article.module}
Content:
${article.content}

Return a JSON object with:
- needsUpdate: boolean (true if article needs updates)
- suggestedChanges: string (description of what should be changed)
- screenshotNeedsUpdate: boolean (true if screenshots should be refreshed)
- newContent: string (updated content if needsUpdate is true, otherwise omit)

Be conservative - only suggest updates if there are significant improvements needed.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content;

      if (!aiContent) {
        return new Response(JSON.stringify({ needsUpdate: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let result;
      try {
        const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
        result = JSON.parse(jsonStr);
      } catch {
        result = { needsUpdate: false };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle GENERATE mode - create new articles for a module
    if (!module) {
      return new Response(JSON.stringify({ error: 'Module is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const moduleInfo = MODULE_ROUTES[module];
    if (!moduleInfo) {
      return new Response(JSON.stringify({ error: `Unknown module: ${module}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating content for module: ${module}`);
    console.log(`Existing slugs to avoid: ${existingSlugs.length}`);

    const systemPrompt = `You are a SaaS documentation expert for GlobalyOS, a comprehensive business operating system with HRMS, CRM, Wiki, and team communication features.

Generate professional support documentation following these SaaS best practices:
1. Start with a clear overview of what the feature does and its value
2. List prerequisites and required permissions
3. Provide clear, numbered step-by-step instructions
4. Include helpful tips and best practices
5. Add common troubleshooting scenarios
6. Keep language professional but approachable

User roles in GlobalyOS (from most to least permissions):
- owner: Organization owner with full access to all features including billing
- admin: Administrative access to most features without billing access
- hr: HR-specific features (leave management, attendance, reviews, team profiles)
- user: Basic employee features (view-only or self-service)

IMPORTANT:
- For each article, accurately specify which roles can access the feature
- Use Markdown formatting with ## for sections
- Include placeholder text like [Screenshot: description] for suggested screenshots
- Write 400-600 words per article
- Be specific to GlobalyOS features and UI
- AVOID creating articles with these existing slugs: ${existingSlugs.join(', ') || 'none'}`;

    const userPrompt = `Generate 3-5 comprehensive support articles for the "${module}" module in GlobalyOS.

Module features: ${moduleInfo.features.join(', ')}
Available routes: ${JSON.stringify(moduleInfo.routes)}

IMPORTANT: Do NOT create articles with any of these existing slugs: ${existingSlugs.join(', ') || 'none'}

For each article, return a JSON object with:
- title: Clear, action-oriented title (e.g., "How to Request Leave")
- slug: URL-friendly version of title (MUST be unique - not in the existing slugs list)
- excerpt: 1-2 sentence summary (under 160 characters)
- content: Full Markdown article with step-by-step instructions
- target_roles: Array of roles that can access this feature ["owner", "admin", "hr", "user"]
- suggested_screenshots: Array of objects with { route: string, highlight_selector: string, annotation: string }

Return a valid JSON array of article objects. Each article should cover a different aspect or use case of the module.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content received from AI');
    }

    // Parse the JSON from the AI response with robust handling
    let articles;
    try {
      let jsonStr = aiContent.trim();
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // If still wrapped in code blocks without proper closing, try to find array start/end
      if (!jsonStr.startsWith('[')) {
        const arrayStart = jsonStr.indexOf('[');
        if (arrayStart !== -1) {
          jsonStr = jsonStr.substring(arrayStart);
        }
      }
      
      // Try to find the end of the array if truncated
      if (!jsonStr.endsWith(']')) {
        // Find the last complete object by looking for },
        const lastCompleteObject = jsonStr.lastIndexOf('},');
        if (lastCompleteObject !== -1) {
          jsonStr = jsonStr.substring(0, lastCompleteObject + 1) + ']';
          console.log('Truncated response detected, attempting recovery');
        } else {
          // Try finding the last complete object ending with }
          const lastBrace = jsonStr.lastIndexOf('}');
          if (lastBrace !== -1) {
            jsonStr = jsonStr.substring(0, lastBrace + 1) + ']';
            console.log('Truncated response detected, attempting recovery with single object');
          }
        }
      }
      
      articles = JSON.parse(jsonStr);
      
      if (!Array.isArray(articles)) {
        articles = [articles];
      }
      
      console.log(`Successfully parsed ${articles.length} articles from AI response`);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent.substring(0, 500) + '...');
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Get category ID from mapping if not provided
    let assignedCategoryId = categoryId;
    if (!assignedCategoryId && MODULE_CATEGORY_MAP[module]) {
      // We could look up the actual category ID here, but for now we'll leave it null
      // The frontend will handle category assignment
    }

    // Validate and enhance articles
    const processedArticles = articles
      .filter((article: any) => !existingSlugs.includes(article.slug))
      .map((article: any, index: number) => ({
        module,
        category_id: assignedCategoryId || null,
        title: article.title || `${module} Article ${index + 1}`,
        slug: article.slug || article.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `article-${index + 1}`,
        excerpt: article.excerpt || '',
        content: article.content || '',
        target_roles: Array.isArray(article.target_roles) ? article.target_roles : ['owner', 'admin', 'hr', 'user'],
        suggested_screenshots: Array.isArray(article.suggested_screenshots) ? article.suggested_screenshots : [],
        is_published: false,
        is_featured: false,
      }));

    console.log(`Generated ${processedArticles.length} new articles for ${module}`);

    return new Response(JSON.stringify({ 
      success: true, 
      articles: processedArticles,
      module,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-support-content:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
