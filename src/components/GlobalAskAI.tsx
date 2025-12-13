import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GlobalAskAIProps {
  organizationId: string | undefined;
}

export const GlobalAskAI = ({ organizationId }: GlobalAskAIProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Clear messages when sheet opens
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInput("");
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !organizationId) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("global-ask-ai", {
        body: {
          question: userMessage,
          organizationId,
          conversationHistory: messages,
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

  const suggestedQuestions = [
    "Who works in the Engineering department?",
    "What are our company policies?",
    "Show me recent announcements",
    "Who is my team lead?",
  ];

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

        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground mt-2">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>Answers are based on your GlobalyOS data (Wiki, Team, Chat).</span>
        </div>

        <ScrollArea className="flex-1 mt-4 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-4 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Ask anything about your organization</p>
                  <p className="text-xs mt-1">I can search Wiki, Team directory, and Chat.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Try asking:</p>
                  {suggestedQuestions.map((q, i) => (
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
              messages.map((message, index) => (
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
              ))
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
          />
          <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim() || !organizationId}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
