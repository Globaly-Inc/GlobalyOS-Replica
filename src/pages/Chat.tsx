import { useState } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ConversationView from "@/components/chat/ConversationView";
import ChatRightPanel from "@/components/chat/ChatRightPanel";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import NewChatDialog from "@/components/chat/NewChatDialog";
import CreateSpaceDialog from "@/components/chat/CreateSpaceDialog";
import MentionsView from "@/components/chat/MentionsView";
import StarredView from "@/components/chat/StarredView";
import MobileChatHome from "@/components/chat/MobileChatHome";
import type { ActiveChat } from "@/types/chat";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Chat = () => {
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | undefined>(undefined);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSelectChat = (chat: ActiveChat, messageId?: string) => {
    setActiveChat(chat);
    setHighlightMessageId(messageId);
    // Clear highlight after a delay
    if (messageId) {
      setTimeout(() => setHighlightMessageId(undefined), 3000);
    }
  };

  const handleBack = () => {
    setActiveChat(null);
    setHighlightMessageId(undefined);
  };

  const handleChatCreated = (chat: ActiveChat) => {
    setActiveChat(chat);
  };

  const renderMainContent = () => {
    if (activeChat?.type === 'mentions') {
      return <MentionsView onNavigateToChat={handleSelectChat} />;
    }

    if (activeChat?.type === 'starred') {
      return <StarredView onNavigateToChat={handleSelectChat} />;
    }

    if (activeChat) {
      return (
        <ConversationView
          activeChat={activeChat}
          onBack={handleBack}
          onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
          highlightMessageId={highlightMessageId}
        />
      );
    }

    return (
      <ChatEmptyState 
        onNewChat={() => setNewChatOpen(true)} 
        onNewSpace={() => setCreateSpaceOpen(true)}
      />
    );
  };

  const showRightPanelCondition = activeChat && 
    activeChat.type !== 'mentions' && 
    activeChat.type !== 'starred' && 
    showRightPanel && 
    !isMobile;

  // Mobile view
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden bg-background">
        {!activeChat ? (
          <MobileChatHome
            onSelectChat={handleSelectChat}
            onNewChat={() => setNewChatOpen(true)}
            onNewSpace={() => setCreateSpaceOpen(true)}
          />
        ) : activeChat.type === 'mentions' ? (
          <div className="flex-1 overflow-hidden">
            <MentionsView onNavigateToChat={handleSelectChat} onBack={handleBack} />
          </div>
        ) : activeChat.type === 'starred' ? (
          <div className="flex-1 overflow-hidden">
            <StarredView onNavigateToChat={handleSelectChat} onBack={handleBack} />
          </div>
        ) : (
          <ConversationView
            activeChat={activeChat}
            onBack={handleBack}
            onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
            highlightMessageId={highlightMessageId}
          />
        )}

        {/* Dialogs */}
        <NewChatDialog
          open={newChatOpen}
          onOpenChange={setNewChatOpen}
          onChatCreated={handleChatCreated}
        />
        <CreateSpaceDialog
          open={createSpaceOpen}
          onOpenChange={setCreateSpaceOpen}
          onSpaceCreated={handleChatCreated}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-border h-full overflow-hidden">
        <ChatSidebar
          activeChat={activeChat}
          onSelectChat={handleSelectChat}
          onNewChat={() => setNewChatOpen(true)}
          onNewSpace={() => setCreateSpaceOpen(true)}
        />
      </div>

      {/* Center - Main Content View */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {renderMainContent()}
      </div>

      {/* Right Panel - Pinned messages/resources */}
      {showRightPanelCondition && (
        <div className="w-80 flex-shrink-0 border-l border-border h-full overflow-hidden">
          <ChatRightPanel
            activeChat={activeChat}
            onClose={() => setShowRightPanel(false)}
          />
        </div>
      )}

      {/* Dialogs */}
      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onChatCreated={handleChatCreated}
      />
      <CreateSpaceDialog
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
        onSpaceCreated={handleChatCreated}
      />
    </div>
  );
};

export default Chat;
