import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Loader2, Sparkles, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIMessages, useAddMessage, useRenameConversation, AIConversation } from "@/services/useAIConversations";
import { useAIParticipants, useAIInternalNotes, useAddInternalNote } from "@/services/useAISharing";
import { AskAIMessageBubble } from "./AskAIMessageBubble";
import { AskAIInput } from "./AskAIInput";
import { AskAIFollowUpSuggestions } from "./AskAIFollowUpSuggestions";
import { AskAIShareDialog } from "./AskAIShareDialog";
import { AskAIParticipants } from "./AskAIParticipants";
import { AskAIInternalNote, InternalNote } from "./AskAIInternalNote";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface AskAIConversationProps {
  conversation: AIConversation & {
    is_shared?: boolean;
    visibility?: "private" | "team" | "specific";
  };
  onBack?: () => void;
  isMobile?: boolean;
}

export const AskAIConversation = ({
  conversation,
  onBack,
  isMobile,
}: AskAIConversationProps) => {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { data: messages = [], isLoading: messagesLoading, refetch } = useAIMessages(conversation.id);
  const { data: participants = [], refetch: refetchParticipants } = useAIParticipants(conversation.id);
  const { data: internalNotes = [], refetch: refetchNotes } = useAIInternalNotes(conversation.id);
  const addMessage = useAddMessage();
  const addInternalNote = useAddInternalNote();
  const renameConversation = useRenameConversation();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation.title);
  const [isShared, setIsShared] = useState(conversation.is_shared || false);
  const [visibility, setVisibility] = useState<"private" | "team" | "specific">(
    conversation.visibility || "private"
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch current employee for author tracking
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", currentOrg?.id, user?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !user?.id) return null;
      const { data } = await supabase
        .from("employees")
        .select("id, profiles(full_name, avatar_url)")
        .eq("organization_id", currentOrg.id)
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!currentOrg?.id && !!user?.id,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, internalNotes, isGenerating]);

  // Set up realtime subscription for messages
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_internal_notes",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          refetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, refetch, refetchNotes]);

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

  const handleAddNote = async (content: string, mentionedEmployeeIds: string[]) => {
    if (!currentEmployee?.id) {
      toast.error("Unable to add note");
      return;
    }

    await addInternalNote.mutateAsync({
      conversationId: conversation.id,
      content,
      mentionedEmployeeIds,
      authorEmployeeId: currentEmployee.id,
    });
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

  const handleShareChange = (newIsShared: boolean, newVisibility: "private" | "team" | "specific") => {
    setIsShared(newIsShared);
    setVisibility(newVisibility);
  };

  // Combine messages and notes for timeline display
  const timelineItems = [
    ...messages.map((m) => ({ type: "message" as const, data: m, timestamp: m.created_at })),
    ...internalNotes.map((n) => ({ type: "note" as const, data: n, timestamp: n.created_at })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Get the last AI message for follow-up suggestions
  const lastAIMessage = messages.filter(m => m.role === "assistant").pop();

  const ownerProfile = currentEmployee?.profiles as { full_name: string; avatar_url: string | null } | undefined;

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

        {/* Participants Avatars */}
        {isShared && (
          <AskAIParticipants
            participants={participants}
            ownerName={ownerProfile?.full_name || "You"}
            ownerAvatar={ownerProfile?.avatar_url}
          />
        )}

        {/* Share Button */}
        <AskAIShareDialog
          conversationId={conversation.id}
          conversationTitle={conversation.title}
          isShared={isShared}
          visibility={visibility}
          participants={participants}
          ownerId={user?.id || ""}
          onShareChange={handleShareChange}
          onParticipantsChange={refetchParticipants}
        />

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
          ) : timelineItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20 text-ai" />
              <p className="text-sm">Start the conversation</p>
              <p className="text-xs mt-1">Ask anything about your organization</p>
            </div>
          ) : (
            timelineItems.map((item, index) => (
              <div key={`${item.type}-${item.data.id}`} className="group">
                {item.type === "message" ? (
                  <AskAIMessageBubble
                    message={item.data}
                    onRegenerate={item.data.role === "assistant" ? () => handleRegenerate(
                      messages.findIndex((m) => m.id === item.data.id)
                    ) : undefined}
                    isRegenerating={regeneratingIndex === messages.findIndex((m) => m.id === item.data.id)}
                  />
                ) : (
                  <AskAIInternalNote note={item.data as InternalNote} />
                )}
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
            onAddNote={handleAddNote}
            isLoading={isGenerating}
            disabled={!currentOrg?.id}
            showNoteMode={isShared || participants.length > 0}
          />
        </div>
      </div>
    </div>
  );
};
