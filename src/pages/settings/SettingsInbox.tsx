import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrgLink } from "@/components/OrgLink";
import { ArrowRight, Inbox, Settings2 } from "lucide-react";

const SettingsInbox = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Omni-Channel Inbox"
        subtitle="Configure messaging channels, templates, and inbox analytics"
      />
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Inbox className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground">Inbox Channels</h3>
            <p className="text-sm text-muted-foreground">
              Connect and manage your messaging channels (WhatsApp, Telegram, Meta, SMS, Email) and configure templates from the inbox settings area.
            </p>
          </div>
          <Button asChild>
            <OrgLink to="/crm/inbox/channels" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Open Inbox Settings
              <ArrowRight className="h-4 w-4" />
            </OrgLink>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsInbox;
