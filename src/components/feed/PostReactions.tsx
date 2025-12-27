/**
 * Post Reactions Component
 * Emoji reactions with avatar stacking, overflow popover, and optimistic updates
 */

import { useState, useEffect } from 'react';
import { usePostReactions, useTogglePostReaction, EMOJI_OPTIONS, Reaction } from '@/services/useSocialFeed';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostReactionsProps {
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
  hasCurrentUser: boolean;
}

const MAX_VISIBLE_AVATARS = 6;

export const PostReactions = ({ postId }: PostReactionsProps) => {
  const { data: currentEmployee } = useCurrentEmployee();
  const { data: reactions = [] } = usePostReactions(postId);
  const toggleReaction = useTogglePostReaction();
  
  // Local state for optimistic updates
  const [localReactions, setLocalReactions] = useState<Reaction[]>([]);
  
  // Sync local state with server data
  useEffect(() => {
    setLocalReactions(reactions);
  }, [reactions]);

  // Group reactions by emoji with user details
  const groupedReactions: GroupedReaction[] = EMOJI_OPTIONS.map(emoji => {
    const emojiReactions = localReactions.filter(r => r.emoji === emoji);
    return {
      emoji,
      users: emojiReactions.map(r => ({
        id: r.employee_id,
        name: r.employee?.profiles?.full_name || 'Unknown',
        avatar: r.employee?.profiles?.avatar_url || null,
      })),
      hasCurrentUser: emojiReactions.some(r => r.employee_id === currentEmployee?.id),
    };
  }).filter(g => g.users.length > 0);

  const handleToggle = (emoji: string) => {
    if (!currentEmployee?.id) return;
    
    const hasReacted = localReactions.some(
      r => r.emoji === emoji && r.employee_id === currentEmployee.id
    );
    
    // Optimistic update
    if (hasReacted) {
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
    
    toggleReaction.mutate({ postId, emoji, existingReactions: reactions });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Existing reactions with avatars */}
      {groupedReactions.map(({ emoji, users, hasCurrentUser }) => (
        <Popover key={emoji}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2 gap-1 rounded-full transition-all",
                hasCurrentUser 
                  ? "bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30" 
                  : "hover:bg-muted"
              )}
              onClick={(e) => {
                e.preventDefault();
                handleToggle(emoji);
              }}
              disabled={toggleReaction.isPending}
            >
              <span className="text-base">{emoji}</span>
              
              {/* Mobile: Show +N count only */}
              <span className="md:hidden text-xs font-medium">
                +{users.length}
              </span>
              
              {/* Desktop: Stacked avatars */}
              <div className="hidden md:flex -space-x-1.5">
                {users.slice(0, MAX_VISIBLE_AVATARS).map((user, index) => (
                  <Avatar
                    key={user.id}
                    className={cn(
                      "h-5 w-5 border-2 border-background",
                      hasCurrentUser && user.id === currentEmployee?.id && "ring-1 ring-primary"
                    )}
                    style={{ zIndex: MAX_VISIBLE_AVATARS - index }}
                  >
                    <AvatarImage src={user.avatar || undefined} alt={user.name} />
                    <AvatarFallback className="text-[8px] bg-muted">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              
              {/* Desktop: Overflow indicator */}
              {users.length > MAX_VISIBLE_AVATARS && (
                <span className="hidden md:inline text-xs text-muted-foreground font-medium ml-0.5">
                  +{users.length - MAX_VISIBLE_AVATARS}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          
          {/* Full user list popover */}
          <PopoverContent className="w-48 p-2" align="start">
            <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <span className="text-lg">{emoji}</span>
              <span className="text-muted-foreground">{users.length} reaction{users.length !== 1 ? 's' : ''}</span>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {users.map(user => (
                  <div key={user.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar || undefined} alt={user.name} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">
                      {user.id === currentEmployee?.id ? 'You' : user.name}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      ))}

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-muted"
          >
            <SmilePlus className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1 flex-wrap max-w-[200px]">
            {EMOJI_OPTIONS.map(emoji => {
              const hasReacted = localReactions.some(
                r => r.emoji === emoji && r.employee_id === currentEmployee?.id
              );
              return (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 text-lg hover:bg-muted rounded-full",
                    hasReacted && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                  onClick={() => handleToggle(emoji)}
                >
                  {emoji}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
