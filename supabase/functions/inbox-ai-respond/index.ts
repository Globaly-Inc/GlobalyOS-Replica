import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, organization_id, messages, mode = "draft", channel_id } = await req.json();

    if (!conversation_id || !organization_id || !messages) {
      return new Response(
        JSON.stringify({ error: "conversation_id, organization_id, and messages required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch wiki pages for RAG context (knowledge base)
    const { data: wikiPages } = await supabase
      .from("wiki_pages")
      .select("title, content")
      .eq("organization_id", organization_id)
      .limit(10);

    const knowledgeContext = wikiPages?.length
      ? wikiPages.map((p) => `## ${p.title}\n${(p.content || "").substring(0, 500)}`).join("\n\n")
      : "No knowledge base articles available.";

    const systemPrompt = `You are a helpful customer service AI assistant for a business. You respond to customer messages professionally and concisely.

KNOWLEDGE BASE (use this to answer questions):
${knowledgeContext}

RULES:
- Be friendly, professional, and concise
- If you're not confident about an answer, say so and suggest the customer speak with a human agent
- Never make up information not in the knowledge base
- For billing disputes, legal issues, or refund requests, always suggest human handoff
- Keep responses under 200 words
- Match the language the customer is using`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_reply",
              description: "Generate a customer service reply with confidence score",
              parameters: {
                type: "object",
                properties: {
                  reply: { type: "string", description: "The reply text to send to the customer" },
                  confidence: { type: "number", description: "Confidence score 0-1 for the reply quality" },
                  intent: { type: "string", description: "Detected intent: faq, pricing, hours, booking, billing_dispute, legal, refund, other" },
                  requires_human: { type: "boolean", description: "Whether this should be escalated to a human agent" },
                  citations: { type: "array", items: { type: "string" }, description: "Wiki page titles used as sources" },
                },
                required: ["reply", "confidence", "intent", "requires_human", "citations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_reply" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let result = { reply: "", confidence: 0, intent: "other", requires_human: false, citations: [] as string[] };

    // Parse tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        // Fallback to content
        result.reply = aiData.choices?.[0]?.message?.content || "I'm unable to generate a response right now.";
        result.confidence = 0.5;
      }
    }

    // Log AI event
    await supabase.from("inbox_ai_events").insert({
      organization_id,
      conversation_id,
      event_type: mode,
      inputs: { messages, mode },
      outputs: result,
      confidence: result.confidence,
      citations: result.citations,
      model_version: "google/gemini-3-flash-preview",
    });

    // Auto-send logic: if mode is "auto" and channel has auto-reply enabled
    let autoSent = false;
    if (mode === "auto" && channel_id) {
      const { data: channel } = await supabase
        .from("inbox_channels")
        .select("ai_auto_reply_enabled, ai_confidence_threshold, ai_safe_intents, ai_blocked_intents")
        .eq("id", channel_id)
        .single();

      if (channel?.ai_auto_reply_enabled) {
        const threshold = channel.ai_confidence_threshold || 0.8;
        const safeIntents = channel.ai_safe_intents || ["faq", "hours", "pricing", "booking"];
        const blockedIntents = channel.ai_blocked_intents || ["billing_dispute", "legal", "refund"];

        const intentIsSafe = safeIntents.includes(result.intent);
        const intentIsBlocked = blockedIntents.includes(result.intent);
        const meetsConfidence = result.confidence >= threshold;
        const noHumanNeeded = !result.requires_human;

        if (intentIsSafe && !intentIsBlocked && meetsConfidence && noHumanNeeded) {
          // Auto-send via inbox-send
          const sendResponse = await fetch(`${supabaseUrl}/functions/v1/inbox-send`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              conversation_id,
              organization_id,
              content: { body: result.reply },
              msg_type: "text",
            }),
          });

          autoSent = sendResponse.ok;

          // Log auto-send event
          await supabase.from("inbox_ai_events").insert({
            organization_id,
            conversation_id,
            event_type: "auto_send",
            inputs: { intent: result.intent, confidence: result.confidence },
            outputs: { reply: result.reply, sent: autoSent },
            confidence: result.confidence,
            citations: result.citations,
            model_version: "google/gemini-3-flash-preview",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ ...result, auto_sent: autoSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("inbox-ai-respond error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
