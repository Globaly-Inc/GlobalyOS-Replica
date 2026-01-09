import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Circle, 
  Flag 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingTask {
  id: string;
  title: string;
}

interface MoveStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStageName: string;
  previousStage: { id: string; name: string } | null;
  nextStage: { id: string; name: string } | null;
  pendingTasks: PendingTask[];
  onMoveToPrevious: () => void;
  onMoveToNextWithComplete: () => void;
  onMoveToNextSkip: () => void;
  onCompleteWorkflow: () => void;
  isLoading?: boolean;
}

export function MoveStageDialog({
  open,
  onOpenChange,
  currentStageName,
  previousStage,
  nextStage,
  pendingTasks,
  onMoveToPrevious,
  onMoveToNextWithComplete,
  onMoveToNextSkip,
  onCompleteWorkflow,
  isLoading,
}: MoveStageDialogProps) {
  const isFinalStage = !nextStage;
  const hasPendingTasks = pendingTasks.length > 0;

  const handleMoveForward = () => {
    if (isFinalStage) {
      onCompleteWorkflow();
    } else {
      onMoveToNextSkip();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Move Stage
          </DialogTitle>
          <DialogDescription>
            Current stage: <strong className="text-foreground">{currentStageName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stage Navigation Buttons */}
          <div className="flex gap-3">
            {/* Previous Stage Button */}
            <Button
              variant="outline"
              className={cn(
                "flex-1 h-auto py-3 flex-col items-start gap-1",
                !previousStage && "opacity-50 cursor-not-allowed"
              )}
              disabled={!previousStage || isLoading}
              onClick={onMoveToPrevious}
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowLeft className="h-3 w-3" />
                Previous
              </span>
              <span className="font-medium text-sm truncate w-full text-left">
                {previousStage?.name || "—"}
              </span>
            </Button>

            {/* Next Stage Button */}
            <Button
              variant="outline"
              className="flex-1 h-auto py-3 flex-col items-end gap-1"
              disabled={isLoading}
              onClick={handleMoveForward}
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {isFinalStage ? "Finish" : "Next"}
                {isFinalStage ? <Flag className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
              </span>
              <span className="font-medium text-sm truncate w-full text-right">
                {isFinalStage ? "Complete Workflow" : nextStage?.name}
              </span>
            </Button>
          </div>

          {/* Pending Tasks Warning */}
          {hasPendingTasks && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                  {pendingTasks.length} pending task{pendingTasks.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <ScrollArea className="max-h-32">
                <ul className="space-y-1.5">
                  {pendingTasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-2 text-sm">
                      <Circle className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-muted-foreground truncate">{task.title}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>

              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 gap-1"
                  onClick={onMoveToNextWithComplete}
                  disabled={isLoading}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete All & Move
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={handleMoveForward}
                  disabled={isLoading}
                >
                  Skip Tasks
                </Button>
              </div>
            </div>
          )}

          {/* No pending tasks message */}
          {!hasPendingTasks && (
            <p className="text-sm text-muted-foreground text-center py-2">
              All tasks in this stage are complete.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
