import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIMessages, useAddMessage, useRenameConversation, AIConversation } from "@/services/useAIConversations";
import { AskAIMessageBubble } from "./AskAIMessageBubble";
import { AskAIInput } from "./AskAIInput";
import { AskAIFollowUpSuggestions } from "./AskAIFollowUpSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AskAIConversationProps {
  conversation: AIConversation;
  onBack?: () => void;
  isMobile?: boolean;
}

export const AskAIConversation = ({
  conversation,
  onBack,
  isMobile,
}: AskAIConversationProps) => {
  const { currentOrg } = useOrganization();
  const { data: messages = [], isLoading: messagesLoading, refetch } = useAIMessages(conversation.id);
  const addMessage = useAddMessage();
  const renameConversation = useRenameConversation();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation.title);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ai-messages-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, refetch]);

  const sendMessage = async (content: string, isRegenerate = false) => {
    if (!currentOrg?.id) return;

    setIsGenerating(true);

    try {
      // Add user message (skip if regenerating)
      if (!isRegenerate) {
        await addMessage.mutateAsync({
          conversationId: conversation.id,
          role: "user",
          content,
        });
      }

      // Build conversation history (exclude last AI message if regenerating)
      let history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (isRegenerate && history.length > 0) {
        // Remove the last AI response we're regenerating
        history = history.slice(0, -1);
      } else {
        // Add the new user message to history
        history = [...history, { role: "user", content }];
      }

      // Get AI response
      const { data, error } = await supabase.functions.invoke("global-ask-ai", {
        body: {
          question: content,
          organizationId: currentOrg.id,
          conversationId: conversation.id,
          conversationHistory: history,
        },
      });

      if (error) {
        if (error.message?.includes("429")) {
          toast.error("Monthly AI query limit reached");
        } else {
          throw error;
        }
        return;
      }

      // Add AI response
      await addMessage.mutateAsync({
        conversationId: conversation.id,
        role: "assistant",
        content: data.answer,
        metadata: data.sources ? { sources: data.sources } : undefined,
      });

      // Auto-generate title if this is the first exchange and title is default
      if (messages.length === 0 && conversation.title === "New Conversation") {
        const titlePrompt = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        renameConversation.mutate({ id: conversation.id, title: titlePrompt });
      }
    } catch (error: unknown) {
      console.error("AI error:", error);
      toast.error("Failed to get AI response. Please try again.");
    } finally {
      setIsGenerating(false);
      setRegeneratingIndex(null);
    }
  };

  const handleSend = async (content: string) => {
    await sendMessage(content, false);
  };

  const handleRegenerate = async (messageIndex: number) => {
    // Find the user message before this AI message
    const aiMessage = messages[messageIndex];
    if (aiMessage.role !== "assistant") return;

    // Find the preceding user message
    let userMessage = "";
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userMessage = messages[i].content;
        break;
      }
    }

    if (!userMessage) return;

    setRegeneratingIndex(messageIndex);
    await sendMessage(userMessage, true);
  };

  const handleSaveTitle = () => {
    if (titleInput.trim() && titleInput !== conversation.title) {
      renameConversation.mutate({ id: conversation.id, title: titleInput.trim() });
    }
    setEditingTitle(false);
  };

  // Get the last AI message for follow-up suggestions
  const lastAIMessage = messages.filter(m => m.role === "assistant").pop();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        {(isMobile || onBack) && (
          <Button size="icon" variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Sparkles className="h-5 w-5 text-ai shrink-0" />
        {editingTitle ? (
          <Input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") {
                setTitleInput(conversation.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
            className="h-8 text-sm font-medium flex-1"
          />
        ) : (
          <h2
            className="font-medium truncate cursor-pointer hover:text-ai transition-colors flex-1"
            onClick={() => {
              setTitleInput(conversation.title);
              setEditingTitle(true);
            }}
          >
            {conversation.title}
          </h2>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => refetch()}
          disabled={messagesLoading}
        >
          <RefreshCw className={cn("h-4 w-4", messagesLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-6 max-w-3xl mx-auto">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20 text-ai" />
              <p className="text-sm">Start the conversation</p>
              <p className="text-xs mt-1">Ask anything about your organization</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id} className="group">
                <AskAIMessageBubble
                  message={message}
                  onRegenerate={message.role === "assistant" ? () => handleRegenerate(index) : undefined}
                  isRegenerating={regeneratingIndex === index}
                />
              </div>
            ))
          )}

          {isGenerating && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-ai/20 to-ai/5">
                <Sparkles className="h-4 w-4 text-ai" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          {/* Follow-up suggestions */}
          {!isGenerating && lastAIMessage && (
            <AskAIFollowUpSuggestions
              lastMessage={lastAIMessage.content}
              onSelect={handleSend}
              disabled={isGenerating}
              className="mt-4"
            />
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <AskAIInput
            onSend={handleSend}
            isLoading={isGenerating}
            disabled={!currentOrg?.id}
          />
        </div>
      </div>
    </div>
  );
};
