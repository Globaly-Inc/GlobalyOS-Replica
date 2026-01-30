import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface WikiAIWritingAssistProps {
  currentText: string;
  onTextGenerated: (text: string) => void;
  context?: string;
  disabled?: boolean;
}

export const WikiAIWritingAssist = ({ 
  currentText, 
  onTextGenerated,
  context,
  disabled = false,
}: WikiAIWritingAssistProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { isEnabled } = useFeatureFlags();
  
  // Check if AI features are enabled
  const askAiEnabled = isEnabled("ask-ai");

  const handleGenerate = async () => {
    if (!askAiEnabled) {
      toast.error("AI features are not enabled for your organization");
      return;
    }
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-writing-assist", {
        body: { type: "wiki", currentText, context },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit exceeded. Please wait a moment and try again.");
        } else if (data.error.includes("credits")) {
          toast.error("AI credits exhausted. Please contact your administrator.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data?.text) {
        onTextGenerated(data.text);
        toast.success("AI suggestion generated");
        
        // Log usage info if available
        if (data.usage) {
          console.log("AI Usage:", {
            tokens: data.usage.total_tokens,
            cost: `$${data.usage.estimated_cost.toFixed(6)}`,
          });
        }
      }
    } catch (error) {
      console.error("AI assist error:", error);
      toast.error("Failed to generate suggestion. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonLabel = () => {
    if (isGenerating) return "Generating...";
    // Strip HTML and check text length
    const plainText = currentText.replace(/<[^>]*>/g, "").trim();
    if (plainText.length > 50) return "Improve with AI";
    return "Write with AI";
  };

  const getTooltipText = () => {
    const plainText = currentText.replace(/<[^>]*>/g, "").trim();
    if (plainText.length > 50) {
      return "Polish and improve your content";
    }
    return "Generate a draft to get started";
  };

  // Don't render if AI is not enabled
  if (!askAiEnabled) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || disabled}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary"
          aria-label={getButtonLabel()}
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-ai" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-ai" />
          )}
          {getButtonLabel()}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};
