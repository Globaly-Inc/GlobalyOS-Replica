import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { Smile } from "lucide-react";

const EMOJI_OPTIONS = ["👍", "❤️", "🎉", "👏", "🔥", "💯"];

interface ReactionUser {
  id: string;
  name: string;
  avatar?: string;
}

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: ReactionUser[];
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
      .select(`
        emoji, 
        employee_id,
        employee:employees!feed_reactions_employee_id_fkey(
          id,
          profiles!inner(full_name, avatar_url)
        )
      `)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("organization_id", currentOrg.id);

    if (reactionsData) {
      const emojiCounts: Record<string, { count: number; hasReacted: boolean; users: ReactionUser[] }> = {};
      
      reactionsData.forEach((r: any) => {
        if (!emojiCounts[r.emoji]) {
          emojiCounts[r.emoji] = { count: 0, hasReacted: false, users: [] };
        }
        emojiCounts[r.emoji].count++;
        if (employeeData && r.employee_id === employeeData.id) {
          emojiCounts[r.emoji].hasReacted = true;
        }
        if (r.employee?.profiles) {
          emojiCounts[r.emoji].users.push({
            id: r.employee.id,
            name: r.employee.profiles.full_name,
            avatar: r.employee.profiles.avatar_url || undefined,
          });
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
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
            reaction.hasReacted
              ? "bg-primary/10 text-primary border border-primary/30"
              : "bg-muted hover:bg-muted/80 text-muted-foreground border border-transparent"
          )}
        >
          <span>{reaction.emoji}</span>
          {reaction.users.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {reaction.users.slice(0, 3).map((user, idx) => (
                <Avatar 
                  key={user.id} 
                  className="h-5 w-5 border-2 border-white dark:border-card"
                  style={{ zIndex: reaction.users.length - idx }}
                >
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-[8px] bg-muted">
                    {user.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              ))}
              {reaction.users.length > 3 && (
                <span className="ml-1 text-xs text-muted-foreground">+{reaction.users.length - 3}</span>
              )}
            </div>
          )}
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
