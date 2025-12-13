import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

const MessageReactions = ({
  reactions,
  currentEmployeeId,
  onToggleReaction,
  isOwn,
}: MessageReactionsProps) => {
  const reactionList = Object.values(reactions);
  
  if (reactionList.length === 0) return null;

  return (
    <div className={cn(
      "flex flex-wrap gap-1 mt-1",
      isOwn ? "justify-end" : "justify-start"
    )}>
      <TooltipProvider>
        {reactionList.map((reaction) => {
          const hasReacted = reaction.users.some(u => u.id === currentEmployeeId);
          const userNames = reaction.users.map(u => u.name).join(", ");

          return (
            <Tooltip key={reaction.emoji}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 px-2 py-0 text-xs gap-1 rounded-full",
                    hasReacted 
                      ? "bg-primary/10 hover:bg-primary/20 border border-primary/30" 
                      : "bg-muted hover:bg-muted/80"
                  )}
                  onClick={() => onToggleReaction(reaction.emoji)}
                >
                  <span className="text-sm">{reaction.emoji}</span>
                  <span className="font-medium">{reaction.users.length}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{userNames}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
};

export default MessageReactions;
