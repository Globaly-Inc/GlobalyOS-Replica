import { useState, useRef, useEffect, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Lightbulb, 
  History,
  MessageCircle
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConversationRecord {
  question: string;
  timestamp: number;
  topics: string[];
}

const STORAGE_KEY = "globalai_conversation_history";
const MAX_HISTORY_ITEMS = 50;

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

const generateSmartSuggestions = (history: ConversationRecord[]): string[] => {
  if (history.length === 0) {
    return [
      "Who works in the Engineering department?",
      "What are our company policies?",
      "Show me recent announcements",
      "Who is my team lead?",
    ];
  }

  const recentHistory = history.slice(-10);
  const topicCounts: Record<string, number> = {};
  
  recentHistory.forEach((record) => {
    record.topics.forEach((topic) => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });

  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  const topicSuggestions: Record<string, string[]> = {
    team: ["Who recently joined?", "Show org chart", "Who is on my team?"],
    department: ["Who leads this department?", "Department headcount?"],
    wiki: ["Recent documentation?", "How do I request leave?"],
    leave: ["My leave balance?", "How to request time off?"],
    kpi: ["My current KPIs?", "Team performance?"],
    announcements: ["Latest company news?", "Upcoming events?"],
    chat: ["Recent discussions?", "Important messages?"],
    projects: ["My projects?", "Project deadlines?"],
    hierarchy: ["Who reports to me?", "Management structure?"],
    offices: ["Office locations?", "Main office address?"],
    general: ["What can you help with?", "About our company?"],
  };

  const suggestions: string[] = [];
  
  sortedTopics.forEach((topic) => {
    if (topicSuggestions[topic]) {
      const topicSugs = topicSuggestions[topic];
      const randomSug = topicSugs[Math.floor(Math.random() * topicSugs.length)];
      if (!suggestions.includes(randomSug)) {
        suggestions.push(randomSug);
      }
    }
  });

  const lastQuestion = history[history.length - 1]?.question.toLowerCase() || "";
  if (lastQuestion.includes("who")) {
    suggestions.unshift("Tell me more about their role");
  } else if (lastQuestion.includes("what")) {
    suggestions.unshift("Explain in more detail?");
  }

  const generalSuggestions = ["What else should I know?", "Any related info?"];

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

const AskAI = () => {
  const { currentOrg } = useOrganization();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationRecord[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentOrg?.id) {
      const key = `${STORAGE_KEY}_${currentOrg.id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          setConversationHistory(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse conversation history:", e);
        }
      }
    }
  }, [currentOrg?.id]);

  const saveToHistory = (question: string) => {
    if (!currentOrg?.id) return;

    const topics = extractTopics(question);
    const newRecord: ConversationRecord = {
      question,
      timestamp: Date.now(),
      topics,
    };

    const updatedHistory = [...conversationHistory, newRecord].slice(-MAX_HISTORY_ITEMS);
    setConversationHistory(updatedHistory);

    const key = `${STORAGE_KEY}_${currentOrg.id}`;
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const smartSuggestions = useMemo(() => {
    return generateSmartSuggestions(conversationHistory);
  }, [conversationHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentOrg?.id) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    saveToHistory(userMessage);

    try {
      const { data, error } = await supabase.functions.invoke("global-ask-ai", {
        body: {
          question: userMessage,
          organizationId: currentOrg.id,
          conversationHistory: messages,
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const recentQuestions = conversationHistory.slice(-3).reverse();

  return (
    <div className="min-h-screen pb-40 md:pb-24">
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <PageHeader title="Ask AI" />
        </div>

        {/* Info Card */}
        <Card className="mb-4">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">
              Get answers based on your organization data — Wiki, Team directory, and Chat.
            </p>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              {/* Empty State */}
              <div className="text-center py-6">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-primary/50" />
                </div>
                <p className="text-sm text-muted-foreground">Ask anything about your organization</p>
              </div>

              {/* Suggestions */}
              {smartSuggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5" />
                    <span className="font-medium">Suggested questions</span>
                  </div>
                  <div className="space-y-2">
                    {smartSuggestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(q)}
                        className="block w-full text-left text-sm px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Questions */}
              {recentQuestions.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    <span className="font-medium">Recent questions</span>
                  </div>
                  {recentQuestions.map((record, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(record.question)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors truncate"
                    >
                      {record.question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              {/* Follow-up suggestions */}
              {!isLoading && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
                <div className="pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {smartSuggestions.slice(0, 3).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(q)}
                        className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 pb-safe">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isLoading || !currentOrg?.id}
            className="h-12 rounded-full px-4"
          />
          <Button 
            size="icon" 
            className="h-12 w-12 rounded-full shrink-0" 
            onClick={handleSend} 
            disabled={isLoading || !input.trim() || !currentOrg?.id}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskAI;