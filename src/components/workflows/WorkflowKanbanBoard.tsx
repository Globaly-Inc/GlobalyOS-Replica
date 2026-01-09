import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, GitBranch, Plus } from "lucide-react";
import { WorkflowKanbanCard, type WorkflowKanbanCardData } from "./WorkflowKanbanCard";
import { useWorkflowStages } from "@/services/useWorkflows";
import { cn } from "@/lib/utils";
import type { WorkflowStage } from "@/types/workflow";

interface WorkflowKanbanBoardProps {
  workflows: WorkflowKanbanCardData[];
  templateId: string | undefined;
  isLoading?: boolean;
  onStartWorkflow?: () => void;
}

interface StageColumn {
  id: string;
  name: string;
  color: string | null;
  workflows: WorkflowKanbanCardData[];
}

export function WorkflowKanbanBoard({
  workflows,
  templateId,
  isLoading,
  onStartWorkflow,
}: WorkflowKanbanBoardProps) {
  const navigate = useNavigate();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { data: stages, isLoading: stagesLoading } = useWorkflowStages(templateId);

  // Determine current stage for each workflow based on task completion
  const getWorkflowCurrentStage = (workflow: WorkflowKanbanCardData, stages: WorkflowStage[]): string | null => {
    if (!workflow.tasks?.length || !stages?.length) return null;

    // Group tasks by stage
    const tasksByStage = new Map<string | null, { total: number; completed: number }>();
    
    for (const task of workflow.tasks) {
      const stageId = task.stage_id;
      if (!tasksByStage.has(stageId)) {
        tasksByStage.set(stageId, { total: 0, completed: 0 });
      }
      const stageTasks = tasksByStage.get(stageId)!;
      stageTasks.total++;
      if (task.status === "completed") {
        stageTasks.completed++;
      }
    }

    // Find the first stage with incomplete tasks (following sort order)
    for (const stage of stages) {
      const stageTasks = tasksByStage.get(stage.id);
      if (stageTasks && stageTasks.completed < stageTasks.total) {
        return stage.id;
      }
    }

    // All tasks complete - return last stage or "completed"
    return "completed";
  };

  // Group workflows by their current stage
  const columns = useMemo<StageColumn[]>(() => {
    if (!stages?.length) return [];

    const stageColumns: StageColumn[] = stages.map(stage => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      workflows: [],
    }));

    // Add "Completed" column
    stageColumns.push({
      id: "completed",
      name: "Completed",
      color: "#22c55e",
      workflows: [],
    });

    // Distribute workflows into columns
    for (const workflow of workflows) {
      const currentStageId = getWorkflowCurrentStage(workflow, stages);
      const column = stageColumns.find(c => c.id === currentStageId) || stageColumns[0];
      column?.workflows.push(workflow);
    }

    return stageColumns;
  }, [workflows, stages]);

  const handleWorkflowClick = (workflowId: string) => {
    navigate(`/org/${orgCode}/workflows/${workflowId}`);
  };

  if (stagesLoading || isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="min-w-[280px] space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!templateId || !stages?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg">No workflow template found</h3>
        <p className="text-muted-foreground mt-1 max-w-md">
          Configure a workflow template first to use the Kanban view.
        </p>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg">No active workflows</h3>
        <p className="text-muted-foreground mt-1 max-w-md">
          Start a new workflow to track employee onboarding or offboarding progress.
        </p>
        {onStartWorkflow && (
          <button
            onClick={onStartWorkflow}
            className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Start a workflow
          </button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-4">
        {columns.map(column => (
          <div
            key={column.id}
            className="min-w-[300px] max-w-[300px] flex flex-col"
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: column.color || "#94a3b8" }}
              />
              <h3 className="font-medium text-sm truncate">{column.name}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {column.workflows.length}
              </span>
              {column.id === "completed" && (
                <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
              )}
            </div>

            {/* Column Content */}
            <div
              className={cn(
                "flex-1 space-y-3 p-2 rounded-lg min-h-[200px]",
                "bg-muted/30 border border-dashed border-muted-foreground/20"
              )}
            >
              {column.workflows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground py-8">
                  No workflows in this stage
                </div>
              ) : (
                column.workflows.map(workflow => (
                  <WorkflowKanbanCard
                    key={workflow.id}
                    workflow={workflow}
                    onClick={() => handleWorkflowClick(workflow.id)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
