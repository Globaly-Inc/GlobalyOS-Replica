import { useState, useMemo } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import {
  useInboxConversations,
  useInboxMessages,
  useSendInboxMessage,
  useUpdateConversation,
  useInboxAIDraft,
} from '@/hooks/useInbox';
import { useInboxRealtime } from '@/hooks/useInboxRealtime';
import { useInboxPresence } from '@/hooks/useInboxPresence';
import { InboxConversationList } from '@/components/inbox/InboxConversationList';
import { InboxThread } from '@/components/inbox/InboxThread';
import { InboxComposer } from '@/components/inbox/InboxComposer';
import { InboxContactPanel } from '@/components/inbox/InboxContactPanel';
import { InboxSubNav } from '@/components/inbox/InboxSubNav';
import { CollisionIndicator } from '@/components/inbox/CollisionIndicator';
import { toast } from 'sonner';
import type { InboxConversationStatus, InboxChannelType } from '@/types/inbox';

const InboxPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<InboxConversationStatus | undefined>('open');
  const [channelFilter, setChannelFilter] = useState<InboxChannelType | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Realtime
  useInboxRealtime();

  // Presence / collision prevention
  const { viewingAgents, typingAgents, setTyping } = useInboxPresence(activeConversationId);

  // Queries
  const { data: conversations = [], isLoading: convsLoading } = useInboxConversations({
    status: statusFilter,
    channelType: channelFilter,
  });

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const { data: messages = [], isLoading: msgsLoading } = useInboxMessages(activeConversationId);

  // Check WhatsApp 24h window
  const windowExpired = useMemo(() => {
    if (activeConversation?.channel_type !== 'whatsapp') return false;
    const windowEnd = (activeConversation?.metadata as { window_open_until?: string })?.window_open_until;
    if (!windowEnd) return true;
    return new Date(windowEnd) < new Date();
  }, [activeConversation]);

  // Mutations
  const sendMessage = useSendInboxMessage();
  const updateConversation = useUpdateConversation();
  const aiDraft = useInboxAIDraft();

  const handleSend = (text: string) => {
    if (!activeConversationId || !orgId) return;
    sendMessage.mutate(
      { conversationId: activeConversationId, orgId, content: text },
      {
        onError: () => toast.error('Failed to send message'),
      }
    );
  };

  const handleSendNote = (text: string) => {
    if (!activeConversationId || !orgId) return;
    sendMessage.mutate(
      { conversationId: activeConversationId, orgId, content: text, msgType: 'note' },
      {
        onError: () => toast.error('Failed to add note'),
      }
    );
  };

  const handleAIDraft = async (): Promise<string | undefined> => {
    if (!activeConversationId || !orgId) return undefined;
    const chatMessages = messages.map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: (m.content as { body?: string })?.body || '',
    }));
    const result = await aiDraft.mutateAsync({
      conversationId: activeConversationId,
      orgId,
      messages: chatMessages,
    });
    return result?.reply;
  };

  const handleAttachment = (file: File) => {
    // TODO: Upload to storage bucket and send as media message
    toast.info(`Attachment support coming soon: ${file.name}`);
  };

  const handleUpdateStatus = (status: InboxConversationStatus) => {
    if (!activeConversationId) return;
    updateConversation.mutate(
      { conversationId: activeConversationId, updates: { status } },
      {
        onSuccess: () => toast.success(`Conversation ${status}`),
        onError: () => toast.error('Failed to update'),
      }
    );
  };

  const handleAssign = (userId: string | null) => {
    if (!activeConversationId) return;
    updateConversation.mutate(
      { conversationId: activeConversationId, updates: { assigned_to: userId } },
    );
  };

  const handleUpdateTags = (tags: string[]) => {
    if (!activeConversationId) return;
    updateConversation.mutate(
      { conversationId: activeConversationId, updates: { tags } },
    );
  };

  const handleUpdatePriority = (priority: string) => {
    if (!activeConversationId) return;
    updateConversation.mutate(
      { conversationId: activeConversationId, updates: { priority } },
    );
  };

  return (
    <div>
      <InboxSubNav />
      <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-lg border border-border bg-card m-4">
        {/* Left: Conversation list */}
        <div className="w-80 flex-shrink-0">
          <InboxConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={setActiveConversationId}
            isLoading={convsLoading}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            channelFilter={channelFilter}
            onChannelFilterChange={setChannelFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Center: Thread + Composer */}
        <div className="flex-1 flex flex-col min-w-0">
          <CollisionIndicator viewingAgents={viewingAgents} typingAgents={typingAgents} />
          <InboxThread
            conversation={activeConversation}
            messages={messages}
            isLoading={msgsLoading}
          />
          {activeConversation && (
            <InboxComposer
              onSend={handleSend}
              onSendNote={handleSendNote}
              onAIDraft={handleAIDraft}
              onAttachment={handleAttachment}
              onTypingChange={setTyping}
              isSending={sendMessage.isPending}
              isAIDrafting={aiDraft.isPending}
              disabled={activeConversation.status === 'closed'}
              channelType={activeConversation.channel_type}
              windowExpired={windowExpired}
            />
          )}
        </div>

        {/* Right: Contact panel */}
        <div className="w-72 flex-shrink-0 hidden lg:block">
          <InboxContactPanel
            conversation={activeConversation}
            onUpdateStatus={handleUpdateStatus}
            onAssign={handleAssign}
            onUpdateTags={handleUpdateTags}
            onUpdatePriority={handleUpdatePriority}
          />
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
