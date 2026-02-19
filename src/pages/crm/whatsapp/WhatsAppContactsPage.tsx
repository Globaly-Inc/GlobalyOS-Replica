import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { Users } from 'lucide-react';

const WhatsAppContactsPage = () => (
  <>
    <WhatsAppSubNav />
    <PageBody>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">WhatsApp Contacts</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Manage your WhatsApp contacts, consent status, and opt-in preferences.
        </p>
      </div>
    </PageBody>
  </>
);

export default WhatsAppContactsPage;
