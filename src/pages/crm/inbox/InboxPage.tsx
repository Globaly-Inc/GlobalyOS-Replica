import { useState, useMemo, useCallback } from 'react';
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
import { logInboxActivity } from '@/hooks/useInboxActivity';
import { InboxConversationList } from '@/components/inbox/InboxConversationList';
import { InboxThread } from '@/components/inbox/InboxThread';
import { InboxComposer } from '@/components/inbox/InboxComposer';
import { InboxContactPanel } from '@/components/inbox/InboxContactPanel';

import { CollisionIndicator } from '@/components/inbox/CollisionIndicator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { InboxConversationStatus, InboxChannelType } from '@/types/inbox';

const InboxPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<InboxConversationStatus | undefined>('open');
  const [channelFilter, setChannelFilter] = useState<InboxChannelType | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string | undefined>();
  const [unreadOnly, setUnreadOnly] = useState(false);

  useInboxRealtime();
  const { viewingAgents, typingAgents, setTyping } = useInboxPresence(activeConversationId);

  const { data: conversations = [], isLoading: convsLoading } = useInboxConversations({
    status: statusFilter,
    channelType: channelFilter,
    assignedTo: assigneeFilter === 'me' ? 'CURRENT_USER' : assigneeFilter === 'unassigned' ? '__UNASSIGNED__' : undefined,
  });

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const { data: messages = [], isLoading: msgsLoading } = useInboxMessages(activeConversationId);

  const windowExpired = useMemo(() => {
    if (activeConversation?.channel_type !== 'whatsapp') return false;
    const windowEnd = (activeConversation?.metadata as { window_open_until?: string })?.window_open_until;
    if (!windowEnd) return true;
    return new Date(windowEnd) < new Date();
  }, [activeConversation]);

  const sendMessage = useSendInboxMessage();
  const updateConversation = useUpdateConversation();
  const aiDraft = useInboxAIDraft();

  const handleSend = (text: string) => {
    if (!activeConversationId || !orgId) return;
    sendMessage.mutate(
      { conversationId: activeConversationId, orgId, content: text },
      { onError: () => toast.error('Failed to send message') }
    );
  };

  const handleSendNote = (text: string) => {
    if (!activeConversationId || !orgId) return;
    sendMessage.mutate(
      { conversationId: activeConversationId, orgId, content: text, msgType: 'note' },
      {
        onSuccess: () => {
          logInboxActivity({ organizationId: orgId, conversationId: activeConversationId, action: 'note_added' });
        },
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
    if (result) {
      logInboxActivity({ organizationId: orgId, conversationId: activeConversationId, action: 'ai_draft', details: { confidence: result.confidence } });
    }
    return result?.reply;
  };

  const handleAttachment = useCallback(async (file: File) => {
    if (!activeConversationId || !orgId) return;
    const path = `${orgId}/${activeConversationId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('inbox-attachments')
      .upload(path, file);

    if (uploadError) {
      toast.error('Failed to upload file');
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('inbox-attachments')
      .getPublicUrl(path);

    // Send as media message
    sendMessage.mutate(
      {
        conversationId: activeConversationId,
        orgId,
        content: publicUrl,
        msgType: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
      },
      { onError: () => toast.error('Failed to send attachment') }
    );
  }, [activeConversationId, orgId, sendMessage]);

  const handleUpdateStatus = (status: InboxConversationStatus) => {
    if (!activeConversationId || !orgId) return;
    const prevStatus = activeConversation?.status;
    updateConversation.mutate(
      { conversationId: activeConversationId, updates: { status } },
      {
        onSuccess: () => {
          toast.success(`Conversation ${status}`);
          logInboxActivity({ organizationId: orgId, conversationId: activeConversationId, action: 'status_change', details: { from: prevStatus, to: status } });
        },
        onError: () => toast.error('Failed to update'),
      }
    );
  };

  const handleAssign = (userId: string | null) => {
    if (!activeConversationId || !orgId) return;
    updateConversation.mutate(
      { conversationId: activeConversationId, updates: { assigned_to: userId } },
      {
        onSuccess: () => {
          logInboxActivity({ organizationId: orgId, conversationId: activeConversationId, action: userId ? 'assigned' : 'unassigned' });
        },
      }
    );
  };

  const handleUpdateTags = (tags: string[]) => {
    if (!activeConversationId || !orgId) return;
    const prevTags = activeConversation?.tags || [];
    updateConversation.mutate(
      { conversationId: activeConversationId, updates: { tags } },
      {
        onSuccess: () => {
          const added = tags.filter((t) => !prevTags.includes(t));
          const removed = prevTags.filter((t) => !tags.includes(t));
          added.forEach((tag) => logInboxActivity({ organizationId: orgId, conversationId: activeConversationId, action: 'tag_add', details: { tag } }));
          removed.forEach((tag) => logInboxActivity({ organizationId: orgId, conversationId: activeConversationId, action: 'tag_remove', details: { tag } }));
        },
      }
    );
  };

  const handleUpdatePriority = (priority: string) => {
    if (!activeConversationId || !orgId) return;
    const prevPriority = activeConversation?.priority;
    updateConversation.mutate(
      { conversationId: activeConversationId, updates: { priority } },
      {
        onSuccess: () => {
          logInboxActivity({ organizationId: orgId, conversationId: activeConversationId, action: 'priority_change', details: { from: prevPriority, to: priority } });
        },
      }
    );
  };

  return (
    <div>
      <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-lg border border-border bg-card mt-4">
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
            assigneeFilter={assigneeFilter}
            onAssigneeFilterChange={setAssigneeFilter}
            unreadOnly={unreadOnly}
            onUnreadOnlyChange={setUnreadOnly}
          />
        </div>

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
