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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { organization_id, trigger_type, trigger_data } = await req.json();

    if (!organization_id || !trigger_type) {
      return new Response(
        JSON.stringify({ error: "organization_id and trigger_type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch active automations matching this trigger
    const { data: automations, error: fetchErr } = await supabase
      .from("wa_automations")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("trigger_type", trigger_type)
      .eq("status", "active");

    if (fetchErr) throw fetchErr;
    if (!automations || automations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No matching automations", executed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: { automation_id: string; name: string; steps_executed: number; status: string }[] = [];

    for (const automation of automations) {
      const triggerConfig = automation.trigger_config as Record<string, unknown> || {};
      const nodes = (automation.nodes as unknown[]) || [];

      // Keyword filter: skip if keyword trigger doesn't match
      if (trigger_type === "keyword" && triggerConfig.keywords) {
        const keywords = String(triggerConfig.keywords)
          .split(",")
          .map((k: string) => k.trim().toLowerCase());
        const messageText = String(trigger_data?.message_text || "").toLowerCase();
        const matched = keywords.some((kw: string) => messageText.includes(kw));
        if (!matched) continue;
      }

      // Execute steps sequentially
      let stepsExecuted = 0;

      for (const node of nodes) {
        const step = node as Record<string, unknown>;
        const actionType = step.type as string;

        switch (actionType) {
          case "send_message": {
            // Log the action (actual sending would go through wa-send)
            await supabase.from("wa_audit_log").insert({
              organization_id,
              action: "automation_send_message",
              entity_type: "automation",
              entity_id: automation.id,
              details: {
                automation_name: automation.name,
                message: step.message || "",
                contact_id: trigger_data?.contact_id,
              },
            });
            stepsExecuted++;
            break;
          }

          case "send_template": {
            await supabase.from("wa_audit_log").insert({
              organization_id,
              action: "automation_send_template",
              entity_type: "automation",
              entity_id: automation.id,
              details: {
                automation_name: automation.name,
                template_id: step.template_id,
                contact_id: trigger_data?.contact_id,
              },
            });
            stepsExecuted++;
            break;
          }

          case "add_tag": {
            const contactId = trigger_data?.contact_id;
            const tag = String(step.tag || "");
            if (contactId && tag) {
              const { data: contact } = await supabase
                .from("wa_contacts")
                .select("tags")
                .eq("id", contactId)
                .single();

              if (contact) {
                const currentTags = (contact.tags as string[]) || [];
                if (!currentTags.includes(tag)) {
                  await supabase
                    .from("wa_contacts")
                    .update({ tags: [...currentTags, tag] })
                    .eq("id", contactId);
                }
              }
            }
            stepsExecuted++;
            break;
          }

          case "assign_agent": {
            const conversationId = trigger_data?.conversation_id;
            const agentId = step.agent_id as string;
            if (conversationId && agentId) {
              await supabase
                .from("wa_conversations")
                .update({
                  assigned_to: agentId,
                  assigned_at: new Date().toISOString(),
                  status: "assigned",
                })
                .eq("id", conversationId);
            }
            stepsExecuted++;
            break;
          }

          case "wait": {
            // In a real implementation this would schedule a delayed job.
            // For MVP we log and skip.
            stepsExecuted++;
            break;
          }

          case "send_flow": {
            const flowId = step.flow_id as string;
            if (flowId) {
              await supabase.from("wa_audit_log").insert({
                organization_id,
                action: "automation_send_flow",
                entity_type: "automation",
                entity_id: automation.id,
                details: {
                  automation_name: automation.name,
                  flow_id: flowId,
                  contact_id: trigger_data?.contact_id,
                },
              });
            }
            stepsExecuted++;
            break;
          }

          default:
            stepsExecuted++;
        }
      }

      // Log execution
      await supabase.from("wa_audit_log").insert({
        organization_id,
        action: "automation_executed",
        entity_type: "automation",
        entity_id: automation.id,
        details: {
          automation_name: automation.name,
          trigger_type,
          steps_executed: stepsExecuted,
          trigger_data,
        },
      });

      results.push({
        automation_id: automation.id,
        name: automation.name,
        steps_executed: stepsExecuted,
        status: "executed",
      });
    }

    return new Response(
      JSON.stringify({ executed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("wa-run-automation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
