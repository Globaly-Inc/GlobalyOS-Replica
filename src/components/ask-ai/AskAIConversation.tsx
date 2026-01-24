import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Loader2, Sparkles, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIMessages, useAddMessage, useRenameConversation, AIConversation, AIMessage } from "@/services/useAIConversations";
import { useAIParticipants, useAIInternalNotes, useAddInternalNote } from "@/services/useAISharing";
import { AskAIMessageBubble } from "./AskAIMessageBubble";
import { AskAIInput } from "./AskAIInput";
import { AskAIFollowUpSuggestions } from "./AskAIFollowUpSuggestions";
import { AskAIShareDialog } from "./AskAIShareDialog";
import { AskAIParticipants } from "./AskAIParticipants";
import { AskAIInternalNote, InternalNote } from "./AskAIInternalNote";
import { AskAITypingIndicator, ProcessingPhase } from "./AskAITypingIndicator";
import { AskAIRightPanel } from "./AskAIRightPanel";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>("analyzing");
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation.title);
  const [isShared, setIsShared] = useState(conversation.is_shared || false);
  const [visibility, setVisibility] = useState<"private" | "team" | "specific">(
    conversation.visibility || "private"
  );
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
    setProcessingPhase("analyzing");

    try {
      // Add user message (skip if regenerating)
      if (!isRegenerate) {
        await addMessage.mutateAsync({
          conversationId: conversation.id,
          role: "user",
          content,
        });
      }

      // Progress through phases
      setTimeout(() => setProcessingPhase("fetching_context"), 800);
      setTimeout(() => setProcessingPhase("searching_wiki"), 1500);
      setTimeout(() => setProcessingPhase("generating"), 2500);

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

  // Pin message mutation
  const pinMessageMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("ai_messages")
        .update({ is_pinned: isPinned })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("Message updated");
    },
  });

  const handlePinMessage = (messageId: string, isPinned: boolean) => {
    pinMessageMutation.mutate({ messageId, isPinned });
  };

  // Combine messages and notes for timeline display
  const timelineItems = useMemo(() => [
    ...messages.map((m) => ({ type: "message" as const, data: m, timestamp: m.created_at })),
    ...internalNotes.map((n) => ({ type: "note" as const, data: n, timestamp: n.created_at })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), [messages, internalNotes]);

  // Filter timeline items based on search query
  const filteredTimelineItems = useMemo(() => {
    if (!searchQuery.trim()) return timelineItems;
    
    const query = searchQuery.toLowerCase();
    return timelineItems.filter((item) => {
      return item.data.content.toLowerCase().includes(query);
    });
  }, [timelineItems, searchQuery]);

  // Get pinned messages for right panel
  const pinnedMessages = useMemo(() => 
    messages.filter((m) => (m as AIMessage & { is_pinned?: boolean }).is_pinned),
    [messages]
  );

  // Get the last AI message for follow-up suggestions
  const lastAIMessage = messages.filter(m => m.role === "assistant").pop();

  const ownerProfile = currentEmployee?.profiles as { full_name: string; avatar_url: string | null } | undefined;
  const userAvatarUrl = ownerProfile?.avatar_url || undefined;
  const userName = ownerProfile?.full_name || "You";

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
          onClick={() => setShowSearch(!showSearch)}
          className={cn(showSearch && "bg-muted")}
        >
          <Search className="h-4 w-4" />
        </Button>
        
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 pr-8"
              autoFocus
            />
            {searchQuery && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-1">
              {filteredTimelineItems.length} result{filteredTimelineItems.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      )}

      {/* Main content area - two columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column - messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-4 space-y-1">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTimelineItems.length === 0 && searchQuery ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">No results found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : timelineItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20 text-ai" />
                  <p className="text-sm">Start the conversation</p>
                  <p className="text-xs mt-1">Ask anything about your organization</p>
                </div>
              ) : (
                filteredTimelineItems.map((item) => (
                  <div key={`${item.type}-${item.data.id}`}>
                    {item.type === "message" ? (
                      <AskAIMessageBubble
                        message={item.data as AIMessage & { is_pinned?: boolean }}
                        userName={userName}
                        userAvatarUrl={userAvatarUrl}
                        onRegenerate={item.data.role === "assistant" ? () => handleRegenerate(
                          messages.findIndex((m) => m.id === item.data.id)
                        ) : undefined}
                        onPinMessage={item.data.role === "assistant" ? handlePinMessage : undefined}
                        isRegenerating={regeneratingIndex === messages.findIndex((m) => m.id === item.data.id)}
                      />
                    ) : (
                      <AskAIInternalNote note={item.data as InternalNote} />
                    )}
                  </div>
                ))
              )}

              {isGenerating && (
                <AskAITypingIndicator phase={processingPhase} />
              )}

              {/* Follow-up suggestions */}
              {!isGenerating && messages && messages.length > 0 && (
                <AskAIFollowUpSuggestions
                  messages={messages}
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
            <AskAIInput
              onSend={handleSend}
              onAddNote={handleAddNote}
              isLoading={isGenerating}
              disabled={!currentOrg?.id}
              showNoteMode={isShared || participants.length > 0}
            />
          </div>
        </div>

        {/* Right panel - always visible on desktop */}
        {!isMobile && (
          <AskAIRightPanel
            conversation={conversation}
            messages={messages as (AIMessage & { is_pinned?: boolean })[]}
            pinnedMessages={pinnedMessages as (AIMessage & { is_pinned?: boolean })[]}
            onUnpinMessage={(messageId) => handlePinMessage(messageId, false)}
          />
        )}
      </div>
    </div>
  );
};
