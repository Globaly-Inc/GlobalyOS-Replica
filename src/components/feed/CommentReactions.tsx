/**
 * Comment Reactions Component
 * Displays and manages emoji reactions on comments with avatar stacking
 */

import { useState, useEffect } from 'react';
import { useCommentReactions, useToggleCommentReaction, Reaction, EMOJI_OPTIONS } from '@/services/useSocialFeed';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentReactionsProps {
  commentId: string;
  postId: string;
}

interface ReactionUser {
  id: string;
  name: string;
  avatar: string | null;
}

interface GroupedReaction {
  emoji: string;
  users: ReactionUser[];
  hasReacted: boolean;
}

const MAX_VISIBLE_AVATARS = 4;

export const CommentReactions = ({ commentId, postId }: CommentReactionsProps) => {
  const { data: reactions = [], isLoading } = useCommentReactions(commentId);
  const { data: currentEmployee } = useCurrentEmployee();
  const toggleReaction = useToggleCommentReaction();

  const [localReactions, setLocalReactions] = useState<Reaction[]>([]);
  const [reactionsKey, setReactionsKey] = useState('');

  // Only update local state when reactions data actually changes (by comparing stringified values)
  useEffect(() => {
    const newKey = JSON.stringify(reactions.map(r => ({ id: r.id, emoji: r.emoji, employee_id: r.employee_id })));
    if (newKey !== reactionsKey) {
      setReactionsKey(newKey);
      setLocalReactions(reactions);
    }
  }, [reactions, reactionsKey]);

  const groupedReactions: GroupedReaction[] = localReactions.reduce((acc, reaction) => {
    const existingGroup = acc.find(g => g.emoji === reaction.emoji);
    const user: ReactionUser = {
      id: reaction.employee_id,
      name: reaction.employee?.profiles?.full_name || 'Unknown',
      avatar: reaction.employee?.profiles?.avatar_url || null,
    };

    if (existingGroup) {
      existingGroup.users.push(user);
      if (reaction.employee_id === currentEmployee?.id) {
        existingGroup.hasReacted = true;
      }
    } else {
      acc.push({
        emoji: reaction.emoji,
        users: [user],
        hasReacted: reaction.employee_id === currentEmployee?.id,
      });
    }
    return acc;
  }, [] as GroupedReaction[]);

  const handleToggle = (emoji: string) => {
    if (!currentEmployee) return;

    // Optimistic update
    const hasExisting = localReactions.some(
      r => r.emoji === emoji && r.employee_id === currentEmployee.id
    );

    if (hasExisting) {
      setLocalReactions(prev => 
        prev.filter(r => !(r.emoji === emoji && r.employee_id === currentEmployee.id))
      );
    } else {
      const optimisticReaction: Reaction = {
        id: `temp-${Date.now()}`,
        emoji,
        employee_id: currentEmployee.id,
        employee: {
          id: currentEmployee.id,
          profiles: {
            full_name: currentEmployee.profiles?.full_name || null,
            avatar_url: currentEmployee.profiles?.avatar_url || null,
          },
        },
      };
      setLocalReactions(prev => [...prev, optimisticReaction]);
    }

    toggleReaction.mutate({ commentId, postId, emoji, existingReactions: localReactions });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {/* Existing reactions */}
      {groupedReactions.map((group) => {
        const visibleUsers = group.users.slice(0, MAX_VISIBLE_AVATARS);
        const overflowCount = group.users.length - MAX_VISIBLE_AVATARS;

        return (
          <div key={group.emoji} className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(group.emoji)}
              className={cn(
                "h-6 px-1.5 py-0 text-xs gap-1 rounded-full",
                group.hasReacted 
                  ? "bg-primary/10 hover:bg-primary/20 border border-primary/30" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <span className="text-sm">{group.emoji}</span>
              <div className="flex -space-x-1.5">
                {visibleUsers.map((user, idx) => (
                  <Avatar 
                    key={user.id + idx} 
                    className="h-4 w-4 border border-background"
                  >
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback className="text-[8px] bg-muted-foreground/20">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {overflowCount > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <span 
                      className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      +{overflowCount}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <p className="text-xs font-medium mb-2">Reacted with {group.emoji}</p>
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1.5">
                        {group.users.map((user, idx) => (
                          <div key={user.id + idx} className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.avatar || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate">{user.name}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              )}
            </Button>
          </div>
        );
      })}

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted"
                onClick={() => handleToggle(emoji)}
              >
                <span className="text-base">{emoji}</span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

