import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CreditCard, Briefcase, Sparkles, Target, ClipboardCheck, UserPlus } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { PageHeader } from "@/components/PageHeader";
import { AIKnowledgeSettings } from "@/components/AIKnowledgeSettings";
import BillingSettings from "@/components/BillingSettings";
import { ProjectsSettings } from "@/components/settings/ProjectsSettings";
import { KpiGenerationSettings } from "@/components/settings/KpiGenerationSettings";
import { WorkflowsSettings } from "@/components/workflows/WorkflowsSettings";
import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
import { OfficesStructureSettings } from "@/components/settings/OfficesStructureSettings";
import { OrgLink } from "@/components/OrgLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

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
          <TabsTrigger value="offices-structure" className="gap-2 tour-offices-manage tour-settings-menu">
            <Building2 className="h-4 w-4" />
            Offices & Structure
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
          {isEnabled('hiring') && (
            <TabsTrigger value="hiring" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Hiring
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

        <TabsContent value="offices-structure" className="space-y-6">
          <OfficesStructureSettings />
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

        {isEnabled('hiring') && (
          <TabsContent value="hiring" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Hiring & Recruitment</CardTitle>
                    <CardDescription>
                      Manage email templates, assignment templates, and hiring configuration
                    </CardDescription>
                  </div>
                  <Button asChild>
                    <OrgLink to="/hiring/settings" className="flex items-center gap-2">
                      Open Hiring Settings
                      <ArrowRight className="h-4 w-4" />
                    </OrgLink>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configure email templates for candidate communication, create assignment templates 
                  for screening candidates, and manage other hiring-related settings.
                </p>
              </CardContent>
            </Card>
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
