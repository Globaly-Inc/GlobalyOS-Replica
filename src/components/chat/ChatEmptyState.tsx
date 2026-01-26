import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useOrganization } from "@/hooks/useOrganization";
import {
  MessageSquare,
  Users,
  Hash,
  Building2,
  MessagesSquare,
  Megaphone,
  Paperclip,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface ChatEmptyStateProps {
  onNewChat: () => void;
  onNewSpace: () => void;
}

interface Suggestion {
  icon: LucideIcon;
  text: string;
  color: string;
  bgColor: string;
  action: "chat" | "space";
}

const suggestions: Suggestion[] = [
  {
    icon: Users,
    text: "Start a direct message",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    action: "chat",
  },
  {
    icon: Hash,
    text: "Create a new space",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    action: "space",
  },
  {
    icon: MessagesSquare,
    text: "Send a group message",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
    action: "chat",
  },
  {
    icon: Megaphone,
    text: "Post an announcement",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
    action: "space",
  },
  {
    icon: Paperclip,
    text: "Share a file",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    action: "chat",
  },
  {
    icon: Search,
    text: "Search messages",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
    action: "chat",
  },
];

const ChatEmptyState = ({ onNewChat, onNewSpace }: ChatEmptyStateProps) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const firstName = currentEmployee?.profiles?.full_name?.split(' ')[0] || '';

  const handleSuggestionClick = (action: "chat" | "space") => {
    if (action === 'space') {
      onNewSpace();
    } else {
      onNewChat();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      {/* Logo with overlay */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg">
          {currentOrg?.logo_url ? (
            <img 
              src={currentOrg.logo_url} 
              alt={currentOrg.name} 
              className="w-12 h-12 rounded-lg object-contain" 
            />
          ) : (
            <Building2 className="w-10 h-10 text-primary" />
          )}
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Personalized greeting */}
      <h1 className="text-2xl font-bold text-center mb-2">
        Hi{firstName ? ` ${firstName}` : ''}! Welcome to Team Chat
      </h1>
      <p className="text-muted-foreground text-center mb-1">
        Connect with your team in real-time
      </p>
      {currentOrg && (
        <p className="text-xs text-muted-foreground mb-8">
          Part of {currentOrg.name}
        </p>
      )}

      {/* Suggestion cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleSuggestionClick(suggestion.action)}
              className="h-auto p-4 flex items-start gap-3 text-left justify-start hover:border-primary/30 hover:bg-primary/5 transition-all group"
            >
              <div className={`shrink-0 w-8 h-8 rounded-lg ${suggestion.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`w-4 h-4 ${suggestion.color}`} />
              </div>
              <span className="text-sm font-normal leading-snug">
                {suggestion.text}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Capability badges */}
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {["DMs", "Groups", "Spaces", "Mentions", "Files", "Threads"].map((cap) => (
          <span 
            key={cap} 
            className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground"
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-4 text-center max-w-md">
        Connect with your team members through direct messages, group chats, and topic-based spaces.
      </p>
    </div>
  );
};

export default ChatEmptyState;
