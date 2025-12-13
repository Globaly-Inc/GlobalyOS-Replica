import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import AttachmentRenderer from "./AttachmentRenderer";
import MessageActions from "./MessageActions";
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

  return (
    <div
      className={cn(
        "flex gap-3 group",
        isOwn && "flex-row-reverse",
        isGrouped && !isOwn && "pl-11" // Indent grouped messages (avatar width + gap)
      )}
    >
      {/* Avatar - only show for first message in group or own messages */}
      {!isOwn && !isGrouped && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender?.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col max-w-[70%]", isOwn && "items-end")}>
        {/* Sender name - only show for first message in group */}
        {!isOwn && !isGrouped && (
          <span className="text-xs font-medium text-muted-foreground mb-1">
            {senderName}
          </span>
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
            <div className="flex items-start gap-1">
              <div
                className={cn(
                  "px-3 py-2 rounded-2xl text-sm",
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md",
                  message.is_pinned && "ring-2 ring-yellow-400"
                )}
              >
                {message.content && (
                  <RichTextMessage content={message.content} />
                )}
                {message.attachments && message.attachments.length > 0 && (
                  <AttachmentRenderer
                    attachments={message.attachments}
                    isOwn={isOwn}
                  />
                )}
                {message.updated_at !== message.created_at && (
                  <span className="text-[10px] opacity-70 ml-1">(edited)</span>
                )}
              </div>

              <MessageActions
                messageId={message.id}
                isPinned={message.is_pinned}
                isOwn={isOwn}
                onPin={onPin}
                onEdit={onEdit}
                onDelete={onDelete}
                onReact={onReact}
              />
            </div>

            {/* Time - show for last message in group */}
            {isLastInGroup && (
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {format(new Date(message.created_at), "h:mm a")}
              </span>
            )}

            {/* Reactions */}
            {Object.keys(reactions).length > 0 && (
              <MessageReactions
                reactions={reactions}
                currentEmployeeId={currentEmployeeId || ''}
                onToggleReaction={onReact}
                isOwn={isOwn}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
