import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AIKPIAssistProps {
  type: "group" | "individual";
  field: "title" | "description" | "both";
  currentTitle?: string;
  currentDescription?: string;
  onSuggestion: (suggestion: {
    title?: string;
    description?: string;
    suggestedTarget?: number | null;
    suggestedUnit?: string | null;
  }) => void;
  // Group KPI context
  scopeType?: "department" | "office" | "project";
  scopeValue?: string;
  // Individual KPI context
  employeeRole?: string;
  department?: string;
  disabled?: boolean;
}

export const AIKPIAssist = ({
  type,
  field,
  currentTitle = "",
  currentDescription = "",
  onSuggestion,
  scopeType,
  scopeValue,
  employeeRole,
  department,
  disabled,
}: AIKPIAssistProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const hasContent = field === "title" 
    ? currentTitle.trim().length > 3 
    : field === "description" 
    ? currentDescription.trim().length > 10
    : currentTitle.trim().length > 3 || currentDescription.trim().length > 10;

  const mode = hasContent ? "improve" : "suggest";

  const handleGenerate = async () => {
    // Validate context for group KPIs
    if (type === "group" && (!scopeType || !scopeValue)) {
      toast.error("Please select a scope first");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-kpi-content", {
        body: {
          mode,
          type,
          scopeType,
          scopeValue,
          employeeRole,
          department,
          currentTitle,
          currentDescription,
          field,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data) {
        onSuggestion({
          title: data.title,
          description: data.description,
          suggestedTarget: data.suggestedTarget,
          suggestedUnit: data.suggestedUnit,
        });
        toast.success(mode === "suggest" ? "AI suggestion generated" : "Content improved");
      }
    } catch (error) {
      console.error("AI KPI assist error:", error);
      toast.error("Failed to generate suggestion. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonLabel = () => {
    if (isGenerating) return "Generating...";
    if (mode === "improve") return "Improve";
    return "Suggest";
  };

  const getTooltipContent = () => {
    if (mode === "improve") {
      return "Polish and improve with AI";
    }
    if (type === "group") {
      return scopeValue 
        ? `Get AI suggestion for ${scopeType} KPI` 
        : "Select a scope to get AI suggestions";
    }
    return "Get AI-powered KPI suggestion";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || disabled || (type === "group" && !scopeValue)}
          className="h-7 gap-1 px-2 text-xs ai-gradient-border"
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 ai-gradient-icon" />
          )}
          <span className="hidden sm:inline">{getButtonLabel()}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipContent()}</p>
      </TooltipContent>
    </Tooltip>
  );
};
