/**
 * Chat Message Reactions Component
 * Emoji reactions with avatar stacking, overflow popover, and optimistic updates
 * Features full emoji picker with search, categories, and recently used
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_REACTION_EMOJIS } from '@/lib/emojis';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useRecentEmojis } from '@/hooks/useRecentEmojis';

interface ReactionUser {
  id: string;
  name: string;
  avatar?: string;
}

interface Reaction {
  emoji: string;
  users: ReactionUser[];
}

interface MessageReactionsProps {
  reactions: Record<string, Reaction>;
  currentEmployeeId: string;
  onToggleReaction: (emoji: string) => void;
  isOwn: boolean;
}

const MAX_VISIBLE_AVATARS = 4;

const MessageReactions = ({
  reactions,
  currentEmployeeId,
  onToggleReaction,
  isOwn,
}: MessageReactionsProps) => {
  const { addRecentEmoji } = useRecentEmojis();
  const reactionList = Object.values(reactions);
  
  // Local state for optimistic updates
  const [localReactions, setLocalReactions] = useState<Record<string, Reaction>>(reactions);
  
  // Sync local state with props
  useEffect(() => {
    setLocalReactions(reactions);
  }, [reactions]);
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get emojis that current user has reacted with
  const reactedEmojis = Object.values(localReactions)
    .filter(r => r.users.some(u => u.id === currentEmployeeId))
    .map(r => r.emoji);

  const handleToggle = (emoji: string) => {
    const reaction = localReactions[emoji];
    const hasReacted = reaction?.users.some(u => u.id === currentEmployeeId);
    
    // Track in recently used (only when adding)
    if (!hasReacted) {
      addRecentEmoji(emoji);
    }
    
    // Optimistic update
    if (hasReacted) {
      setLocalReactions(prev => {
        const updated = { ...prev };
        if (updated[emoji]) {
          updated[emoji] = {
            ...updated[emoji],
            users: updated[emoji].users.filter(u => u.id !== currentEmployeeId)
          };
          if (updated[emoji].users.length === 0) {
            delete updated[emoji];
          }
        }
        return updated;
      });
    } else {
      setLocalReactions(prev => {
        const updated = { ...prev };
        if (!updated[emoji]) {
          updated[emoji] = { emoji, users: [] };
        }
        updated[emoji] = {
          ...updated[emoji],
          users: [...updated[emoji].users, { id: currentEmployeeId, name: 'You' }]
        };
        return updated;
      });
    }
    
    onToggleReaction(emoji);
  };

  const localReactionList = Object.values(localReactions);

  if (localReactionList.length === 0) {
    return (
      <div className="flex items-center justify-start">
        {/* Add reaction button when no reactions exist - Full picker */}
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
              className="h-6 w-6 p-0 rounded-full hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap justify-start">
      {/* Existing reactions with avatars */}
      {localReactionList.map((reaction) => {
        const hasReacted = reaction.users.some(u => u.id === currentEmployeeId);
        
        return (
          <div key={reaction.emoji} className="flex items-center">
            {/* Emoji button - toggles reaction */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-1.5 rounded-l-full rounded-r-none transition-all border-r-0",
                hasReacted 
                  ? "bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30" 
                  : "bg-muted/60 hover:bg-muted"
              )}
              onClick={() => handleToggle(reaction.emoji)}
            >
              <span className="text-sm">{reaction.emoji}</span>
            </Button>
            
            {/* Count/Avatars button - opens user list popup */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-1.5 rounded-l-none rounded-r-full transition-all border-l-0 gap-0.5",
                    hasReacted 
                      ? "bg-primary/10 hover:bg-primary/20 ring-1 ring-primary/30" 
                      : "bg-muted/60 hover:bg-muted"
                  )}
                >
                  {/* Mobile: Show +N count only */}
                  <span className="md:hidden text-xs font-medium">
                    {reaction.users.length}
                  </span>
                  
                  {/* Desktop: Stacked avatars */}
                  <div className="hidden md:flex -space-x-1">
                    {reaction.users.slice(0, MAX_VISIBLE_AVATARS).map((user, index) => (
                      <Avatar
                        key={user.id}
                        className={cn(
                          "h-4 w-4 border border-background",
                          hasReacted && user.id === currentEmployeeId && "ring-1 ring-primary"
                        )}
                        style={{ zIndex: MAX_VISIBLE_AVATARS - index }}
                      >
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-[6px] bg-muted">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  
                  {/* Desktop: Overflow indicator */}
                  {reaction.users.length > MAX_VISIBLE_AVATARS && (
                    <span className="hidden md:inline text-[10px] text-muted-foreground font-medium ml-0.5">
                      +{reaction.users.length - MAX_VISIBLE_AVATARS}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              
              {/* Full user list popover */}
              <PopoverContent className="w-48 p-2" align="start">
                <div className="text-xs font-medium mb-2 flex items-center gap-2 pb-2 border-b border-border">
                  <span className="text-base">{reaction.emoji}</span>
                  <span className="text-muted-foreground">
                    {reaction.users.length} reaction{reaction.users.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ScrollArea className="h-[160px]">
                  <div className="space-y-0.5 pr-2">
                    {reaction.users.map(user => (
                      <div 
                        key={user.id} 
                        className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/80 transition-colors"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="text-[8px] bg-muted">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate flex-1">
                          {user.id === currentEmployeeId ? 'You' : user.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        );
      })}

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
            className="h-7 w-7 p-0 rounded-full hover:bg-muted"
          >
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        }
      />
    </div>
  );
};

export default MessageReactions;
