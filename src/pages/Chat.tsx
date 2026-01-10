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
import { useChatKeyboardShortcuts } from "@/hooks/useChatKeyboardShortcuts";
import type { ActiveChat } from "@/types/chat";
import { useIsMobile } from "@/hooks/use-mobile";

const Chat = () => {
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | undefined>(undefined);
  const [showRightPanel, setShowRightPanel] = useState(() => {
    // Default to showing right panel on desktop
    const stored = localStorage.getItem('chat-right-panel-visible');
    return stored !== null ? stored === 'true' : true;
  });
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [recentChats, setRecentChats] = useState<ActiveChat[]>([]);
  const isMobile = useIsMobile();

  // Keyboard shortcuts
  useChatKeyboardShortcuts({
    onQuickSwitcher: () => setQuickSwitcherOpen(true),
    onNewMessage: () => setNewChatOpen(true),
    onMentions: () => setActiveChat({ type: 'mentions', id: 'mentions', name: 'Mentions' }),
    enabled: !isMobile,
  });

  // Persist right panel preference
  useEffect(() => {
    localStorage.setItem('chat-right-panel-visible', String(showRightPanel));
  }, [showRightPanel]);

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
          <div className="flex-1 flex flex-col overflow-hidden">
            <ConversationView
              activeChat={activeChat}
              onBack={handleBack}
              onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
              highlightMessageId={highlightMessageId}
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

      {/* Right Panel - Enhanced with all info */}
      {showRightPanelCondition && (
        <ChatRightPanelEnhanced
          activeChat={activeChat}
          onClose={() => setShowRightPanel(false)}
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
