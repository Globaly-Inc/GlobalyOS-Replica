import { Sparkles, Users, Calendar, FileText, Bell, HelpCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";

interface AskAIEmptyStateProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

const suggestions = [
  {
    icon: Users,
    text: "Who works in Engineering?",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Calendar,
    text: "What events are coming up this week?",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: FileText,
    text: "What are our leave policies?",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Bell,
    text: "Show me recent announcements",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: TrendingUp,
    text: "What are our current KPIs?",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    icon: HelpCircle,
    text: "How do I request time off?",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
];

export const AskAIEmptyState = ({ onSendMessage, isLoading }: AskAIEmptyStateProps) => {
  const { currentOrg } = useOrganization();

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 max-w-3xl mx-auto">
      {/* Logo and Welcome */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-ai/20 to-ai/5 mb-4">
          <Sparkles className="h-8 w-8 text-ai" />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          How can I help you today?
        </h1>
        <p className="text-muted-foreground max-w-md">
          Ask me anything about {currentOrg?.name || "your organization"}.
          I can help you find information from your wiki, team directory, calendar, and more.
        </p>
      </div>

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2 text-left hover:border-ai/50 hover:bg-ai/5 transition-all group"
              onClick={() => onSendMessage(suggestion.text)}
              disabled={isLoading}
            >
              <div className={`p-2 rounded-lg ${suggestion.bgColor} transition-colors`}>
                <Icon className={`h-4 w-4 ${suggestion.color}`} />
              </div>
              <span className="text-sm font-medium leading-snug group-hover:text-ai transition-colors">
                {suggestion.text}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Capabilities Note */}
      <div className="mt-8 text-center text-xs text-muted-foreground max-w-md">
        <p>
          I have access to your organization's wiki, team directory, calendar events,
          announcements, and other data based on your permissions.
        </p>
      </div>
    </div>
  );
};
