import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Settings, CheckCircle2, Plus, ClipboardPlus, Workflow } from "lucide-react";
import { useAllWorkflows, useWorkflowRealtime, useWorkflows } from "@/services/useWorkflows";
import { WorkflowKanbanBoard } from "@/components/workflows/WorkflowKanbanBoard";
import { StartApplicationDialog } from "@/components/workflows/StartApplicationDialog";
import { AddTaskToWorkflowDialog } from "@/components/workflows/AddTaskToWorkflowDialog";
import { ApplicationCard } from "@/components/workflows/ApplicationCard";
import { OrgLink } from "@/components/OrgLink";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function Workflows() {
  const navigate = useNavigate();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { orgCode: navOrgCode } = useOrgNavigation();
  const [activeTab, setActiveTab] = useState<string>("completed");
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);

  // Enable realtime updates
  useWorkflowRealtime();

  // Fetch all workflow definitions (templates)
  const { data: workflowDefinitions, isLoading: workflowsLoading } = useWorkflows();

  // Fetch all applications (active workflow instances)
  const { data: allApplications, isLoading: applicationsLoading } = useAllWorkflows();

  const isLoading = workflowsLoading || applicationsLoading;

  // Set first workflow as default tab when data loads
  useEffect(() => {
    if (workflowDefinitions?.length && activeTab === "completed") {
      setActiveTab(workflowDefinitions[0].id);
    }
  }, [workflowDefinitions]);

  // Group applications by workflow_template_id
  const { applicationsByWorkflow, completedApplications } = useMemo(() => {
    const applications = allApplications || [];
    const byWorkflow: Record<string, any[]> = {};
    
    // Initialize for each workflow
    workflowDefinitions?.forEach(w => {
      byWorkflow[w.id] = [];
    });
    
    // Group active applications by workflow template
    applications.forEach((app: any) => {
      if (app.status === "active" && app.template_id) {
        if (!byWorkflow[app.template_id]) {
          byWorkflow[app.template_id] = [];
        }
        byWorkflow[app.template_id].push(app);
      }
    });
    
    // Get all completed applications
    const completed = applications.filter((app: any) => app.status === "completed");
    
    return {
      applicationsByWorkflow: byWorkflow,
      completedApplications: completed,
    };
  }, [allApplications, workflowDefinitions]);

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
          <Button onClick={() => setShowAddTaskDialog(true)}>
            <ClipboardPlus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Workflow Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              {/* Dynamic workflow tabs */}
              {workflowDefinitions?.map((workflow) => {
                const count = applicationsByWorkflow[workflow.id]?.length || 0;
                return (
                  <TabsTrigger key={workflow.id} value={workflow.id} className="gap-2">
                    <Workflow className="h-4 w-4" />
                    {workflow.name}
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
              {/* Completed tab */}
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed
                {completedApplications.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {completedApplications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Dynamic workflow Kanban boards */}
            {workflowDefinitions?.map((workflow) => (
              <TabsContent key={workflow.id} value={workflow.id}>
                <WorkflowKanbanBoard
                  workflows={applicationsByWorkflow[workflow.id] || []}
                  templateId={workflow.id}
                  isLoading={isLoading}
                  onStartWorkflow={() => setShowStartDialog(true)}
                />
              </TabsContent>
            ))}

            {/* Completed List */}
            <TabsContent value="completed">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : completedApplications.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">No completed workflows yet</h3>
                  <p className="text-muted-foreground mt-1">
                    Completed onboarding and offboarding workflows will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedApplications.map((application: any) => (
                    <ApplicationCard
                      key={application.id}
                      workflow={application}
                      onClick={() => handleWorkflowClick(application.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Start Application Dialog */}
      <StartApplicationDialog
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
      />

      {/* Add Task Dialog */}
      <AddTaskToWorkflowDialog
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
      />
    </div>
  );
}
