import { useState, useMemo } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Settings, UserPlus, UserMinus, CheckCircle2, Plus } from "lucide-react";
import { useAllWorkflows, useWorkflowRealtime, useWorkflowTemplates } from "@/services/useWorkflows";
import { WorkflowKanbanBoard } from "@/components/workflows/WorkflowKanbanBoard";
import { StartWorkflowDialog } from "@/components/workflows/StartWorkflowDialog";
import { WorkflowCard } from "@/components/workflows/WorkflowCard";
import { OrgLink } from "@/components/OrgLink";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkflowType } from "@/types/workflow";

type TabValue = "onboarding" | "offboarding" | "completed";

export default function Workflows() {
  const navigate = useNavigate();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { orgCode: navOrgCode } = useOrgNavigation();
  const [activeTab, setActiveTab] = useState<TabValue>("onboarding");
  const [showStartDialog, setShowStartDialog] = useState(false);

  // Enable realtime updates
  useWorkflowRealtime();

  // Fetch all workflows (we'll filter client-side for tabs)
  const { data: allWorkflows, isLoading } = useAllWorkflows();

  // Fetch templates to get template IDs for each type
  const { data: onboardingTemplates } = useWorkflowTemplates("onboarding");
  const { data: offboardingTemplates } = useWorkflowTemplates("offboarding");

  // Get default template for each type
  const defaultOnboardingTemplate = onboardingTemplates?.find(t => t.is_default) || onboardingTemplates?.[0];
  const defaultOffboardingTemplate = offboardingTemplates?.find(t => t.is_default) || offboardingTemplates?.[0];

  // Filter workflows by type and status
  const { onboardingWorkflows, offboardingWorkflows, completedWorkflows } = useMemo(() => {
    const workflows = allWorkflows || [];
    return {
      onboardingWorkflows: workflows.filter(
        (w: any) => w.type === "onboarding" && w.status === "active"
      ),
      offboardingWorkflows: workflows.filter(
        (w: any) => w.type === "offboarding" && w.status === "active"
      ),
      completedWorkflows: workflows.filter((w: any) => w.status === "completed"),
    };
  }, [allWorkflows]);

  const handleWorkflowClick = (workflowId: string) => {
    navigate(`/org/${orgCode}/workflows/${workflowId}`);
  };

  // Loading state
  if (roleLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <PageHeader title="HR Workflows" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Only admin/HR can access
  if (!isOwner && !isAdmin && !isHR) {
    return <Navigate to={`/org/${navOrgCode}`} replace />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="HR Workflows"
          subtitle="Track onboarding and offboarding progress across your organization"
        />
        <div className="flex items-center gap-2">
          <OrgLink to="/settings/workflows">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </OrgLink>
          <Button onClick={() => setShowStartDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Start Workflow
          </Button>
        </div>
      </div>

      {/* Workflow Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList className="mb-6">
              <TabsTrigger value="onboarding" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Onboarding
                {onboardingWorkflows.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {onboardingWorkflows.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="offboarding" className="gap-2">
                <UserMinus className="h-4 w-4" />
                Offboarding
                {offboardingWorkflows.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {offboardingWorkflows.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed
                {completedWorkflows.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {completedWorkflows.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Onboarding Kanban */}
            <TabsContent value="onboarding">
              <WorkflowKanbanBoard
                workflows={onboardingWorkflows}
                templateId={defaultOnboardingTemplate?.id}
                isLoading={isLoading}
                onStartWorkflow={() => setShowStartDialog(true)}
              />
            </TabsContent>

            {/* Offboarding Kanban */}
            <TabsContent value="offboarding">
              <WorkflowKanbanBoard
                workflows={offboardingWorkflows}
                templateId={defaultOffboardingTemplate?.id}
                isLoading={isLoading}
                onStartWorkflow={() => setShowStartDialog(true)}
              />
            </TabsContent>

            {/* Completed List */}
            <TabsContent value="completed">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : completedWorkflows.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">No completed workflows yet</h3>
                  <p className="text-muted-foreground mt-1">
                    Completed onboarding and offboarding workflows will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedWorkflows.map((workflow: any) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onClick={() => handleWorkflowClick(workflow.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Start Workflow Dialog */}
      <StartWorkflowDialog
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
      />
    </div>
  );
}
