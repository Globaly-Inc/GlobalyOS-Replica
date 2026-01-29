import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ChatMessage } from "@/types/chat";

interface ChatAIAssistProps {
  currentText: string;
  onTextGenerated: (text: string) => void;
  conversationId: string | null;
  spaceId: string | null;
  messages: ChatMessage[];
  spaceName?: string;
  spaceDescription?: string | null;
  conversationName?: string | null;
  isGroup?: boolean;
  disabled?: boolean;
}

export default function ChatAIAssist({
  currentText,
  onTextGenerated,
  conversationId,
  spaceId,
  messages,
  spaceName,
  spaceDescription,
  conversationName,
  isGroup,
  disabled,
}: ChatAIAssistProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { currentOrg } = useOrganization();
  const isMobile = useIsMobile();

  // Determine mode based on current text length
  const hasContent = currentText.trim().length > 10;
  const mode = hasContent ? 'improve' : 'suggest';

  const handleClick = async () => {
    if (isGenerating || disabled) return;

    setIsGenerating(true);

    try {
      // Build recent messages context (last 20)
      const recentMessages = messages
        .slice(-20)
        .filter(m => m.content_type === 'text' && m.content)
        .map(m => ({
          senderName: m.sender?.profiles?.full_name || 'Unknown',
          content: m.content,
        }));

      // Determine context info
      const contextInfo = {
        type: spaceId ? 'space' : (isGroup ? 'group' : 'dm') as 'space' | 'group' | 'dm',
        name: spaceId ? (spaceName || 'Unknown Space') : (conversationName || 'Direct Message'),
        description: spaceDescription,
      };

      const { data, error } = await supabase.functions.invoke('ai-chat-assist', {
        body: {
          mode,
          currentText: currentText.trim(),
          recentMessages,
          contextInfo,
          organizationId: currentOrg?.id,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate text');
      }

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error("Too many requests. Please wait a moment.");
        } else if (data.error.includes('credits')) {
          toast.error("AI credits depleted. Contact your admin.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data?.text) {
        onTextGenerated(data.text);
        toast.success(mode === 'suggest' ? "Suggestion generated" : "Message improved");
      }
    } catch (error) {
      console.error("AI assist error:", error);
      toast.error("Failed to generate text. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const label = isGenerating 
    ? "Generating..." 
    : mode === 'suggest' 
      ? "AI Suggest" 
      : "AI Improve";

  const tooltipText = mode === 'suggest'
    ? "Generate a contextual message suggestion based on the conversation"
    : "Polish and improve your current message";

  const Icon = isGenerating 
    ? Loader2 
    : mode === 'suggest' 
      ? Sparkles 
      : Wand2;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={isMobile ? "icon" : "sm"}
          className={cn(
            "text-muted-foreground hover:text-primary transition-colors",
            isMobile ? "h-10 w-10" : "h-8 px-2 gap-1.5",
            isGenerating && "pointer-events-none"
          )}
          onClick={handleClick}
          disabled={disabled || isGenerating}
        >
          <Icon className={cn(
            isMobile ? "h-5 w-5" : "h-3.5 w-3.5",
            isGenerating && "animate-spin"
          )} />
          {!isMobile && <span className="text-xs">{label}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
