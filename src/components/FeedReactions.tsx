import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { Smile } from "lucide-react";

import { QUICK_REACTION_EMOJIS } from '@/lib/emojis';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useRecentEmojis } from '@/hooks/useRecentEmojis';
const MAX_VISIBLE_AVATARS = 6;

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
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const { currentOrg } = useOrganization();

  useEffect(() => {
    loadCurrentEmployee();
    loadReactions();
  }, [targetId, currentOrg?.id]);

  // Real-time subscription for reactions
  useEffect(() => {
    if (!currentOrg?.id || !targetId) return;

    const channel = supabase
      .channel(`reactions-${targetId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_reactions",
          filter: `target_id=eq.${targetId}`,
        },
        () => {
          loadReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetId, currentOrg?.id]);

  const loadCurrentEmployee = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentOrg) return;

    const { data } = await supabase
      .from("employees")
      .select("id, profiles!inner(full_name, avatar_url)")
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg.id)
      .maybeSingle();

    if (data) {
      setCurrentEmployeeId(data.id);
      const profile = data.profiles as { full_name: string; avatar_url: string | null };
      setCurrentUserName(profile.full_name || "");
      setCurrentUserAvatar(profile.avatar_url || undefined);
    }
  };

  const loadReactions = useCallback(async () => {
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
  }, [currentOrg, targetType, targetId]);

  // Optimistic update for instant UI feedback
  const toggleReaction = async (emoji: string) => {
    if (!currentEmployeeId || !currentOrg || loading) return;
    
    const existingReaction = reactions.find(r => r.emoji === emoji && r.hasReacted);
    
    // Optimistic update - immediately update UI
    setReactions(prev => {
      const existing = prev.find(r => r.emoji === emoji);
      
      if (existingReaction) {
        // Removing reaction
        if (existing) {
          const newUsers = existing.users.filter(u => u.id !== currentEmployeeId);
          if (newUsers.length === 0) {
            return prev.filter(r => r.emoji !== emoji);
          }
          return prev.map(r => 
            r.emoji === emoji 
              ? { ...r, count: r.count - 1, hasReacted: false, users: newUsers }
              : r
          );
        }
        return prev;
      } else {
        // Adding reaction
        const newUser: ReactionUser = {
          id: currentEmployeeId,
          name: currentUserName,
          avatar: currentUserAvatar,
        };
        
        if (existing) {
          return prev.map(r =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, hasReacted: true, users: [...r.users, newUser] }
              : r
          );
        } else {
          return [...prev, { emoji, count: 1, hasReacted: true, users: [newUser] }];
        }
      }
    });

    setLoading(true);

    try {
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
    } catch (error) {
      // Revert optimistic update on error
      await loadReactions();
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {reactions.map((reaction) => (
        <div key={reaction.emoji} className="inline-flex items-center">
          <button
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
                {reaction.users.slice(0, MAX_VISIBLE_AVATARS).map((user, idx) => (
                  <Avatar 
                    key={user.id} 
                    className="h-5 w-5 border-2 border-background"
                    style={{ zIndex: reaction.users.length - idx }}
                  >
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-[8px] bg-muted">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
          </button>
          
          {/* Clickable +N overflow with member list popover */}
          {reaction.users.length > MAX_VISIBLE_AVATARS && (
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="ml-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  +{reaction.users.length - MAX_VISIBLE_AVATARS}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Reacted with {reaction.emoji}
                </p>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {reaction.users.map((user) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="text-[10px] bg-muted">
                            {user.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{user.name}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
        </div>
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
            {QUICK_REACTION_EMOJIS.map((emoji) => (
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
