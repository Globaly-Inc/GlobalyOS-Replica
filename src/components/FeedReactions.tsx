import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { Smile } from "lucide-react";

const EMOJI_OPTIONS = ["👍", "❤️", "🎉", "👏", "🔥", "💯"];

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface FeedReactionsProps {
  targetType: "update" | "kudos";
  targetId: string;
}

export const FeedReactions = ({ targetType, targetId }: FeedReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentOrg } = useOrganization();

  useEffect(() => {
    loadCurrentEmployee();
    loadReactions();
  }, [targetId, currentOrg?.id]);

  const loadCurrentEmployee = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentOrg) return;

    const { data } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg.id)
      .maybeSingle();

    if (data) setCurrentEmployeeId(data.id);
  };

  const loadReactions = async () => {
    if (!currentOrg) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: employeeData } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg.id)
      .maybeSingle();

    const { data: reactionsData } = await supabase
      .from("feed_reactions")
      .select("emoji, employee_id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("organization_id", currentOrg.id);

    if (reactionsData) {
      const emojiCounts: Record<string, { count: number; hasReacted: boolean }> = {};
      
      reactionsData.forEach((r) => {
        if (!emojiCounts[r.emoji]) {
          emojiCounts[r.emoji] = { count: 0, hasReacted: false };
        }
        emojiCounts[r.emoji].count++;
        if (employeeData && r.employee_id === employeeData.id) {
          emojiCounts[r.emoji].hasReacted = true;
        }
      });

      setReactions(
        Object.entries(emojiCounts).map(([emoji, data]) => ({
          emoji,
          ...data,
        }))
      );
    }
  };

  const toggleReaction = async (emoji: string) => {
    if (!currentEmployeeId || !currentOrg || loading) return;
    setLoading(true);

    const existingReaction = reactions.find(r => r.emoji === emoji && r.hasReacted);

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from("feed_reactions")
        .delete()
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("employee_id", currentEmployeeId)
        .eq("emoji", emoji);
    } else {
      // Add reaction
      await supabase.from("feed_reactions").insert({
        target_type: targetType,
        target_id: targetId,
        employee_id: currentEmployeeId,
        emoji,
        organization_id: currentOrg.id,
      });
    }

    await loadReactions();
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => toggleReaction(reaction.emoji)}
          disabled={loading || !currentEmployeeId}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors",
            reaction.hasReacted
              ? "bg-primary/10 text-primary border border-primary/30"
              : "bg-muted hover:bg-muted/80 text-muted-foreground border border-transparent"
          )}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            disabled={!currentEmployeeId}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                disabled={loading}
                className="p-2 hover:bg-muted rounded-md transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};