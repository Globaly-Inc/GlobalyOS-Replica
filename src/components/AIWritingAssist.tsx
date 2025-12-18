import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AIWritingAssistProps {
  type: "win" | "announcement" | "kudos";
  currentText: string;
  onTextGenerated: (text: string) => void;
  context?: string;
}

export const AIWritingAssist = ({ 
  type, 
  currentText, 
  onTextGenerated,
  context 
}: AIWritingAssistProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-writing-assist", {
        body: { type, currentText, context },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.text) {
        onTextGenerated(data.text);
        toast.success("AI suggestion generated");
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
    if (currentText.trim().length > 10) return "Improve with AI";
    return "Write with AI";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
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
        <p>{currentText.trim().length > 10 ? "Polish and improve your text" : "Generate a draft to get started"}</p>
      </TooltipContent>
    </Tooltip>
  );
};
