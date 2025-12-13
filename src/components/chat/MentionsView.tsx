import { AtSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMentionedMessages } from "@/services/useChat";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ActiveChat } from "@/types/chat";

interface MentionsViewProps {
  onNavigateToChat: (chat: ActiveChat) => void;
}

const MentionsView = ({ onNavigateToChat }: MentionsViewProps) => {
  const { data: messages = [], isLoading } = useMentionedMessages();

  const handleMessageClick = (message: any) => {
    if (message.conversation_id && message.conversation) {
      onNavigateToChat({
        type: 'conversation',
        id: message.conversation_id,
        name: message.conversation.name || 'Conversation',
        isGroup: message.conversation.is_group
      });
    } else if (message.space_id && message.space) {
      onNavigateToChat({
        type: 'space',
        id: message.space_id,
        name: message.space.name
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getChatName = (message: any) => {
    if (message.conversation) {
      return message.conversation.name || (message.conversation.is_group ? 'Group Chat' : 'Direct Message');
    }
    if (message.space) {
      return message.space.name;
    }
    return 'Unknown';
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
          <AtSign className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Mentions</h2>
          <p className="text-sm text-muted-foreground">Messages where you were mentioned</p>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <AtSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No mentions yet</p>
              <p className="text-sm mt-1">When someone mentions you, it will appear here</p>
            </div>
          ) : (
            messages.map((message: any) => (
              <button
                key={message.id}
                onClick={() => handleMessageClick(message)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border border-border bg-background",
                  "hover:bg-muted transition-colors"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={message.sender?.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender?.profiles?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.sender?.profiles?.full_name || 'Unknown'}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {getChatName(message)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(message.created_at), 'MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MentionsView;
