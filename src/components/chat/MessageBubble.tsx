import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import AttachmentRenderer from "./AttachmentRenderer";
import MessageActionsToolbar from "./MessageActionsToolbar";
import MessageReactions from "./MessageReactions";
import EditMessageInput from "./EditMessageInput";
import RichTextMessage from "./RichTextMessage";
import type { ChatMessage } from "@/types/chat";
import { format } from "date-fns";

interface ReactionUser {
  id: string;
  name: string;
  avatar?: string;
}

interface Reaction {
  emoji: string;
  users: ReactionUser[];
}

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  isGrouped: boolean;
  isLastInGroup: boolean;
  reactions: Record<string, Reaction>;
  isEditing: boolean;
  currentEmployeeId: string | undefined;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (content: string) => void;
  onDelete: () => void;
  onPin: () => void;
  onReact: (emoji: string) => void;
  isEditPending: boolean;
}

const MessageBubble = ({
  message,
  isOwn,
  isGrouped,
  isLastInGroup,
  reactions,
  isEditing,
  currentEmployeeId,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onPin,
  onReact,
  isEditPending,
}: MessageBubbleProps) => {
  const senderName = message.sender?.profiles?.full_name || "Unknown";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formattedTime = format(new Date(message.created_at), "h:mm a");

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "group relative flex gap-3 px-4 py-1 transition-colors duration-150",
        "hover:bg-muted/40",
        message.is_pinned && "bg-amber-500/5 hover:bg-amber-500/10",
        isGrouped && "py-0.5"
      )}
    >
      {/* Avatar - always show placeholder space, only render avatar for first in group */}
      <div className="w-9 flex-shrink-0">
        {!isGrouped && (
          <Avatar className="h-9 w-9">
            <AvatarImage src={message.sender?.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
              {getInitials(senderName)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Sender name and timestamp - only for first message in group */}
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={cn(
              "font-semibold text-sm",
              isOwn ? "text-primary" : "text-foreground"
            )}>
              {senderName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formattedTime}
            </span>
            {message.is_pinned && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Pinned
              </span>
            )}
          </div>
        )}

        {isEditing ? (
          <EditMessageInput
            initialContent={message.content}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            isLoading={isEditPending}
          />
        ) : (
          <>
            {/* Message text */}
            {message.content && (
              <div className="text-sm text-foreground leading-relaxed">
                <RichTextMessage content={message.content} />
                {message.updated_at !== message.created_at && (
                  <span className="text-xs text-muted-foreground ml-1">(edited)</span>
                )}
              </div>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2">
                <AttachmentRenderer
                  attachments={message.attachments}
                  isOwn={isOwn}
                />
              </div>
            )}

            {/* Reactions */}
            {Object.keys(reactions).length > 0 && (
              <div className="mt-1.5">
                <MessageReactions
                  reactions={reactions}
                  currentEmployeeId={currentEmployeeId || ''}
                  onToggleReaction={onReact}
                  isOwn={isOwn}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating action toolbar - appears on hover */}
      {!isEditing && (
        <MessageActionsToolbar
          messageId={message.id}
          isPinned={message.is_pinned}
          isOwn={isOwn}
          onPin={onPin}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
        />
      )}
    </div>
  );
};

export default MessageBubble;
