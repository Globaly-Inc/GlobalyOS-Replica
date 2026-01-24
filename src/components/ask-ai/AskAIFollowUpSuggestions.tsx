import { useMemo } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AskAIFollowUpSuggestionsProps {
  lastMessage: string;
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
  className?: string;
}

// Generate contextual follow-up questions based on the AI response
function generateFollowUps(content: string): string[] {
  const suggestions: string[] = [];
  const lowerContent = content.toLowerCase();

  // Detect topics and generate relevant follow-ups
  if (lowerContent.includes("leave") || lowerContent.includes("vacation") || lowerContent.includes("pto")) {
    suggestions.push("How do I apply for leave?");
    suggestions.push("What's my leave balance?");
  }

  if (lowerContent.includes("policy") || lowerContent.includes("policies")) {
    suggestions.push("Where can I find all policies?");
    suggestions.push("Who manages these policies?");
  }

  if (lowerContent.includes("team") || lowerContent.includes("employee") || lowerContent.includes("member")) {
    suggestions.push("Who is on my team?");
    suggestions.push("Show me the org chart");
  }

  if (lowerContent.includes("event") || lowerContent.includes("calendar") || lowerContent.includes("meeting")) {
    suggestions.push("What events are coming up?");
    suggestions.push("Show me today's schedule");
  }

  if (lowerContent.includes("kpi") || lowerContent.includes("performance") || lowerContent.includes("goal")) {
    suggestions.push("How are my KPIs tracking?");
    suggestions.push("What are the team goals?");
  }

  if (lowerContent.includes("announcement") || lowerContent.includes("news") || lowerContent.includes("update")) {
    suggestions.push("Show recent announcements");
    suggestions.push("What's new in the company?");
  }

  if (lowerContent.includes("wiki") || lowerContent.includes("documentation") || lowerContent.includes("knowledge")) {
    suggestions.push("What topics are in the wiki?");
    suggestions.push("How do I contribute to the wiki?");
  }

  if (lowerContent.includes("attendance") || lowerContent.includes("check-in") || lowerContent.includes("work hours")) {
    suggestions.push("What are the work hours?");
    suggestions.push("How do I check in?");
  }

  // Add generic follow-ups if we don't have enough specific ones
  const genericFollowUps = [
    "Tell me more about this",
    "Can you give an example?",
    "Who should I contact for help?",
    "What else should I know?",
  ];

  while (suggestions.length < 2 && genericFollowUps.length > 0) {
    suggestions.push(genericFollowUps.shift()!);
  }

  // Return max 3 unique suggestions
  return [...new Set(suggestions)].slice(0, 3);
}

export const AskAIFollowUpSuggestions = ({
  lastMessage,
  onSelect,
  disabled,
  className,
}: AskAIFollowUpSuggestionsProps) => {
  const suggestions = useMemo(() => generateFollowUps(lastMessage), [lastMessage]);

  if (suggestions.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lightbulb className="h-3 w-3" />
        <span>Follow-up questions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
            className="text-xs h-7 gap-1.5 hover:bg-primary/5 hover:border-primary/30"
          >
            {suggestion}
            <ArrowRight className="h-3 w-3" />
          </Button>
        ))}
      </div>
    </div>
  );
};
