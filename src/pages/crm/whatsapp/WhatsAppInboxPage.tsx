import { useState } from 'react';
import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { useOrganization } from '@/hooks/useOrganization';
import {
  useWaConversations,
  useWaMessages,
  useWaContact,
  useSendWaMessage,
  useResolveConversation,
  useWaRealtimeInbox,
} from '@/hooks/useWhatsAppInbox';
import ConversationList from '@/components/whatsapp/ConversationList';
import ChatThread from '@/components/whatsapp/ChatThread';
import ContactProfilePanel from '@/components/whatsapp/ContactProfilePanel';
import { MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WaConversation, WaContact } from '@/types/whatsapp';

type ConvWithContact = WaConversation & { wa_contacts: WaContact };

const WhatsAppInboxPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  const [selectedConv, setSelectedConv] = useState<ConvWithContact | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Get connected account for sending
  const { data: waAccount } = useQuery({
    queryKey: ['wa-account', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from('wa_accounts')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('status', 'connected')
        .maybeSingle();
      return data;
    },
  });

  const { data: conversations = [], isLoading } = useWaConversations(orgId);
  const { data: messages = [] } = useWaMessages(selectedConv?.id);
  const { data: contact } = useWaContact(selectedConv?.wa_contact_id);
  const sendMutation = useSendWaMessage();
  const resolveMutation = useResolveConversation();

  useWaRealtimeInbox(orgId);

  const handleSend = (body: string) => {
    if (!selectedConv || !orgId || !waAccount || !contact) return;
    sendMutation.mutate({
      conversationId: selectedConv.id,
      orgId,
      contactPhone: contact.phone,
      phoneNumberId: waAccount.phone_number_id,
      body,
    });
  };

  const handleResolve = () => {
    if (!selectedConv) return;
    resolveMutation.mutate(selectedConv.id);
  };

  if (!orgId) return null;

  // No account connected
  if (!waAccount && !isLoading) {
    return (
      <>
        <WhatsAppSubNav />
        <PageBody>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">No WhatsApp Account Connected</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Go to WhatsApp Settings to connect your WhatsApp Business Account first.
            </p>
          </div>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <WhatsAppSubNav />
      <div className="flex h-[calc(100vh-8rem)] bg-background">
        {/* Conversation List */}
        <div className="w-80 flex-shrink-0">
          <ConversationList
            conversations={conversations as ConvWithContact[]}
            selectedId={selectedConv?.id}
            onSelect={setSelectedConv}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>

        {/* Chat Thread */}
        <div className="flex-1 min-w-0">
          <ChatThread
            messages={messages}
            contact={contact}
            windowOpenUntil={selectedConv?.window_open_until ?? null}
            onSend={handleSend}
            isSending={sendMutation.isPending}
          />
        </div>

        {/* Contact Profile Panel */}
        {selectedConv && (
          <ContactProfilePanel
            contact={contact}
            conversation={selectedConv}
            onResolve={handleResolve}
          />
        )}
      </div>
    </>
  );
};

export default WhatsAppInboxPage;
