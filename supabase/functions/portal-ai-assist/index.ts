import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Verify staff auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const staffSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await staffSupabase.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { action, threadId, caseId, organizationId } = await req.json();

    if (!action || !organizationId) {
      return jsonResponse({ error: 'action and organizationId required' }, 400);
    }

    // Verify staff is org member
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();
    if (!membership) return jsonResponse({ error: 'Not an org member' }, 403);

    // Check AI is available
    if (!lovableApiKey) {
      return jsonResponse({ error: 'AI service not configured' }, 503);
    }

    // Gather context based on action
    let context = '';
    let messages: any[] = [];

    if (caseId) {
      const { data: caseData } = await supabase
        .from('client_cases').select('*').eq('id', caseId).single();
      if (caseData) {
        context += `\nCase: ${caseData.title}\nStatus: ${caseData.status}\nPriority: ${caseData.priority}\n`;
        if (caseData.description) context += `Description: ${caseData.description}\n`;
      }

      const { data: statusHistory } = await supabase
        .from('client_case_status_history').select('status, note, created_at')
        .eq('case_id', caseId).eq('client_visible', true).order('created_at', { ascending: true }).limit(20);
      if (statusHistory?.length) {
        context += '\nStatus Timeline:\n' + statusHistory.map(
          (h: any) => `- ${h.status}${h.note ? ': ' + h.note : ''} (${new Date(h.created_at).toLocaleDateString()})`
        ).join('\n');
      }
    }

    if (threadId) {
      const { data: threadMessages } = await supabase
        .from('client_messages').select('sender_type, message, created_at')
        .eq('thread_id', threadId).order('created_at', { ascending: true }).limit(50);
      if (threadMessages?.length) {
        messages = threadMessages;
        context += '\nConversation:\n' + threadMessages.map(
          (m: any) => `[${m.sender_type}]: ${m.message}`
        ).join('\n');
      }
    }

    // Get knowledge sources
    const { data: knowledgeSources } = await supabase
      .from('ai_content_index')
      .select('title, content')
      .eq('organization_id', organizationId)
      .limit(10);
    
    let knowledgeContext = '';
    if (knowledgeSources?.length) {
      knowledgeContext = '\n\nRelevant Knowledge Base:\n' + knowledgeSources.map(
        (k: any) => `--- ${k.title} ---\n${k.content?.substring(0, 500)}`
      ).join('\n\n');
    }

    // Build prompt based on action
    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'draft_reply':
        systemPrompt = `You are a helpful professional assistant for a business portal. Draft a reply to the client's latest message based on the case context and knowledge base. Be professional, empathetic, and concise. Never include PII or sensitive internal information. Always answer based on the provided context.`;
        userPrompt = `Based on the following case context and conversation, draft a professional reply to the client's latest message.\n\n${context}${knowledgeContext}\n\nDraft a helpful reply:`;
        break;

      case 'summarize':
        systemPrompt = `You are a professional assistant. Summarize the conversation thread highlighting key points, pending actions, and client sentiment.`;
        userPrompt = `Summarize this conversation thread:\n\n${context}\n\nProvide a concise summary with key points, action items, and overall sentiment:`;
        break;

      case 'extract_actions':
        systemPrompt = `You are a professional assistant. Extract actionable next steps from the conversation, categorizing them as client actions or staff actions.`;
        userPrompt = `Extract next steps from this conversation:\n\n${context}\n\nList action items as JSON: { "client_actions": [...], "staff_actions": [...] }`;
        break;

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return jsonResponse({ error: 'AI rate limit exceeded. Try again later.' }, 429);
      if (status === 402) return jsonResponse({ error: 'AI credits exhausted.' }, 402);
      return jsonResponse({ error: 'AI service error' }, 500);
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content || '';

    // Log interaction
    const sourcesUsed = knowledgeSources?.map((k: any) => ({ title: k.title })) || [];
    await supabase.from('client_ai_interactions').insert({
      organization_id: organizationId,
      thread_id: threadId,
      case_id: caseId,
      interaction_type: action,
      prompt_summary: userPrompt.substring(0, 500),
      response: responseContent,
      sources_used: sourcesUsed,
      confidence_score: 0.85, // Placeholder
      was_sent_to_client: false,
    });

    return jsonResponse({
      response: responseContent,
      sources: sourcesUsed,
      action,
    });

  } catch (error) {
    console.error('Portal AI assist error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
