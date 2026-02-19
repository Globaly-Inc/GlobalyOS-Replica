import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { MessageCircle } from 'lucide-react';

const WhatsAppInboxPage = () => (
  <>
    <WhatsAppSubNav />
    <PageBody>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Inbox</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          View and respond to WhatsApp conversations in real time. Connect your account first to get started.
        </p>
      </div>
    </PageBody>
  </>
);

export default WhatsAppInboxPage;
