import React, { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bookmark, Pin } from "lucide-react";
import AttachmentRenderer from "./AttachmentRenderer";
import MessageActionsToolbar from "./MessageActionsToolbar";
import MessageReactions from "./MessageReactions";
import EditMessageInput from "./EditMessageInput";
import RichTextMessage from "./RichTextMessage";
import MessageDeliveryStatus from "./MessageDeliveryStatus";
import LinkPreviewRenderer from "./LinkPreviewRenderer";

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
  onStar: () => void;
  onPin: () => void;
  onReact: (emoji: string) => void;
  onReply?: () => void;
  replyCount?: number;
  isEditPending: boolean;
  isStarred: boolean;
  isOnline?: boolean;
}

// Custom equality check for performance - only re-render when these specific props change
const arePropsEqual = (prev: MessageBubbleProps, next: MessageBubbleProps): boolean => {
  // Fast path: check primitive props first
  if (
    prev.message.id !== next.message.id ||
    prev.message.content !== next.message.content ||
    prev.message.updated_at !== next.message.updated_at ||
    prev.message.is_pinned !== next.message.is_pinned ||
    prev.isEditing !== next.isEditing ||
    prev.isStarred !== next.isStarred ||
    prev.isGrouped !== next.isGrouped ||
    prev.isLastInGroup !== next.isLastInGroup ||
    prev.replyCount !== next.replyCount ||
    prev.isOnline !== next.isOnline ||
    prev.isOwn !== next.isOwn ||
    prev.isEditPending !== next.isEditPending ||
    prev.currentEmployeeId !== next.currentEmployeeId
  ) {
    return false;
  }

  // Shallow compare reactions - check count and user counts per emoji
  const prevReactionKeys = Object.keys(prev.reactions);
  const nextReactionKeys = Object.keys(next.reactions);
  
  if (prevReactionKeys.length !== nextReactionKeys.length) {
    return false;
  }
  
  for (const key of prevReactionKeys) {
    if (!next.reactions[key]) return false;
    if (prev.reactions[key]?.users.length !== next.reactions[key]?.users.length) {
      return false;
    }
  }

  // Check attachments count
  const prevAttachments = prev.message.attachments?.length || 0;
  const nextAttachments = next.message.attachments?.length || 0;
  if (prevAttachments !== nextAttachments) {
    return false;
  }

  return true;
};

const MessageBubbleComponent = ({
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
  onStar,
  onPin,
  onReact,
  onReply,
  replyCount,
  isEditPending,
  isStarred,
  isOnline,
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
        "group relative flex gap-1.5 md:gap-3 px-1.5 md:px-4 py-0.5 md:py-1 transition-colors duration-150",
        "hover:bg-muted/40",
        message.is_pinned && "bg-amber-500/5 hover:bg-amber-500/10",
        isGrouped && "py-0.5"
      )}
    >
      {/* Avatar - smaller on mobile */}
      <div className="w-7 md:w-9 flex-shrink-0">
        {!isGrouped && (
          <div className="relative">
            <Avatar className="h-7 w-7 md:h-9 md:w-9">
              <AvatarImage src={message.sender?.profiles?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] md:text-xs bg-primary/10 text-primary font-medium">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-green-500 border-2 border-card" />
            )}
          </div>
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Sender name and timestamp - only for first message in group */}
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              "font-semibold text-sm",
              isOwn ? "text-primary" : "text-foreground"
            )}>
              {senderName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formattedTime}
            </span>
            {isOwn && (
              <MessageDeliveryStatus status={message.status || 'sent'} />
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

            {/* Link previews */}
            {message.content && (
              <LinkPreviewRenderer 
                content={message.content} 
                messageId={message.id}
              />
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
            
            {/* Reply count indicator */}
            {replyCount && replyCount > 0 && (
              <button
                onClick={onReply}
                className="mt-1.5 text-xs text-primary hover:underline flex items-center gap-1"
              >
                <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
              </button>
            )}

            {/* Message status indicators - Pinned & Starred */}
            {(message.is_pinned || isStarred) && (
              <div className="flex items-center gap-2 mt-1.5">
                {message.is_pinned && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </span>
                )}
                {isStarred && (
                  <span className="text-xs text-blue-500 flex items-center gap-0.5">
                    <Bookmark className="h-3 w-3 fill-blue-500" />
                    Saved
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating action toolbar - appears on hover */}
      {!isEditing && (
        <MessageActionsToolbar
          messageId={message.id}
          messageContent={message.content}
          isStarred={isStarred}
          isPinned={message.is_pinned}
          isOwn={isOwn}
          onStar={onStar}
          onPin={onPin}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
          onReply={onReply}
        />
      )}
    </div>
  );
};

// Wrap with React.memo using custom comparator for performance
const MessageBubble = memo(MessageBubbleComponent, arePropsEqual);

export default MessageBubble;
