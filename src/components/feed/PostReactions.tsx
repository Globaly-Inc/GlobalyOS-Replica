/**
 * Post Reactions Component
 * Emoji reactions with toggle functionality and real-time updates
 */

import { usePostReactions, useTogglePostReaction, EMOJI_OPTIONS } from '@/services/useSocialFeed';
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

export const PostReactions = ({ postId }: PostReactionsProps) => {
  const { data: currentEmployee } = useCurrentEmployee();

  // Use centralized hooks
  const { data: reactions = [] } = usePostReactions(postId);
  const toggleReaction = useTogglePostReaction();

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, typeof reactions>);

  const hasReacted = (emoji: string) => {
    return reactions.some(r => r.emoji === emoji && r.employee_id === currentEmployee?.id);
  };

  const handleToggle = (emoji: string) => {
    toggleReaction.mutate({ postId, emoji, existingReactions: reactions });
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
          onClick={() => handleToggle(emoji)}
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
                onClick={() => handleToggle(emoji)}
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
