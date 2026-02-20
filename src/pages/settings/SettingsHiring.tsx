import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrgLink } from "@/components/OrgLink";
import { ArrowRight, UserPlus, Settings2 } from "lucide-react";

const SettingsHiring = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hiring"
        subtitle="Configure your recruitment pipeline, assignments, and email templates"
      />
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground">Hiring Settings</h3>
            <p className="text-sm text-muted-foreground">
              Manage your hiring pipelines, assignment templates, and candidate communication templates from the dedicated hiring settings area.
            </p>
          </div>
          <Button asChild>
            <OrgLink to="/hiring/settings" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Open Hiring Settings
              <ArrowRight className="h-4 w-4" />
            </OrgLink>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsHiring;
