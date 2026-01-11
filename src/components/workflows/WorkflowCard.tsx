import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  UserPlus, 
  UserMinus, 
  GitBranch, 
  ChevronRight, 
  Zap,
  Layers,
  ListTodo 
} from "lucide-react";
import type { WorkflowType } from "@/types/workflow";

interface WorkflowCardProps {
  id: string;
  name: string;
  type: WorkflowType;
  description: string | null;
  isDefault: boolean;
  stageCount: number;
  taskCount: number;
  triggerSummary: string | null;
  triggerEnabled: boolean;
  onView: () => void;
}

const WORKFLOW_ICONS: Record<WorkflowType, typeof UserPlus> = {
  onboarding: UserPlus,
  offboarding: UserMinus,
  recruiting: GitBranch,
  promotion: GitBranch,
  transfer: GitBranch,
  custom: GitBranch,
};

const WORKFLOW_COLORS: Record<WorkflowType, string> = {
  onboarding: "text-green-600",
  offboarding: "text-orange-600",
  recruiting: "text-blue-600",
  promotion: "text-purple-600",
  transfer: "text-cyan-600",
  custom: "text-gray-600",
};

export function WorkflowCard({
  name,
  type,
  description,
  isDefault,
  stageCount,
  taskCount,
  triggerSummary,
  triggerEnabled,
  onView,
}: WorkflowCardProps) {
  const Icon = WORKFLOW_ICONS[type] || GitBranch;
  const iconColor = WORKFLOW_COLORS[type] || "text-gray-600";

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg bg-muted ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{name}</h3>
                {isDefault && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {stageCount} {stageCount === 1 ? 'Stage' : 'Stages'}
                </span>
                <span className="flex items-center gap-1">
                  <ListTodo className="h-3.5 w-3.5" />
                  {taskCount} {taskCount === 1 ? 'Task' : 'Tasks'}
                </span>
                {triggerSummary && (
                  <span className="flex items-center gap-1">
                    <Zap className={`h-3.5 w-3.5 ${triggerEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="truncate max-w-[150px]">{triggerSummary}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {triggerEnabled ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <Zap className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Inactive
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
