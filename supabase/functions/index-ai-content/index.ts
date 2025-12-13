import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse optional organization_id from request body
    let targetOrgId: string | null = null;
    try {
      const body = await req.json();
      targetOrgId = body.organization_id || null;
    } catch {
      // No body or invalid JSON, index all organizations
    }

    // Fetch organizations to index
    let orgsQuery = supabase.from("organizations").select("id, name");
    if (targetOrgId) {
      orgsQuery = orgsQuery.eq("id", targetOrgId);
    }
    
    const { data: organizations, error: orgsError } = await orgsQuery;
    
    if (orgsError) {
      console.error("Error fetching organizations:", orgsError);
      throw orgsError;
    }

    const results: { orgId: string; orgName: string; indexed: number; errors: number }[] = [];

    for (const org of organizations || []) {
      let indexedCount = 0;
      let errorCount = 0;

      try {
        // Update status to running
        await supabase
          .from("ai_indexing_status")
          .upsert({
            organization_id: org.id,
            status: "running",
            updated_at: new Date().toISOString()
          }, { onConflict: "organization_id" });

        // 1. Index Wiki Pages
        const { data: wikiPages } = await supabase
          .from("wiki_pages")
          .select("id, title, content, access_scope, folder_id, updated_at")
          .eq("organization_id", org.id);

        for (const page of wikiPages || []) {
          try {
            const plainContent = page.content?.replace(/<[^>]*>/g, "") || "";
            
            await supabase.from("ai_content_index").upsert({
              organization_id: org.id,
              content_type: "wiki",
              source_id: page.id,
              source_table: "wiki_pages",
              title: page.title,
              content: plainContent.substring(0, 10000),
              access_scope: page.access_scope || "company",
              metadata: { folder_id: page.folder_id },
              last_updated: page.updated_at || new Date().toISOString()
            }, { onConflict: "organization_id,source_table,source_id" });
            
            indexedCount++;
          } catch (e) {
            console.error("Error indexing wiki page:", e);
            errorCount++;
          }
        }

        // 2. Index Chat Messages (last 30 days, summarized per conversation/space)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: chatMessages } = await supabase
          .from("chat_messages")
          .select("id, content, conversation_id, space_id, created_at")
          .eq("organization_id", org.id)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(500);

        // Group messages by conversation/space for indexing
        const conversationMessages: Record<string, string[]> = {};
        const spaceMessages: Record<string, string[]> = {};

        for (const msg of chatMessages || []) {
          const plainContent = msg.content?.replace(/<[^>]*>/g, "") || "";
          if (msg.conversation_id) {
            if (!conversationMessages[msg.conversation_id]) {
              conversationMessages[msg.conversation_id] = [];
            }
            conversationMessages[msg.conversation_id].push(plainContent);
          } else if (msg.space_id) {
            if (!spaceMessages[msg.space_id]) {
              spaceMessages[msg.space_id] = [];
            }
            spaceMessages[msg.space_id].push(plainContent);
          }
        }

        // Index conversation summaries
        for (const [convId, messages] of Object.entries(conversationMessages)) {
          try {
            await supabase.from("ai_content_index").upsert({
              organization_id: org.id,
              content_type: "chat",
              source_id: convId,
              source_table: "chat_conversations",
              title: "Direct Message Thread",
              content: messages.slice(0, 50).join("\n").substring(0, 5000),
              access_scope: "members",
              metadata: { conversation_id: convId },
              last_updated: new Date().toISOString()
            }, { onConflict: "organization_id,source_table,source_id" });
            
            indexedCount++;
          } catch (e) {
            errorCount++;
          }
        }

        // Index space summaries
        for (const [spaceId, messages] of Object.entries(spaceMessages)) {
          try {
            const { data: space } = await supabase
              .from("chat_spaces")
              .select("name, access_type")
              .eq("id", spaceId)
              .single();

            await supabase.from("ai_content_index").upsert({
              organization_id: org.id,
              content_type: "chat",
              source_id: spaceId,
              source_table: "chat_spaces",
              title: space?.name || "Space",
              content: messages.slice(0, 50).join("\n").substring(0, 5000),
              access_scope: space?.access_type === "public" ? "company" : "members",
              metadata: { space_id: spaceId },
              last_updated: new Date().toISOString()
            }, { onConflict: "organization_id,source_table,source_id" });
            
            indexedCount++;
          } catch (e) {
            errorCount++;
          }
        }

        // 3. Index Employees (public info only)
        const { data: employees } = await supabase
          .from("employees")
          .select(`
            id, position, department, office_id, updated_at,
            profiles!inner(full_name),
            offices(name)
          `)
          .eq("organization_id", org.id)
          .eq("status", "active");

        for (const emp of employees || []) {
          try {
            const profile = emp.profiles as any;
            const office = emp.offices as any;
            
            await supabase.from("ai_content_index").upsert({
              organization_id: org.id,
              content_type: "employee",
              source_id: emp.id,
              source_table: "employees",
              title: profile?.full_name || "Employee",
              content: `${profile?.full_name || ""} works as ${emp.position} in the ${emp.department} department${office?.name ? ` at ${office.name} office` : ""}.`,
              access_scope: "company",
              metadata: { department: emp.department, office_id: emp.office_id },
              last_updated: emp.updated_at || new Date().toISOString()
            }, { onConflict: "organization_id,source_table,source_id" });
            
            indexedCount++;
          } catch (e) {
            errorCount++;
          }
        }

        // 4. Index Updates/Announcements
        const { data: updates } = await supabase
          .from("updates")
          .select("id, type, content, created_at")
          .eq("organization_id", org.id)
          .in("type", ["announcement", "win"])
          .gte("created_at", thirtyDaysAgo.toISOString());

        for (const update of updates || []) {
          try {
            const plainContent = update.content?.replace(/<[^>]*>/g, "") || "";
            
            await supabase.from("ai_content_index").upsert({
              organization_id: org.id,
              content_type: update.type,
              source_id: update.id,
              source_table: "updates",
              title: update.type === "announcement" ? "Announcement" : "Team Win",
              content: plainContent.substring(0, 5000),
              access_scope: "company",
              metadata: { type: update.type },
              last_updated: update.created_at
            }, { onConflict: "organization_id,source_table,source_id" });
            
            indexedCount++;
          } catch (e) {
            errorCount++;
          }
        }

        // Update status to completed
        await supabase
          .from("ai_indexing_status")
          .upsert({
            organization_id: org.id,
            status: "completed",
            last_full_index: new Date().toISOString(),
            last_wiki_index: new Date().toISOString(),
            last_chat_index: new Date().toISOString(),
            last_team_index: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: "organization_id" });

        results.push({
          orgId: org.id,
          orgName: org.name,
          indexed: indexedCount,
          errors: errorCount
        });

      } catch (orgError) {
        console.error(`Error indexing org ${org.id}:`, orgError);
        
        // Update status to failed
        await supabase
          .from("ai_indexing_status")
          .upsert({
            organization_id: org.id,
            status: "failed",
            updated_at: new Date().toISOString()
          }, { onConflict: "organization_id" });

        results.push({
          orgId: org.id,
          orgName: org.name,
          indexed: indexedCount,
          errors: errorCount + 1
        });
      }
    }

    console.log("Indexing complete:", results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in index-ai-content:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
