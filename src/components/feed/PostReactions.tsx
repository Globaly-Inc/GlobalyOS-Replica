/**
 * Post Reactions Component
 * Emoji reactions with toggle functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostReactionsProps {
  postId: string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '🎉', '👏', '🔥', '💯', '😂', '🤔'];

interface Reaction {
  id: string;
  emoji: string;
  employee_id: string;
}

export const PostReactions = ({ postId }: PostReactionsProps) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();

  // Fetch reactions
  const { data: reactions = [] } = useQuery({
    queryKey: ['post-reactions', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_reactions')
        .select('id, emoji, employee_id')
        .eq('post_id', postId);

      if (error) throw error;
      return data as Reaction[];
    },
    enabled: !!postId,
  });

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, Reaction[]>);

  // Toggle reaction mutation
  const toggleReaction = useMutation({
    mutationFn: async (emoji: string) => {
      if (!currentEmployee?.id || !currentOrg?.id) throw new Error('Must be logged in');

      const existingReaction = reactions.find(
        r => r.emoji === emoji && r.employee_id === currentEmployee.id
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('id', existingReaction.id);
        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase.from('post_reactions').insert({
          post_id: postId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          emoji,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-reactions', postId] });
    },
  });

  const hasReacted = (emoji: string) => {
    return reactions.some(r => r.emoji === emoji && r.employee_id === currentEmployee?.id);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-sm gap-1 rounded-full",
            hasReacted(emoji) 
              ? "bg-primary/10 hover:bg-primary/20 text-primary" 
              : "hover:bg-muted"
          )}
          onClick={() => toggleReaction.mutate(emoji)}
          disabled={toggleReaction.isPending}
        >
          <span>{emoji}</span>
          <span className="text-xs font-medium">{emojiReactions.length}</span>
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-full hover:bg-muted"
          >
            <SmilePlus className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 text-lg hover:bg-muted rounded-full",
                  hasReacted(emoji) && "bg-primary/10"
                )}
                onClick={() => toggleReaction.mutate(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
