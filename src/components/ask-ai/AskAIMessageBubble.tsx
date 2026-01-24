import { useState } from "react";
import { Sparkles, ExternalLink, RefreshCw, Copy, Check, Pin, MoreHorizontal } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { AIMessage } from "@/services/useAIConversations";
import { AskAIMarkdown } from "./AskAIMarkdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface AskAIMessageBubbleProps {
  message: AIMessage & { is_pinned?: boolean };
  userName?: string;
  userAvatarUrl?: string;
  onRegenerate?: () => void;
  onPinMessage?: (messageId: string, isPinned: boolean) => void;
  isRegenerating?: boolean;
}

export const AskAIMessageBubble = ({
  message,
  userName = "You",
  userAvatarUrl,
  onRegenerate,
  onPinMessage,
  isRegenerating,
}: AskAIMessageBubbleProps) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const sources = message.metadata?.sources;
  const isPinned = message.is_pinned;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-2 md:px-4 py-2 md:py-3 transition-colors duration-150",
        "hover:bg-muted/40 rounded-lg"
      )}
    >
      {/* Avatar - Always on the left like Team Chat */}
      {isUser ? (
        <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
          <AvatarImage src={userAvatarUrl || undefined} alt={userName} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 mt-0.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row with name and time */}
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-sm font-semibold",
            isUser ? "text-primary" : "text-foreground"
          )}>
            {isUser ? userName : "AI Assistant"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(message.created_at)}
          </span>
          {isPinned && (
            <Pin className="h-3 w-3 text-primary fill-primary" />
          )}
        </div>

        {/* Message Content - No bubble styling, just content */}
        <div className="text-sm">
          {isUser ? (
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">
              {message.content}
            </p>
          ) : (
            <AskAIMarkdown content={message.content} />
          )}
        </div>

        {/* Sources */}
        {!isUser && sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sources.map((source, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs gap-1 cursor-pointer hover:bg-secondary/80"
              >
                <span className="capitalize">{source.type}</span>
                <span className="text-muted-foreground">•</span>
                <span className="truncate max-w-[150px]">{source.title}</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-50" />
              </Badge>
            ))}
          </div>
        )}

        {/* Action buttons for AI messages - visible on hover */}
        {!isUser && (
          <div className={cn(
            "flex items-center gap-1 mt-2 transition-opacity duration-200",
            "opacity-0 group-hover:opacity-100"
          )}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5 text-xs">Copy</span>
            </Button>

            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")}
                />
                <span className="ml-1.5 text-xs">Regenerate</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {onPinMessage && (
                  <DropdownMenuItem onClick={() => onPinMessage(message.id, !isPinned)}>
                    <Pin className="h-4 w-4 mr-2" />
                    {isPinned ? "Unpin message" : "Pin message"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};
