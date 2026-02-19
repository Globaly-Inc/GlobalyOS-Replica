import { PageBody } from '@/components/ui/page-body';
import { Workflow } from 'lucide-react';

const WhatsAppAutomationsPage = () => (
  <PageBody>
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Workflow className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Automations</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        Build automated WhatsApp workflows for welcome messages, FAQs, follow-ups, and more.
      </p>
    </div>
  </PageBody>
);

export default WhatsAppAutomationsPage;
