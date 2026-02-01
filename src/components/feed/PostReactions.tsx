/**
 * Post Reactions Component
 * Emoji reactions with avatar stacking, overflow popover, and optimistic updates
 * Features full emoji picker with search, categories, and recently used
 */

import { useState, useEffect } from 'react';
import { usePostReactions, useTogglePostReaction, Reaction } from '@/services/useSocialFeed';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useRecentEmojis } from '@/hooks/useRecentEmojis';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ProfileStack } from '@/components/ui/ProfileStack';
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
  const { addRecentEmoji } = useRecentEmojis();
  
  // Local state for optimistic updates
  const [localReactions, setLocalReactions] = useState<Reaction[]>([]);
  
  // Sync local state with server data
  useEffect(() => {
    setLocalReactions(reactions);
  }, [reactions]);

  // Group reactions by emoji with user details - include ALL used emojis, not just quick reactions
  const groupedReactions: GroupedReaction[] = (() => {
    const usedEmojis = new Set(localReactions.map(r => r.emoji));
    return Array.from(usedEmojis).map(emoji => {
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
    });
  })();

  // Get emojis that current user has reacted with
  const reactedEmojis = localReactions
    .filter(r => r.employee_id === currentEmployee?.id)
    .map(r => r.emoji);

  const handleToggle = (emoji: string) => {
    if (!currentEmployee?.id) return;
    
    const hasReacted = localReactions.some(
      r => r.emoji === emoji && r.employee_id === currentEmployee.id
    );
    
    // Track in recently used (only when adding)
    if (!hasReacted) {
      addRecentEmoji(emoji);
    }
    
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
        <div key={emoji} className="flex items-center">
          {/* Emoji button - toggles reaction */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 rounded-l-full rounded-r-none transition-all border-r-0",
              hasCurrentUser 
                ? "bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30" 
                : "hover:bg-muted"
            )}
            onClick={() => handleToggle(emoji)}
            disabled={toggleReaction.isPending}
          >
            <span className="text-base">{emoji}</span>
          </Button>
          
          {/* Count/Avatars button - opens user list popup */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-2 rounded-l-none rounded-r-full transition-all border-l-0 gap-1",
                  hasCurrentUser 
                    ? "bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30" 
                    : "hover:bg-muted"
                )}
              >
                {/* Mobile: Show +N count only */}
                <span className="md:hidden text-xs font-medium">
                  +{users.length}
                </span>
                
                {/* Desktop: Stacked avatars using ProfileStack */}
                <ProfileStack
                  users={users}
                  size="sm"
                  maxVisible={MAX_VISIBLE_AVATARS}
                  highlightUserId={currentEmployee?.id}
                  showPopover={false}
                  mobileShowCount={false}
                  className="hidden md:flex"
                />
              </Button>
            </PopoverTrigger>
            
            {/* Full user list popover - reuse ProfileStack popover pattern */}
            <PopoverContent className="w-56 p-3" align="start">
              <div className="text-sm font-medium mb-2 flex items-center gap-2 pb-2 border-b border-border">
                <span className="text-lg">{emoji}</span>
                <span className="text-muted-foreground">{users.length} reaction{users.length !== 1 ? 's' : ''}</span>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-0.5 pr-3">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center gap-2.5 py-1.5 px-1.5 rounded-md hover:bg-muted/80 transition-colors">
                      <ProfileStack
                        users={[user]}
                        size="md"
                        showPopover={false}
                        mobileShowCount={false}
                      />
                      <span className="text-sm truncate flex-1">
                        {user.id === currentEmployee?.id ? 'You' : user.name}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      ))}

      {/* Add reaction button - Full emoji picker with search & categories */}
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
            className="h-8 w-8 p-0 rounded-full hover:bg-muted"
          >
            <SmilePlus className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      />
    </div>
  );
};
