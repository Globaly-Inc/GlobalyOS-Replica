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
import { Circle, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PendingTask {
  id: string;
  title: string;
}

interface CompleteStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  stageName: string;
  pendingTasks: PendingTask[];
  isLoading?: boolean;
}

export function CompleteStageDialog({
  open,
  onOpenChange,
  onConfirm,
  stageName,
  pendingTasks,
  isLoading,
}: CompleteStageDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Complete "{stageName}" Stage?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will mark <strong className="text-foreground">{pendingTasks.length} pending task{pendingTasks.length !== 1 ? 's' : ''}</strong> as completed.
            This action cannot be easily undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* List pending tasks */}
        <ScrollArea className="max-h-40 rounded-md border p-3">
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Circle className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{task.title}</span>
              </div>
            ))}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            Complete All Tasks
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
