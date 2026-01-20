import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, CreditCard, Briefcase, Sparkles, Target, ClipboardCheck } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { PageHeader } from "@/components/PageHeader";
import { FieldsSettings } from "@/components/FieldsSettings";
import { AIKnowledgeSettings } from "@/components/AIKnowledgeSettings";
import BillingSettings from "@/components/BillingSettings";
import { ProjectsSettings } from "@/components/settings/ProjectsSettings";
import { KpiGenerationSettings } from "@/components/settings/KpiGenerationSettings";
import { WorkflowsSettings } from "@/components/workflows/WorkflowsSettings";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";

const Settings = () => {
  const { currentOrg, orgRole } = useOrganization();
  const { isEnabled } = useFeatureFlags();

  const isOwner = orgRole === "owner";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your organization settings and preferences"
      />

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="hr-team" className="gap-2 tour-offices-manage tour-settings-menu">
            <Users className="h-4 w-4" />
            HR & Team
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-2">
            <Target className="h-4 w-4" />
            KPIs
          </TabsTrigger>
          {isEnabled('workflows') && (
            <TabsTrigger value="workflows" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Workflows
            </TabsTrigger>
          )}
          {isEnabled('ask-ai') && (
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI
            </TabsTrigger>
          )}
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-6">
          <OrganizationSettings isOwner={isOwner} />
        </TabsContent>

        <TabsContent value="hr-team" className="space-y-6">
          <FieldsSettings />
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <ProjectsSettings organizationId={currentOrg?.id} />
        </TabsContent>

        <TabsContent value="kpis" className="space-y-6">
          <KpiGenerationSettings organizationId={currentOrg?.id} />
        </TabsContent>

        {isEnabled('workflows') && (
          <TabsContent value="workflows" className="space-y-6">
            <WorkflowsSettings organizationId={currentOrg?.id} />
          </TabsContent>
        )}

        {isEnabled('ask-ai') && (
          <TabsContent value="ai" className="space-y-6">
            <AIKnowledgeSettings organizationId={currentOrg?.id} />
          </TabsContent>
        )}

        <TabsContent value="billing" className="space-y-6">
          <BillingSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
