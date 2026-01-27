import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ConversationView from "@/components/chat/ConversationView";
import ChatRightPanelEnhanced from "@/components/chat/ChatRightPanelEnhanced";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import NewChatDialog from "@/components/chat/NewChatDialog";
import CreateSpaceDialog from "@/components/chat/CreateSpaceDialog";
import MentionsView from "@/components/chat/MentionsView";
import StarredView from "@/components/chat/StarredView";
import MobileChatHome from "@/components/chat/MobileChatHome";
import QuickSwitcher from "@/components/chat/QuickSwitcher";
import ThreadView from "@/components/chat/ThreadView";
import { useChatKeyboardShortcuts } from "@/hooks/useChatKeyboardShortcuts";
import type { ActiveChat, ChatMessage } from "@/types/chat";
import { useIsMobile } from "@/hooks/use-mobile";

const Chat = () => {
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | undefined>(undefined);
  const [showMobileRightPanel, setShowMobileRightPanel] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [recentChats, setRecentChats] = useState<ActiveChat[]>([]);
  const [activeThreadMessage, setActiveThreadMessage] = useState<ChatMessage | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const isMobile = useIsMobile();

  // Keyboard shortcuts
  useChatKeyboardShortcuts({
    onQuickSwitcher: () => setQuickSwitcherOpen(true),
    onNewMessage: () => setNewChatOpen(true),
    onMentions: () => setActiveChat({ type: 'mentions', id: 'mentions', name: 'Mentions' }),
    enabled: !isMobile,
  });

  // Reset mobile right panel and thread when chat changes
  useEffect(() => {
    setShowMobileRightPanel(false);
    setActiveThreadMessage(null);
  }, [activeChat?.id]);

  // Track recent chats
  useEffect(() => {
    if (activeChat && activeChat.type !== 'mentions' && activeChat.type !== 'starred') {
      setRecentChats(prev => {
        const filtered = prev.filter(c => c.id !== activeChat.id);
        return [activeChat, ...filtered].slice(0, 5);
      });
    }
  }, [activeChat]);

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
          onToggleRightPanel={() => {}}
          highlightMessageId={highlightMessageId}
          onOpenThread={setActiveThreadMessage}
          activeThreadMessage={activeThreadMessage}
          isFullWidth={isFullWidth}
          onToggleFullWidth={() => setIsFullWidth(prev => !prev)}
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
    !isMobile &&
    !isFullWidth;

  // Mobile view
  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-background safe-area-top">
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
          <>
            <div className="flex-1 flex flex-col overflow-hidden">
              <ConversationView
                activeChat={activeChat}
                onBack={handleBack}
                onToggleRightPanel={() => setShowMobileRightPanel(true)}
                highlightMessageId={highlightMessageId}
                onOpenThread={setActiveThreadMessage}
                activeThreadMessage={activeThreadMessage}
              />
            </div>
            {/* Mobile Right Panel Overlay */}
            {showMobileRightPanel && (
              <div className="absolute inset-0 z-50 bg-background">
                <ChatRightPanelEnhanced
                  activeChat={activeChat}
                  onClose={() => setShowMobileRightPanel(false)}
                  onBack={handleBack}
                  isMobileOverlay
                />
              </div>
            )}
          </>
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
    <div className="flex h-full overflow-hidden bg-background">
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

      {/* Right Panel - Thread OR Info (desktop) */}
      {showRightPanelCondition && (
        activeThreadMessage ? (
          <ThreadView
            parentMessage={activeThreadMessage}
            conversationId={activeChat.type === 'conversation' ? activeChat.id : null}
            spaceId={activeChat.type === 'space' ? activeChat.id : null}
            onClose={() => setActiveThreadMessage(null)}
          />
        ) : (
          <ChatRightPanelEnhanced
            activeChat={activeChat}
            onClose={() => {}}
            onBack={handleBack}
          />
        )
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
      <QuickSwitcher
        open={quickSwitcherOpen}
        onOpenChange={setQuickSwitcherOpen}
        onSelectChat={handleSelectChat}
        recentChats={recentChats}
      />
    </div>
  );
};

export default Chat;
