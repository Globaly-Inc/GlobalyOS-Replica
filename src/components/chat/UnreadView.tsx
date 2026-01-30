import { ArrowLeft, MessageCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnreadMessages, useMarkAsRead } from "@/services/chat";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ActiveChat } from "@/types/chat";
import { useIsMobile } from "@/hooks/use-mobile";
import { UnreadMessageSkeleton } from "./UnreadMessageSkeleton";

interface UnreadViewProps {
  onNavigateToChat: (chat: ActiveChat, messageId?: string) => void;
  onBack?: () => void;
}

const UnreadView = ({ onNavigateToChat, onBack }: UnreadViewProps) => {
  const { data: messages = [], isLoading } = useUnreadMessages();
  const { mutate: markAsRead } = useMarkAsRead();
  const isMobile = useIsMobile();

  const handleMessageClick = (message: any) => {
    // Mark as read
    if (message.conversation_id) {
      markAsRead({ conversationId: message.conversation_id });
    } else if (message.space_id) {
      markAsRead({ spaceId: message.space_id });
    }

    // Navigate to chat with message highlight
    if (message.conversation_id && message.conversation) {
      onNavigateToChat({
        type: 'conversation',
        id: message.conversation_id,
        name: message.conversation.name || 'Conversation',
        isGroup: message.conversation.is_group
      }, message.id);
    } else if (message.space_id && message.space) {
      onNavigateToChat({
        type: 'space',
        id: message.space_id,
        name: message.space.name
      }, message.id);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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
      {/* Header - only show on mobile */}
      {isMobile && (
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-destructive/10 text-destructive">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Unread</h2>
            <p className="text-sm text-muted-foreground">Messages you haven't read yet</p>
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-3">
          {isLoading ? (
            <UnreadMessageSkeleton count={5} />
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No unread messages</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            messages.map((message: any) => (
              <button
                key={message.id}
                onClick={() => handleMessageClick(message)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border border-border bg-background",
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

export default UnreadView;
