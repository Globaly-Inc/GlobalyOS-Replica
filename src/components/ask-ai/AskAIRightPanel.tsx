import { useState } from "react";
import { format } from "date-fns";
import { 
  X, 
  Sparkles, 
  Pin, 
  MessageSquare, 
  Calendar, 
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AIConversation, AIMessage } from "@/services/useAIConversations";

interface Source {
  type: string;
  id: string;
  title: string;
  excerpt?: string;
}

interface AskAIRightPanelProps {
  conversation: AIConversation & { is_shared?: boolean; visibility?: string };
  messages: AIMessage[];
  pinnedMessages: AIMessage[];
  onClose: () => void;
  onUnpinMessage?: (messageId: string) => void;
  className?: string;
}

export const AskAIRightPanel = ({ 
  conversation, 
  messages, 
  pinnedMessages,
  onClose,
  onUnpinMessage,
  className 
}: AskAIRightPanelProps) => {
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);

  // Extract unique sources from all messages
  const allSources = messages.reduce<Source[]>((acc, msg) => {
    const msgSources = msg.metadata?.sources as Source[] | undefined;
    if (msgSources) {
      msgSources.forEach(source => {
        if (!acc.find(s => s.id === source.id)) {
          acc.push(source);
        }
      });
    }
    return acc;
  }, []);

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "wiki":
      case "wiki_page":
        return BookOpen;
      case "team":
      case "employee":
        return Users;
      case "calendar":
        return Calendar;
      default:
        return MessageSquare;
    }
  };

  const getSourceBadgeColor = (type: string) => {
    switch (type) {
      case "wiki":
      case "wiki_page":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "team":
      case "employee":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "calendar":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className={cn(
      "w-80 border-l bg-background flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Conversation Info</h3>
            <p className="text-xs text-muted-foreground">Details & pinned items</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        {/* Conversation Details Section */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Details
              </h4>
              {detailsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {format(new Date(conversation.created_at), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Messages</span>
                <span className="font-medium">{messages.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    conversation.is_archived 
                      ? "bg-muted text-muted-foreground" 
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  )}
                >
                  {conversation.is_archived ? "Archived" : "Active"}
                </Badge>
              </div>
              {conversation.is_shared && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Visibility</span>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                    {conversation.visibility === "team" ? "Team" : "Private"}
                  </Badge>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <div className="border-t" />
        
        {/* Pinned Messages Section */}
        <Collapsible open={pinnedOpen} onOpenChange={setPinnedOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Pin className="h-4 w-4 text-muted-foreground" />
                Pinned Messages
                {pinnedMessages.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {pinnedMessages.length}
                  </Badge>
                )}
              </h4>
              {pinnedOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4">
              {pinnedMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pinned messages yet.
                  <br />
                  <span className="text-xs">Pin important AI responses for quick reference.</span>
                </p>
              ) : (
                <div className="space-y-2">
                  {pinnedMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className="group relative p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-border transition-colors"
                    >
                      <p className="text-sm line-clamp-3 pr-6">{msg.content}</p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {format(new Date(msg.created_at), "MMM d, h:mm a")}
                      </span>
                      {onUnpinMessage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onUnpinMessage(msg.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <div className="border-t" />
        
        {/* Sources Used Section */}
        <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Sources Used
                {allSources.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {allSources.length}
                  </Badge>
                )}
              </h4>
              {sourcesOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4">
              {allSources.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No external sources used.
                </p>
              ) : (
                <div className="space-y-2">
                  {allSources.map((source, idx) => {
                    const SourceIcon = getSourceIcon(source.type);
                    return (
                      <div 
                        key={`${source.id}-${idx}`}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Badge 
                          variant="outline" 
                          className={cn("h-6 w-6 p-0 flex items-center justify-center", getSourceBadgeColor(source.type))}
                        >
                          <SourceIcon className="h-3 w-3" />
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{source.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{source.type.replace("_", " ")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </ScrollArea>
    </div>
  );
};

export default AskAIRightPanel;
