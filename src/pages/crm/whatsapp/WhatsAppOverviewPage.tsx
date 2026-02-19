import { PageBody } from '@/components/ui/page-body';
import { SetupWizard } from '@/components/whatsapp/SetupWizard';

const WhatsAppOverviewPage = () => (
  <PageBody>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Connect your WhatsApp Business Account to message customers, run campaigns, and automate conversations.
        </p>
      </div>
      <SetupWizard />
    </div>
  </PageBody>
);

export default WhatsAppOverviewPage;
