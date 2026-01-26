import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmbeddingRequest {
  organization_id: string;
  source_type: string;
  source_id: string;
  title?: string;
  content: string;
  access_level: 'all' | 'self' | 'manager' | 'admin_hr' | 'owner';
  access_entities?: string[];
  metadata?: Record<string, unknown>;
  chunk_index?: number;
}

interface BatchEmbeddingRequest {
  items: EmbeddingRequest[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    
    // Handle both single and batch requests
    const items: EmbeddingRequest[] = body.items ? body.items : [body];
    
    if (items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items to embed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating embeddings for ${items.length} items`);

    const results: Array<{ success: boolean; source_id: string; error?: string }> = [];

    // Process items in batches of 10
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Generate embeddings for batch
      const textsToEmbed = batch.map(item => {
        // Combine title and content for better semantic understanding
        const fullText = item.title ? `${item.title}\n\n${item.content}` : item.content;
        // Truncate to ~8000 tokens (~32000 chars) to stay within embedding model limits
        return fullText.slice(0, 32000);
      });

      try {
        // Call Lovable AI Gateway for embeddings
        const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: textsToEmbed,
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error("Embedding API error:", errorText);
          
          // Mark all items in batch as failed
          batch.forEach(item => {
            results.push({ success: false, source_id: item.source_id, error: "Embedding generation failed" });
          });
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embeddings = embeddingData.data;

        // Store embeddings in database
        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const embedding = embeddings[j]?.embedding;

          if (!embedding) {
            results.push({ success: false, source_id: item.source_id, error: "No embedding returned" });
            continue;
          }

          // Upsert embedding record
          const { error: upsertError } = await supabase
            .from("knowledge_embeddings")
            .upsert({
              organization_id: item.organization_id,
              source_type: item.source_type,
              source_id: item.source_id,
              chunk_index: item.chunk_index || 0,
              title: item.title,
              content: item.content.slice(0, 10000), // Store truncated content
              embedding: `[${embedding.join(",")}]`, // Format as vector literal
              access_level: item.access_level,
              access_entities: item.access_entities || [],
              metadata: item.metadata || {},
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "organization_id,source_type,source_id,chunk_index",
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error("Upsert error:", upsertError);
            results.push({ success: false, source_id: item.source_id, error: upsertError.message });
          } else {
            results.push({ success: true, source_id: item.source_id });
          }
        }
      } catch (batchError) {
        console.error("Batch processing error:", batchError);
        batch.forEach(item => {
          results.push({ success: false, source_id: item.source_id, error: String(batchError) });
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Embedding complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        processed: results.length,
        successful: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate embeddings error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
