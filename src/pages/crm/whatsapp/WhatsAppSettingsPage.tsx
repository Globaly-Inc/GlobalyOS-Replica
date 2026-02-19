import { PageBody } from '@/components/ui/page-body';
import { Settings } from 'lucide-react';

const WhatsAppSettingsPage = () => (
  <PageBody>
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">WhatsApp Settings</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        Configure your WhatsApp Business Account, business hours, and compliance settings.
      </p>
    </div>
  </PageBody>
);

export default WhatsAppSettingsPage;
