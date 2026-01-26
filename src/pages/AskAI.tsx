import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/hooks/useOrganization";
import { AskAISidebar } from "@/components/ask-ai/AskAISidebar";
import { AskAIConversation } from "@/components/ask-ai/AskAIConversation";
import { AskAIEmptyState } from "@/components/ask-ai/AskAIEmptyState";
import { AskAIInput } from "@/components/ask-ai/AskAIInput";
import {
  useAIConversations,
  useCreateConversation,
  useAddMessage,
} from "@/services/useAIConversations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AskAI = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { currentOrg } = useOrganization();
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    searchParams.get("c") || null
  );
  
  const [isCreatingWithMessage, setIsCreatingWithMessage] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(!searchParams.get("c"));
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const { data: conversations = [] } = useAIConversations();
  const createConversation = useCreateConversation();
  const addMessage = useAddMessage();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    if (activeConversationId) {
      setSearchParams({ c: activeConversationId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [activeConversationId, setSearchParams]);

  const handleSelectConversation = (id: string | null) => {
    setActiveConversationId(id);
    if (isMobile) setShowMobileSidebar(false);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    if (isMobile) setShowMobileSidebar(false);
  };

  const handleSendFirstMessage = async (message: string) => {
    if (!currentOrg?.id) return;
    setIsCreatingWithMessage(true);

    try {
      // Create conversation and navigate immediately
      const conversation = await createConversation.mutateAsync("New Conversation");
      
      // Store pending message and navigate to conversation view
      setPendingMessage(message);
      setActiveConversationId(conversation.id);
      
      if (isMobile) setShowMobileSidebar(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast.error("Failed to start conversation");
    } finally {
      setIsCreatingWithMessage(false);
    }
  };
  
  const handlePendingMessageProcessed = () => {
    setPendingMessage(null);
  };

  const handleMobileBack = () => {
    setActiveConversationId(null);
    setShowMobileSidebar(true);
  };

  if (isMobile) {
    if (showMobileSidebar || !activeConversationId) {
      return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <AskAISidebar activeId={activeConversationId} onSelect={handleSelectConversation} onNewChat={handleNewChat} isMobile />
          {!activeConversationId && (
            <div className="flex-1 flex flex-col">
              <AskAIEmptyState onSendMessage={handleSendFirstMessage} isLoading={isCreatingWithMessage} />
              <div className="p-4 border-t">
                <AskAIInput onSend={handleSendFirstMessage} isLoading={isCreatingWithMessage} disabled={!currentOrg?.id} />
              </div>
            </div>
          )}
        </div>
      );
    }
    if (activeConversation) {
      return (
        <div className="h-[calc(100vh-8rem)]">
          <AskAIConversation 
            conversation={activeConversation} 
            onBack={handleMobileBack} 
            isMobile 
            pendingMessage={pendingMessage}
            onPendingMessageProcessed={handlePendingMessageProcessed}
          />
        </div>
      );
    }
    return <div className="flex items-center justify-center h-[calc(100vh-8rem)]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden">
      <AskAISidebar activeId={activeConversationId} onSelect={handleSelectConversation} onNewChat={handleNewChat} />
      <div className="flex-1 min-w-0 flex flex-col">
        {activeConversation ? (
          <AskAIConversation 
            conversation={activeConversation} 
            pendingMessage={pendingMessage}
            onPendingMessageProcessed={handlePendingMessageProcessed}
          />
        ) : (
          <>
            <div className="flex-1 overflow-auto"><AskAIEmptyState onSendMessage={handleSendFirstMessage} isLoading={isCreatingWithMessage} /></div>
            <div className="p-4 border-t bg-background"><div className="max-w-3xl mx-auto"><AskAIInput onSend={handleSendFirstMessage} isLoading={isCreatingWithMessage} disabled={!currentOrg?.id} /></div></div>
          </>
        )}
      </div>
    </div>
  );
};

export default AskAI;
