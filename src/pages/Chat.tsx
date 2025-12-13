import { useState } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ConversationView from "@/components/chat/ConversationView";
import ChatRightPanel from "@/components/chat/ChatRightPanel";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import NewChatDialog from "@/components/chat/NewChatDialog";
import CreateSpaceDialog from "@/components/chat/CreateSpaceDialog";
import type { ActiveChat } from "@/types/chat";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Chat = () => {
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSelectChat = (chat: ActiveChat) => {
    setActiveChat(chat);
  };

  const handleBack = () => {
    setActiveChat(null);
  };

  const handleChatCreated = (chat: ActiveChat) => {
    setActiveChat(chat);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Left Sidebar - hide on mobile when chat is active */}
      <div className={cn(
        "w-72 flex-shrink-0 border-r border-border",
        isMobile && activeChat && "hidden"
      )}>
        <ChatSidebar
          activeChat={activeChat}
          onSelectChat={handleSelectChat}
          onNewChat={() => setNewChatOpen(true)}
          onNewSpace={() => setCreateSpaceOpen(true)}
        />
      </div>

      {/* Center - Conversation View */}
      <div className={cn(
        "flex-1 min-w-0",
        isMobile && !activeChat && "hidden"
      )}>
        {activeChat ? (
          <ConversationView
            activeChat={activeChat}
            onBack={handleBack}
            onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
          />
        ) : (
          <ChatEmptyState 
            onNewChat={() => setNewChatOpen(true)} 
            onNewSpace={() => setCreateSpaceOpen(true)}
          />
        )}
      </div>

      {/* Right Panel - Pinned messages/resources */}
      {activeChat && showRightPanel && !isMobile && (
        <div className="w-80 flex-shrink-0 border-l border-border">
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
