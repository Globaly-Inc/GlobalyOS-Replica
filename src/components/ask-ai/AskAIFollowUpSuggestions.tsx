import { useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AIMessage } from "@/services/useAIConversations";

interface AskAIFollowUpSuggestionsProps {
  messages: AIMessage[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
  className?: string;
}

// Keywords and their related follow-up topics
const topicFollowUps: Record<string, string[]> = {
  leave: [
    "How do I apply for annual leave?",
    "What's my current leave balance?",
    "Who approves leave requests in my department?",
    "Can I carry over unused leave to next year?",
  ],
  attendance: [
    "How do I check in for work?",
    "What are the office hours?",
    "How do I report a late arrival?",
    "Can I work remotely?",
  ],
  policy: [
    "Where can I find company policies?",
    "What's the dress code policy?",
    "Tell me about the expense reimbursement policy",
    "What's the work from home policy?",
  ],
  team: [
    "Who's in my team?",
    "Who is my direct manager?",
    "How can I view the org chart?",
    "Who handles HR matters?",
  ],
  calendar: [
    "What are the upcoming holidays?",
    "When is the next team meeting?",
    "Show me today's schedule",
    "What events are coming up this month?",
  ],
  kpi: [
    "What are my current KPIs?",
    "How is my performance tracking?",
    "When is my next review?",
    "How do I update my objectives?",
  ],
  wiki: [
    "What documentation is available?",
    "How do I find training materials?",
    "Where are the onboarding docs?",
    "Show me the company wiki",
  ],
  project: [
    "What projects am I assigned to?",
    "How do I track project progress?",
    "Who's the project manager?",
    "What are my project deadlines?",
  ],
};

// Extract topics from conversation history
function extractTopicsFromConversation(messages: AIMessage[]): string[] {
  const topics = new Set<string>();
  
  // Analyze all messages in the conversation
  const allContent = messages.map((m) => m.content.toLowerCase()).join(" ");
  
  // Check for topic keywords
  Object.keys(topicFollowUps).forEach((topic) => {
    if (allContent.includes(topic)) {
      topics.add(topic);
    }
  });
  
  // Additional keyword detection
  const keywordMappings: Record<string, string> = {
    "time off": "leave",
    "vacation": "leave",
    "sick": "leave",
    "absent": "attendance",
    "check-in": "attendance",
    "clock": "attendance",
    "remote": "attendance",
    "employee": "team",
    "colleague": "team",
    "department": "team",
    "holiday": "calendar",
    "meeting": "calendar",
    "event": "calendar",
    "performance": "kpi",
    "goal": "kpi",
    "objective": "kpi",
    "document": "wiki",
    "guide": "wiki",
    "how to": "wiki",
  };
  
  Object.entries(keywordMappings).forEach(([keyword, topic]) => {
    if (allContent.includes(keyword)) {
      topics.add(topic);
    }
  });
  
  return Array.from(topics);
}

// Generate contextual suggestions based on conversation
function generateContextualSuggestions(messages: AIMessage[]): string[] {
  const suggestions: string[] = [];
  
  // Get the last few user questions to understand conversation flow
  const userQuestions = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .slice(-3);
  
  // Get topics discussed
  const topics = extractTopicsFromConversation(messages);
  
  // If we found topics, get related follow-ups
  if (topics.length > 0) {
    topics.forEach((topic) => {
      const followUps = topicFollowUps[topic] || [];
      // Filter out questions similar to what's already been asked
      const filteredFollowUps = followUps.filter((f) => {
        const fLower = f.toLowerCase();
        return !userQuestions.some((q) => {
          const qLower = q.toLowerCase();
          // Check for substantial overlap
          const fWords = fLower.split(" ");
          const qWords = qLower.split(" ");
          const commonWords = fWords.filter((w) => qWords.includes(w) && w.length > 3);
          return commonWords.length > 2;
        });
      });
      suggestions.push(...filteredFollowUps);
    });
  }
  
  // If no specific topics found, provide general suggestions
  if (suggestions.length === 0) {
    suggestions.push(
      "What can you help me with?",
      "Tell me about company policies",
      "How do I check my leave balance?",
      "Who's in my team?"
    );
  }
  
  // Shuffle and limit suggestions
  const shuffled = suggestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export const AskAIFollowUpSuggestions = ({
  messages,
  onSelect,
  disabled,
  className,
}: AskAIFollowUpSuggestionsProps) => {
  const suggestions = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return generateContextualSuggestions(messages);
  }, [messages]);

  if (suggestions.length === 0) return null;

  return (
    <div className={cn("px-4 py-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-warning" />
        <span className="text-xs font-medium text-muted-foreground">
          Follow-up questions
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className={cn(
              "h-auto py-2 px-3 text-left text-sm font-normal",
              "border-dashed hover:border-solid hover:bg-muted/50",
              "transition-all duration-200"
            )}
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
};
