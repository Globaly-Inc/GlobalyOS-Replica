/**
 * Bulk Actions Bar
 * Actions for selected candidates in the hiring pipeline
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUpdateApplicationStage } from '@/services/useHiringMutations';
import { ApplicationStage, APPLICATION_STAGE_LABELS } from '@/types/hiring';
import { 
  X, 
  ArrowRight, 
  XCircle, 
  Mail, 
  ChevronDown,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  jobId: string;
}

const MOVE_TO_STAGES: ApplicationStage[] = [
  'applied',
  'screening',
  'assignment',
  'interview_1',
  'interview_2',
  'interview_3',
  'offer',
  'hired',
];

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  jobId,
}: BulkActionsBarProps) {
  const updateStage = useUpdateApplicationStage();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const handleMoveToStage = async (stage: ApplicationStage) => {
    try {
      // Process each selected application
      await Promise.all(
        selectedIds.map(id => 
          updateStage.mutateAsync({ applicationId: id, stage })
        )
      );
      onClearSelection();
      toast.success(`Moved ${selectedIds.length} candidates to ${APPLICATION_STAGE_LABELS[stage]}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBulkReject = async () => {
    setIsRejecting(true);
    try {
      // Use updateStage to set stage to 'rejected' - the mutation handles status update
      await Promise.all(
        selectedIds.map(id => 
          updateStage.mutateAsync({ applicationId: id, stage: 'rejected' })
        )
      );
      setShowRejectDialog(false);
      setRejectReason('');
      onClearSelection();
      toast.success(`Rejected ${selectedIds.length} candidates`);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSendEmail = () => {
    // TODO: Implement bulk email functionality
    toast.info('Bulk email feature coming soon');
  };

  const isPending = updateStage.isPending || isRejecting;

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {selectedIds.length} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Move to Stage */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            {updateStage.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Move to Stage
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {MOVE_TO_STAGES.map((stage) => (
              <DropdownMenuItem
                key={stage}
                onClick={() => handleMoveToStage(stage)}
              >
                {APPLICATION_STAGE_LABELS[stage]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Send Email */}
        <Button variant="outline" size="sm" onClick={handleSendEmail} disabled={isPending}>
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </Button>

        {/* Reject */}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowRejectDialog(true)}
          disabled={isPending}
        >
          {isRejecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Reject
        </Button>
      </div>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {selectedIds.length} Candidates?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject {selectedIds.length} candidate(s) from this job.
              This action can be undone by moving them back to an active stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">
              Rejection Reason (optional)
            </label>
            <textarea
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              rows={3}
              placeholder="e.g., Not enough experience for this role"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Candidates
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
