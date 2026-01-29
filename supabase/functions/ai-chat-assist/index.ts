import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RecentMessage {
  senderName: string;
  content: string;
}

interface ContextInfo {
  type: 'space' | 'group' | 'dm';
  name: string;
  description?: string | null;
}

interface RequestBody {
  mode: 'suggest' | 'improve';
  currentText: string;
  recentMessages: RecentMessage[];
  contextInfo: ContextInfo;
  organizationId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, currentText, recentMessages, contextInfo, organizationId } = await req.json() as RequestBody;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "Organization ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build conversation context from recent messages
    const conversationHistory = recentMessages
      .slice(-20) // Limit to last 20 messages
      .map(m => `${m.senderName}: ${m.content}`)
      .join('\n');

    const chatTypeLabel = contextInfo.type === 'space' 
      ? 'team space' 
      : contextInfo.type === 'group' 
        ? 'group chat' 
        : 'direct message';

    const systemPrompt = `You are a helpful AI assistant for workplace team chat in GlobalyOS.
Your task is to ${mode === 'suggest' ? 'suggest an appropriate message to send' : 'improve the given message while preserving its intent'}.

CONTEXT:
- Chat type: ${chatTypeLabel} named "${contextInfo.name}"
${contextInfo.description ? `- Purpose: ${contextInfo.description}` : ''}

${conversationHistory ? `RECENT CONVERSATION (for context):
${conversationHistory}` : ''}

RULES:
- Keep messages concise (2-4 sentences max)
- Match the conversation's tone and style
- Be professional but friendly
- Do not use emojis unless the conversation already uses them
- Do not include greetings like "Hi" or "Hello" unless contextually appropriate
- For improvements, preserve the original intent and key points
- Return ONLY the message text, no explanations or quotes`;

    const userPrompt = mode === 'suggest'
      ? `Based on this conversation context, suggest an appropriate response that continues the discussion naturally.`
      : `Improve this message while keeping its original intent. Make it clearer and more professional:\n\n${currentText}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "";

    // Clean up the response - remove any surrounding quotes
    const cleanedText = generatedText.trim().replace(/^["']|["']$/g, '');

    return new Response(
      JSON.stringify({ text: cleanedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-chat-assist:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
