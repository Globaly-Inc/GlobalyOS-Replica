import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, Send, Loader2, Info, History, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConversationRecord {
  question: string;
  timestamp: number;
  topics: string[];
}

interface GlobalAskAIProps {
  organizationId: string | undefined;
  isMobileFullscreen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = "globalai_conversation_history";
const MAX_HISTORY_ITEMS = 50;

// Extract topics from a question for context-aware suggestions
const extractTopics = (question: string): string[] => {
  const topicPatterns = [
    { pattern: /\b(team|employee|staff|member|colleague|who)\b/i, topic: "team" },
    { pattern: /\b(department|engineering|sales|marketing|hr|design|management)\b/i, topic: "department" },
    { pattern: /\b(wiki|document|policy|guide|how to)\b/i, topic: "wiki" },
    { pattern: /\b(leave|vacation|pto|sick|holiday|time off)\b/i, topic: "leave" },
    { pattern: /\b(kpi|performance|goal|target|metric)\b/i, topic: "kpi" },
    { pattern: /\b(announcement|update|news|recent)\b/i, topic: "announcements" },
    { pattern: /\b(chat|message|conversation)\b/i, topic: "chat" },
    { pattern: /\b(project|task|work)\b/i, topic: "projects" },
    { pattern: /\b(manager|lead|report|supervisor)\b/i, topic: "hierarchy" },
    { pattern: /\b(office|location|address)\b/i, topic: "offices" },
  ];

  const topics: string[] = [];
  topicPatterns.forEach(({ pattern, topic }) => {
    if (pattern.test(question)) {
      topics.push(topic);
    }
  });

  return topics.length > 0 ? topics : ["general"];
};

// Generate smart suggestions based on conversation history
const generateSmartSuggestions = (history: ConversationRecord[]): string[] => {
  if (history.length === 0) {
    return [
      "Who works in the Engineering department?",
      "What are our company policies?",
      "Show me recent announcements",
      "Who is my team lead?",
    ];
  }

  // Analyze recent topics
  const recentHistory = history.slice(-10);
  const topicCounts: Record<string, number> = {};
  
  recentHistory.forEach((record) => {
    record.topics.forEach((topic) => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });

  // Get most frequent topics
  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  // Topic-based follow-up suggestions
  const topicSuggestions: Record<string, string[]> = {
    team: [
      "Who recently joined the company?",
      "Show me the org chart structure",
      "Who works on my team?",
    ],
    department: [
      "Who leads this department?",
      "How many people are in each department?",
      "What projects is this department working on?",
    ],
    wiki: [
      "What documentation was recently updated?",
      "How do I request leave?",
      "Where can I find onboarding guides?",
    ],
    leave: [
      "What's my leave balance?",
      "How do I request time off?",
      "Who is on leave this week?",
    ],
    kpi: [
      "What are my current KPIs?",
      "How is my team performing?",
      "What goals are due this quarter?",
    ],
    announcements: [
      "What's the latest company news?",
      "Any upcoming events?",
      "Were there any policy changes recently?",
    ],
    chat: [
      "What were the recent discussions about?",
      "Any important messages I missed?",
      "What's trending in team chat?",
    ],
    projects: [
      "What projects am I assigned to?",
      "Who else is working on this project?",
      "What's the project deadline?",
    ],
    hierarchy: [
      "Who reports to me?",
      "Who is the CEO?",
      "What's the management structure?",
    ],
    offices: [
      "What offices do we have?",
      "Who works from the main office?",
      "What's the address of our office?",
    ],
    general: [
      "What can you help me with?",
      "Tell me about our company",
      "Who should I contact for help?",
    ],
  };

  const suggestions: string[] = [];
  
  // Add suggestions based on most frequent topics
  sortedTopics.forEach((topic) => {
    if (topicSuggestions[topic]) {
      const topicSugs = topicSuggestions[topic];
      // Pick a random suggestion from each topic
      const randomSug = topicSugs[Math.floor(Math.random() * topicSugs.length)];
      if (!suggestions.includes(randomSug)) {
        suggestions.push(randomSug);
      }
    }
  });

  // Add follow-up based on last question
  const lastQuestion = history[history.length - 1]?.question.toLowerCase() || "";
  if (lastQuestion.includes("who")) {
    suggestions.unshift("Tell me more about their role");
  } else if (lastQuestion.includes("what")) {
    suggestions.unshift("Can you explain in more detail?");
  } else if (lastQuestion.includes("how")) {
    suggestions.unshift("Are there any examples?");
  }

  // Fill remaining slots with general suggestions
  const generalSuggestions = [
    "What else should I know?",
    "Any related information?",
    "Who can help me with this?",
  ];

  while (suggestions.length < 4) {
    const remaining = generalSuggestions.shift();
    if (remaining && !suggestions.includes(remaining)) {
      suggestions.push(remaining);
    } else {
      break;
    }
  }

  return suggestions.slice(0, 4);
};

export const GlobalAskAI = ({ organizationId, isMobileFullscreen, onClose }: GlobalAskAIProps) => {
  const [isOpen, setIsOpen] = useState(isMobileFullscreen || false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationRecord[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation history from localStorage
  useEffect(() => {
    if (organizationId) {
      const key = `${STORAGE_KEY}_${organizationId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConversationHistory(parsed);
        } catch (e) {
          console.error("Failed to parse conversation history:", e);
        }
      }
    }
  }, [organizationId]);

  // Save conversation history to localStorage
  const saveToHistory = (question: string) => {
    if (!organizationId) return;

    const topics = extractTopics(question);
    const newRecord: ConversationRecord = {
      question,
      timestamp: Date.now(),
      topics,
    };

    const updatedHistory = [...conversationHistory, newRecord].slice(-MAX_HISTORY_ITEMS);
    setConversationHistory(updatedHistory);

    const key = `${STORAGE_KEY}_${organizationId}`;
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Clear messages when sheet opens
  useEffect(() => {
    if (isOpen || isMobileFullscreen) {
      setMessages([]);
      setInput("");
    }
  }, [isOpen, isMobileFullscreen]);

  // Generate smart suggestions based on history
  const smartSuggestions = useMemo(() => {
    return generateSmartSuggestions(conversationHistory);
  }, [conversationHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !organizationId) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Save to history for learning
    saveToHistory(userMessage);

    try {
      const { data, error } = await supabase.functions.invoke("global-ask-ai", {
        body: {
          question: userMessage,
          organizationId,
          conversationHistory: messages,
          // Include past questions for context
          pastQuestions: conversationHistory.slice(-5).map((r) => r.question),
        },
      });

      if (error) throw error;

      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (error: any) {
      console.error("AI error:", error);
      
      if (error?.message?.includes("429") || error?.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error?.message?.includes("402") || error?.status === 402) {
        toast.error("AI credits exhausted. Please contact admin.");
      } else {
        toast.error("Failed to get AI response");
      }
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const recentQuestions = conversationHistory.slice(-3).reverse();

  // Mobile fullscreen content
  const renderContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>Answers are based on your GlobalyOS data (Wiki, Team, Chat).</span>
      </div>

      {/* Smart Suggestions Bar */}
      {messages.length === 0 && smartSuggestions.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="font-medium">Suggested for you</span>
            {conversationHistory.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Based on your history
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {smartSuggestions.slice(0, 2).map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="text-xs px-2.5 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors truncate max-w-full"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 mt-4 pr-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-4 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Ask anything about your organization</p>
                <p className="text-xs mt-1">I can search Wiki, Team directory, and Chat.</p>
              </div>

              {/* Recent Questions */}
              {recentQuestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    <span className="font-medium">Recent questions</span>
                  </div>
                  {recentQuestions.map((record, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(record.question)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors truncate"
                    >
                      {record.question}
                    </button>
                  ))}
                </div>
              )}

              {/* Try Asking */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Try asking:</p>
                {smartSuggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="block w-full text-left text-sm px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Follow-up suggestions after response */}
              {!isLoading && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
                <div className="pt-2 space-y-1.5">
                  <p className="text-xs text-muted-foreground">Follow up:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {smartSuggestions.slice(0, 3).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(q)}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          disabled={isLoading || !organizationId}
          className="h-12"
        />
        <Button size="icon" className="h-12 w-12" onClick={handleSend} disabled={isLoading || !input.trim() || !organizationId}>
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  // Mobile fullscreen mode
  if (isMobileFullscreen) {
    return (
      <div className="flex flex-col h-full safe-area-top safe-area-bottom">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">Ask AI</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 px-4 py-4 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    );
  }

  // Desktop sheet mode
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="h-10 w-10"
              disabled={!organizationId}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ask AI</p>
        </TooltipContent>
      </Tooltip>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask AI
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 mt-2 overflow-hidden">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
};
