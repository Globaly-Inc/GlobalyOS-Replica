import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings2 } from "lucide-react";
import { useWorkflowTemplates, useWorkflowTriggers } from "@/services/useWorkflows";
import { useSeedWorkflowData } from "@/services/useWorkflowMutations";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { WorkflowCard } from "./WorkflowCard";
import { AddWorkflowDialog } from "./AddWorkflowDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface WorkflowsSettingsProps {
  organizationId: string | undefined;
}

export function WorkflowsSettings({ organizationId }: WorkflowsSettingsProps) {
  const navigate = useNavigate();
  const { orgCode } = useOrgNavigation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  const { data: templates, isLoading: templatesLoading } = useWorkflowTemplates();
  const { data: triggers = [] } = useWorkflowTriggers();
  const seedData = useSeedWorkflowData();

  // Fetch stage and task counts for all templates
  const { data: templateStats = {} } = useQuery({
    queryKey: ['workflow-template-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return {};
      
      // Get stage counts
      const { data: stages } = await supabase
        .from('workflow_stages')
        .select('template_id')
        .eq('organization_id', organizationId);
      
      // Get task counts
      const { data: tasks } = await supabase
        .from('workflow_template_tasks')
        .select('template_id')
        .eq('organization_id', organizationId);
      
      const stats: Record<string, { stageCount: number; taskCount: number }> = {};
      
      stages?.forEach(s => {
        if (!stats[s.template_id]) stats[s.template_id] = { stageCount: 0, taskCount: 0 };
        stats[s.template_id].stageCount++;
      });
      
      tasks?.forEach(t => {
        if (!stats[t.template_id]) stats[t.template_id] = { stageCount: 0, taskCount: 0 };
        stats[t.template_id].taskCount++;
      });
      
      return stats;
    },
    enabled: !!organizationId,
  });

  // Seed default workflow data if templates don't exist
  useEffect(() => {
    if (organizationId && !templatesLoading && templates?.length === 0) {
      seedData.mutate(organizationId);
    }
  }, [organizationId, templatesLoading, templates?.length]);

  // Build trigger lookup
  const triggerByType = useMemo(() => {
    const lookup: Record<string, typeof triggers[0]> = {};
    triggers.forEach(t => { lookup[t.workflow_type] = t; });
    return lookup;
  }, [triggers]);

  const getTriggerSummary = (trigger: typeof triggers[0] | undefined) => {
    if (!trigger) return null;
    const { trigger_field, trigger_condition, trigger_value } = trigger;
    if (trigger_condition === 'is_set' || trigger_condition === 'is_not_null') {
      return `${trigger_field} ${trigger_condition.replace('_', ' ')}`;
    }
    return `${trigger_field} = ${trigger_value}`;
  };

  const handleViewTemplate = (templateId: string) => {
    navigate(`/org/${orgCode}/settings/workflow/${templateId}`);
  };

  if (!organizationId) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Workflow Settings
            </CardTitle>
            <CardDescription>
              Configure workflow templates for onboarding, offboarding, and more
            </CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Workflow
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {templatesLoading || seedData.isPending ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading workflows...
          </div>
        ) : templates?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No workflow templates configured.</p>
            <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create your first workflow
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates?.map(template => {
              const trigger = triggerByType[template.type];
              const stats = templateStats[template.id] || { stageCount: 0, taskCount: 0 };
              
              return (
                <WorkflowCard
                  key={template.id}
                  id={template.id}
                  name={template.name}
                  type={template.type}
                  description={template.description}
                  isDefault={template.is_default}
                  stageCount={stats.stageCount}
                  taskCount={stats.taskCount}
                  triggerSummary={getTriggerSummary(trigger)}
                  triggerEnabled={trigger?.is_enabled ?? false}
                  onView={() => handleViewTemplate(template.id)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
      
      <AddWorkflowDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
        organizationId={organizationId}
      />
    </Card>
  );
}
