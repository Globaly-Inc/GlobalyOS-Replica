/**
 * Comment Reactions Component
 * Displays and manages emoji reactions on comments with avatar stacking
 * Features full emoji picker with search, categories, and recently used
 */

import { useState, useEffect } from 'react';
import { useCommentReactions, useToggleCommentReaction, Reaction } from '@/services/useSocialFeed';
import { QUICK_REACTION_EMOJIS } from '@/lib/emojis';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useRecentEmojis } from '@/hooks/useRecentEmojis';
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
  const { addRecentEmoji } = useRecentEmojis();

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

  // Get emojis that current user has reacted with
  const reactedEmojis = groupedReactions.filter(g => g.hasReacted).map(g => g.emoji);

  const handleToggle = (emoji: string) => {
    if (!currentEmployee) return;

    // Optimistic update
    const hasExisting = localReactions.some(
      r => r.emoji === emoji && r.employee_id === currentEmployee.id
    );

    // Track in recently used (only when adding)
    if (!hasExisting) {
      addRecentEmoji(emoji);
    }

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
            {/* Emoji button - toggles reaction */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(group.emoji)}
              className={cn(
                "h-6 px-1.5 py-0 text-xs rounded-l-full rounded-r-none border-r-0",
                group.hasReacted 
                  ? "bg-primary/10 hover:bg-primary/20 border border-primary/30" 
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <span className="text-sm">{group.emoji}</span>
            </Button>
            
            {/* Count/Avatars button - opens user list popup */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 px-1.5 py-0 text-xs gap-1 rounded-l-none rounded-r-full border-l-0",
                    group.hasReacted 
                      ? "bg-primary/10 hover:bg-primary/20 border border-primary/30" 
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {/* Mobile: Show +N count only */}
                  <span className="md:hidden text-[10px] font-medium">
                    +{group.users.length}
                  </span>
                  
                  {/* Desktop: Stacked avatars */}
                  <div className="hidden md:flex -space-x-1.5">
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
                  
                  {/* Desktop: Overflow indicator */}
                  {overflowCount > 0 && (
                    <span className="hidden md:inline text-[10px] text-muted-foreground font-medium">
                      +{overflowCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-3" align="start">
                <div className="text-xs font-medium mb-2 flex items-center gap-2 pb-2 border-b border-border">
                  <span className="text-base">{group.emoji}</span>
                  <span className="text-muted-foreground">{group.users.length} reaction{group.users.length !== 1 ? 's' : ''}</span>
                </div>
                <ScrollArea className="h-[160px]">
                  <div className="space-y-0.5 pr-3">
                    {group.users.map((user, idx) => (
                      <div key={user.id + idx} className="flex items-center gap-2 py-1.5 px-1.5 rounded-md hover:bg-muted/80 transition-colors">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar || undefined} />
                          <AvatarFallback className="text-[9px] bg-muted">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate flex-1">{user.name}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        );
      })}

      {/* Add reaction button - Full emoji picker */}
      <EmojiPicker
        onSelect={handleToggle}
        reactedEmojis={reactedEmojis}
        showSearch
        showRecent
        showCategories
        align="start"
        side="top"
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </Button>
        }
      />
    </div>
  );
};
