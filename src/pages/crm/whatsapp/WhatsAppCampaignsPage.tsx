import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { Megaphone } from 'lucide-react';

const WhatsAppCampaignsPage = () => (
  <>
    <WhatsAppSubNav />
    <PageBody>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Megaphone className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Broadcast Campaigns</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Send targeted WhatsApp broadcast campaigns using approved templates.
        </p>
      </div>
    </PageBody>
  </>
);

export default WhatsAppCampaignsPage;
