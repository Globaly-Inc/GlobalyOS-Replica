import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  useEmployeeWorkflows,
  useEmployeeWorkflowTasks,
  useExitInterview,
  useAssetHandovers,
  useKnowledgeTransfers,
} from "@/services/useWorkflows";
import { WorkflowTaskList } from "./WorkflowTaskList";
import { ExitInterviewForm } from "./ExitInterviewForm";
import { AssetHandoverList } from "./AssetHandoverList";
import { KnowledgeTransferList } from "./KnowledgeTransferList";
import { format, differenceInDays } from "date-fns";
import {
  Calendar,
  ClipboardList,
  MessageSquare,
  Package,
  BookOpen,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface OffboardingPanelProps {
  employeeId: string;
  lastWorkingDay: string;
  canEdit?: boolean;
}

export function OffboardingPanel({ employeeId, lastWorkingDay, canEdit = false }: OffboardingPanelProps) {
  const [activeTab, setActiveTab] = useState("tasks");
  
  const { data: workflows, isLoading: workflowsLoading } = useEmployeeWorkflows(employeeId);
  const offboardingWorkflow = workflows?.find((w) => w.type === "offboarding");
  
  const { data: tasks, isLoading: tasksLoading } = useEmployeeWorkflowTasks(offboardingWorkflow?.id);
  const { data: exitInterview } = useExitInterview(employeeId);
  const { data: assets } = useAssetHandovers(employeeId);
  const { data: knowledgeTransfers } = useKnowledgeTransfers(employeeId);

  const daysRemaining = differenceInDays(new Date(lastWorkingDay), new Date());
  const isCompleted = offboardingWorkflow?.status === "completed";
  
  const completedTasks = tasks?.filter((t) => t.status === "completed" || t.status === "skipped").length || 0;
  const totalTasks = tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  if (workflowsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!offboardingWorkflow) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Offboarding Workflow</h3>
          <p className="text-sm text-muted-foreground">
            The offboarding workflow will be created automatically when a resignation date is set.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${isCompleted ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">Offboarding Progress</h2>
                <p className="text-sm text-muted-foreground">
                  Last working day: {format(new Date(lastWorkingDay), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isCompleted && (
                <Badge
                  variant={daysRemaining <= 7 ? "destructive" : daysRemaining <= 14 ? "secondary" : "outline"}
                  className="text-sm"
                >
                  {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Last day"}
                </Badge>
              )}
              <Badge variant={isCompleted ? "default" : "secondary"} className="capitalize">
                {offboardingWorkflow.status}
              </Badge>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>{completedTasks} of {totalTasks} tasks completed</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="tasks" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
            {totalTasks > 0 && (
              <Badge variant="secondary" className="ml-1">{completedTasks}/{totalTasks}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="exit-interview" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Interview</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Assets</span>
            {assets && assets.length > 0 && (
              <Badge variant="secondary" className="ml-1">{assets.filter(a => a.status === "returned").length}/{assets.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Knowledge</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          {tasksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks && tasks.length > 0 ? (
            <WorkflowTaskList tasks={tasks} canEdit={canEdit} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tasks in this workflow
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exit-interview" className="mt-4">
          <ExitInterviewForm 
            exitInterview={exitInterview} 
            employeeId={employeeId}
            canEdit={canEdit} 
          />
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <AssetHandoverList 
            assets={assets || []} 
            employeeId={employeeId}
            workflowId={offboardingWorkflow.id}
            canEdit={canEdit} 
          />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <KnowledgeTransferList 
            transfers={knowledgeTransfers || []} 
            employeeId={employeeId}
            workflowId={offboardingWorkflow.id}
            canEdit={canEdit} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
