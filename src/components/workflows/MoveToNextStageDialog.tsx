import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ChevronRight } from "lucide-react";

interface MoveToNextStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  stageName: string;
  nextStageName: string | null;
  pendingTaskCount: number;
  isLoading?: boolean;
}

export function MoveToNextStageDialog({
  open,
  onOpenChange,
  onConfirm,
  stageName,
  nextStageName,
  pendingTaskCount,
  isLoading,
}: MoveToNextStageDialogProps) {
  const isFinalStage = !nextStageName;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ChevronRight className="h-5 w-5 text-primary" />
            {isFinalStage ? "Complete Workflow?" : `Move to "${nextStageName}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {pendingTaskCount > 0 && (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <strong>{pendingTaskCount} task{pendingTaskCount !== 1 ? 's' : ''}</strong> will remain incomplete in "{stageName}"
              </span>
            )}
            <span className="block">
              {isFinalStage ? (
                <>This will mark the workflow as <strong className="text-foreground">completed</strong> without completing pending tasks.</>
              ) : (
                <>The workflow will move from <strong className="text-foreground">"{stageName}"</strong> to <strong className="text-foreground">"{nextStageName}"</strong>.</>
              )}
            </span>
            <span className="block text-muted-foreground text-sm">
              Incomplete tasks can still be completed later.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isFinalStage ? "Complete Workflow" : "Move to Next Stage"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
