import { useMemo } from "react";
import {
  Users,
  Calendar,
  FileText,
  Megaphone,
  Target,
  Clock,
  Sparkles,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { useTypewriter } from "@/hooks/useTypewriter";

interface AskAIEmptyStateProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

const suggestionCategories = [
  {
    icon: Users,
    text: "Who works in Engineering?",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Calendar,
    text: "What events are coming up this week?",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: FileText,
    text: "What are our leave policies?",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: Megaphone,
    text: "Show me recent announcements",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: Target,
    text: "How are my KPIs tracking?",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Clock,
    text: "Who is out of office today?",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
];

const typewriterPhrases = [
  "about your team...",
  "about policies...",
  "about events...",
  "about KPIs...",
  "anything...",
];

export const AskAIEmptyState = ({
  onSendMessage,
  isLoading,
}: AskAIEmptyStateProps) => {
  const { currentOrg } = useOrganization();
  const { displayText } = useTypewriter({
    words: typewriterPhrases,
    typingSpeed: 80,
    deletingSpeed: 50,
    pauseDuration: 2500,
    startDelay: 500,
  });

  const suggestions = useMemo(() => {
    return [...suggestionCategories].sort(() => Math.random() - 0.5).slice(0, 6);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-ai/20 via-primary/10 to-ai/5 flex items-center justify-center shadow-lg">
          {currentOrg?.logo_url ? (
            <img src={currentOrg.logo_url} alt={currentOrg.name} className="w-12 h-12 rounded-lg object-contain" />
          ) : (
            <Building2 className="w-10 h-10 text-ai" />
          )}
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-ai/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-ai" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-center mb-2">Hi! I'm your AI assistant</h1>
      <p className="text-muted-foreground text-center mb-1">
        Ask me <span className="text-foreground font-medium">{displayText}</span>
        <span className="animate-pulse">|</span>
      </p>
      {currentOrg && <p className="text-xs text-muted-foreground mb-8">Powered by {currentOrg.name}'s knowledge base</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <Button
              key={index}
              variant="outline"
              onClick={() => onSendMessage(suggestion.text)}
              disabled={isLoading}
              className="h-auto p-4 flex items-start gap-3 text-left justify-start hover:border-primary/30 hover:bg-primary/5 transition-all group"
            >
              <div className={`shrink-0 w-8 h-8 rounded-lg ${suggestion.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`w-4 h-4 ${suggestion.color}`} />
              </div>
              <span className="text-sm font-medium leading-snug">{suggestion.text}</span>
            </Button>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {["Wiki", "Team", "Calendar", "Announcements", "KPIs", "Policies"].map((cap) => (
          <span key={cap} className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">{cap}</span>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center max-w-md">
        I can help you find information from your organization's wiki, team directory, calendar, and more.
      </p>
    </div>
  );
};
