import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { WhatsAppConnectionForm } from '@/components/whatsapp/WhatsAppConnectionForm';

const WhatsAppSettingsPage = () => (
  <>
    <WhatsAppSubNav />
    <PageBody>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Settings</h1>
          <p className="text-muted-foreground mt-1">
            Connect and configure your WhatsApp Business Account.
          </p>
        </div>
        <WhatsAppConnectionForm />
      </div>
    </PageBody>
  </>
);

export default WhatsAppSettingsPage;
