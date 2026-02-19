import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { FileText } from 'lucide-react';

const WhatsAppTemplatesPage = () => (
  <>
    <WhatsAppSubNav />
    <PageBody>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Message Templates</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Create and manage approved message templates for outbound WhatsApp messaging.
        </p>
      </div>
    </PageBody>
  </>
);

export default WhatsAppTemplatesPage;
