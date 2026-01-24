import { useState } from "react";
import { Check, Copy, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { AIMessage } from "@/services/useAIConversations";

interface AskAIMessageBubbleProps {
  message: AIMessage;
  userName?: string;
}

export const AskAIMessageBubble = ({ message, userName }: AskAIMessageBubbleProps) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex gap-3 group",
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

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col max-w-[80%] min-w-0",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">
            {isUser ? (userName || "You") : "AI Assistant"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(message.created_at)}
          </span>
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Actions - only for AI messages */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}

        {/* Sources if available */}
        {message.metadata?.sources && message.metadata.sources.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Sources:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {message.metadata.sources.map((source, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {source.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
