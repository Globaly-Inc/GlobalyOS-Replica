import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, currentText, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "win":
        systemPrompt = `You are a helpful writing assistant for workplace wins and achievements. 
Your task is to help write or improve a brief, professional, and celebratory message about a work achievement.
Keep the tone positive, humble yet proud, and engaging. Use 2-4 sentences maximum.
Do not use emojis. Be concise and impactful.`;
        userPrompt = currentText 
          ? `Please improve and polish this win announcement while keeping its core message:\n\n"${currentText}"\n\nMake it more engaging and professional.`
          : `Write a brief, engaging announcement about a work achievement. ${context || "The user hasn't provided specific details, so write a general template they can customize about completing a project or reaching a milestone."}`;
        break;
        
      case "announcement":
        systemPrompt = `You are a helpful writing assistant for workplace announcements.
Your task is to help write or improve a clear, professional announcement for the team.
Keep the tone informative, friendly, and professional. Use 2-4 sentences maximum.
Do not use emojis. Be clear and direct.`;
        userPrompt = currentText
          ? `Please improve and polish this announcement while keeping its core message:\n\n"${currentText}"\n\nMake it clearer and more professional.`
          : `Write a brief, professional team announcement. ${context || "The user hasn't provided specific details, so write a general template about an upcoming change or update."}`;
        break;
        
      case "kudos":
        systemPrompt = `You are a helpful writing assistant for workplace recognition and appreciation messages.
Your task is to help write or improve a heartfelt, genuine message of appreciation for a colleague.
Keep the tone warm, specific, and sincere. Use 2-3 sentences maximum.
Do not use emojis. Focus on specific contributions or qualities.`;
      userPrompt = currentText
          ? `Please improve and polish this kudos message while keeping its core sentiment:\n\n"${currentText}"\n\nMake it more heartfelt and specific.`
          : `Write a brief, genuine appreciation message for a colleague. ${context || "The user hasn't provided specific details, so write a template about thanking someone for their help or great work."}`;
        break;

      case "social":
        systemPrompt = `You are a helpful writing assistant for workplace social posts.
Your task is to help write or improve a friendly, engaging social post for colleagues.
Keep the tone conversational, positive, and professional. Use 2-4 sentences maximum.
Do not use emojis. Be relatable and engaging.`;
        userPrompt = currentText
          ? `Please improve and polish this social post while keeping its core message:\n\n"${currentText}"\n\nMake it more engaging and relatable.`
          : `Write a brief, friendly social post for colleagues. ${context || "The user hasn't provided specific details, so write a general template about sharing an update, thought, or question with the team."}`;
        break;
        
      default:
        throw new Error("Invalid type specified");
    }

    console.log(`AI Writing Assist - Type: ${type}, Has current text: ${!!currentText}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
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
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate text");
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim() || "";

    console.log(`AI Writing Assist - Generated ${generatedText.length} characters`);

    return new Response(
      JSON.stringify({ text: generatedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Writing Assist error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
