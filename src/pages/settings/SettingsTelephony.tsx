import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrgLink } from "@/components/OrgLink";
import { ArrowRight, Phone, Settings2 } from "lucide-react";

const SettingsTelephony = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Telephony"
        subtitle="Manage phone numbers, IVR configuration, and telephony usage"
      />
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground">Phone Numbers & IVR</h3>
            <p className="text-sm text-muted-foreground">
              Provision phone numbers, configure IVR call flows, and monitor telephony usage from the dedicated telephony area.
            </p>
          </div>
          <Button asChild>
            <OrgLink to="/crm/calls" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Open Telephony Settings
              <ArrowRight className="h-4 w-4" />
            </OrgLink>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsTelephony;
