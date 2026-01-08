import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Loader2, Check, ArrowRight } from "lucide-react";
import { IncorrectBalance, useRepairBalances, useRepairSingleBalance } from "@/services/useLeaveBalanceDataRepair";

interface BalanceRepairDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incorrectBalances: IncorrectBalance[];
  onRepairComplete: () => void;
}

const getReasonText = (issueType: 'doubled' | 'mismatch'): string => {
  switch (issueType) {
    case 'doubled':
      return "Balance appears doubled (likely duplicate initialization)";
    case 'mismatch':
      return "Balance does not match transaction log totals";
    default:
      return "Balance discrepancy detected";
  }
};

const formatDifference = (diff: number): string => {
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
};

export const BalanceRepairDetailsDialog = ({
  open,
  onOpenChange,
  incorrectBalances,
  onRepairComplete,
}: BalanceRepairDetailsDialogProps) => {
  const [repairedIds, setRepairedIds] = useState<Set<string>>(new Set());
  const repairAllMutation = useRepairBalances();
  const repairSingleMutation = useRepairSingleBalance();

  const pendingBalances = incorrectBalances.filter(b => !repairedIds.has(b.balanceId));

  const handleRepairSingle = async (balance: IncorrectBalance) => {
    repairSingleMutation.mutate(balance, {
      onSuccess: () => {
        setRepairedIds(prev => new Set([...prev, balance.balanceId]));
        if (pendingBalances.length === 1) {
          // This was the last one
          onRepairComplete();
          onOpenChange(false);
        }
      },
    });
  };

  const handleRepairAll = () => {
    repairAllMutation.mutate(pendingBalances, {
      onSuccess: () => {
        onRepairComplete();
        onOpenChange(false);
      },
    });
  };

  const handleClose = () => {
    if (repairedIds.size > 0) {
      onRepairComplete();
    }
    setRepairedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Balance Repair Details
          </DialogTitle>
          <DialogDescription>
            The following balances don't match their transaction logs and need to be corrected.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {incorrectBalances.map((balance) => {
              const isRepaired = repairedIds.has(balance.balanceId);
              const isRepairing = repairSingleMutation.isPending && 
                repairSingleMutation.variables?.balanceId === balance.balanceId;

              return (
                <div
                  key={balance.balanceId}
                  className={`border rounded-lg p-4 transition-colors ${
                    isRepaired 
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" 
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        {balance.employeeName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {balance.leaveTypeName} • {balance.year}
                      </div>
                      
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-destructive font-medium">
                          {balance.currentBalance} days
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-green-600 font-medium">
                          {balance.correctBalance} days
                        </span>
                        <span className="text-muted-foreground">
                          (Diff: {formatDifference(balance.difference)})
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded inline-block">
                        {getReasonText(balance.issueType)}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isRepaired ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <Check className="h-4 w-4" />
                          Repaired
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRepairSingle(balance)}
                          disabled={isRepairing || repairAllMutation.isPending}
                        >
                          {isRepairing ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Repairing
                            </>
                          ) : (
                            "Repair"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {repairedIds.size > 0 ? "Done" : "Cancel"}
          </Button>
          {pendingBalances.length > 0 && (
            <Button
              onClick={handleRepairAll}
              disabled={repairAllMutation.isPending || repairSingleMutation.isPending}
            >
              {repairAllMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Repairing...
                </>
              ) : (
                `Repair All (${pendingBalances.length})`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
