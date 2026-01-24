import { useState } from "react";
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AskAIMessageActionsProps {
  content: string;
  onRegenerate?: () => void;
  onFeedback?: (isPositive: boolean) => void;
  isRegenerating?: boolean;
  className?: string;
}

export const AskAIMessageActions = ({
  content,
  onRegenerate,
  onFeedback,
  isRegenerating,
  className,
}: AskAIMessageActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleFeedback = (isPositive: boolean) => {
    const newFeedback = isPositive ? "positive" : "negative";
    if (feedback === newFeedback) {
      setFeedback(null);
      return;
    }
    setFeedback(newFeedback);
    onFeedback?.(isPositive);
    toast.success(isPositive ? "Thanks for the feedback!" : "We'll work to improve");
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 w-7"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {copied ? "Copied!" : "Copy"}
        </TooltipContent>
      </Tooltip>

      {onRegenerate && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="h-7 w-7"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Regenerate</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSpeak}
            className="h-7 w-7"
          >
            {isSpeaking ? (
              <VolumeX className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isSpeaking ? "Stop" : "Read aloud"}
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-4 bg-border mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleFeedback(true)}
            className={cn(
              "h-7 w-7",
              feedback === "positive" && "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Good response</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleFeedback(false)}
            className={cn(
              "h-7 w-7",
              feedback === "negative" && "text-destructive bg-destructive/10"
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Poor response</TooltipContent>
      </Tooltip>
    </div>
  );
};
