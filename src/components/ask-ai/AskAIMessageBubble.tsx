import { User, Sparkles, ExternalLink } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { AIMessage } from "@/services/useAIConversations";
import { AskAIMarkdown } from "./AskAIMarkdown";
import { AskAIMessageActions } from "./AskAIMessageActions";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AskAIMessageBubbleProps {
  message: AIMessage;
  userName?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export const AskAIMessageBubble = ({
  message,
  userName = "You",
  onRegenerate,
  isRegenerating,
}: AskAIMessageBubbleProps) => {
  const isUser = message.role === "user";
  const sources = message.metadata?.sources;

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-ai/20 to-ai/5"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4 text-ai" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0 space-y-2", isUser && "flex flex-col items-end")}>
        {/* Header */}
        <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", isUser && "flex-row-reverse")}>
          <span className="font-medium text-foreground">
            {isUser ? userName : "AI Assistant"}
          </span>
          <span>{formatRelativeTime(message.created_at)}</span>
        </div>

        {/* Message Content */}
        <div
          className={cn(
            "rounded-2xl",
            isUser
              ? "bg-primary text-primary-foreground px-4 py-2.5 max-w-[85%]"
              : "bg-muted/50 px-4 py-3 max-w-full"
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <AskAIMarkdown content={message.content} />
          )}
        </div>

        {/* Sources */}
        {!isUser && sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
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

        {/* Actions for AI messages */}
        {!isUser && (
          <TooltipProvider>
            <AskAIMessageActions
              content={message.content}
              onRegenerate={onRegenerate}
              isRegenerating={isRegenerating}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};
