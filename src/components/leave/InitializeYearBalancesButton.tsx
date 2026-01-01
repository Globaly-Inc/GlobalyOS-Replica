/**
 * Admin button to initialize leave balances for a new year
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { useInitializeYearBalances } from "@/services/useLeaveBalanceInit";
import { useUserRole } from "@/hooks/useUserRole";

interface InitializeYearBalancesButtonProps {
  year: number;
  missingCount?: number;
  onComplete?: () => void;
}

export const InitializeYearBalancesButton = ({
  year,
  missingCount,
  onComplete,
}: InitializeYearBalancesButtonProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { isOwner, isAdmin, isHR } = useUserRole();
  const initMutation = useInitializeYearBalances();

  // Only show for admin roles
  if (!isOwner && !isAdmin && !isHR) {
    return null;
  }

  const handleInitialize = async () => {
    await initMutation.mutateAsync(year);
    setConfirmOpen(false);
    onComplete?.();
  };

  const showBanner = missingCount !== undefined && missingCount > 0;

  return (
    <>
      {showBanner && (
        <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            {year} Leave Balances Not Initialized
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <p className="mb-2">
              {missingCount} employee{missingCount > 1 ? "s don't" : " doesn't"} have leave balances for {year} yet.
              Click the button below to initialize balances with default days and carry forward from {year - 1}.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 bg-white dark:bg-amber-900 hover:bg-amber-100 dark:hover:bg-amber-800"
              onClick={() => setConfirmOpen(true)}
              disabled={initMutation.isPending}
            >
              {initMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Initialize {year} Balances
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!showBanner && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          disabled={initMutation.isPending}
        >
          {initMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-initialize {year} Balances
            </>
          )}
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initialize {year} Leave Balances?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will create leave balances for all active employees who don't have them yet for {year}.</p>
              <p className="font-medium">For each leave type:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Credits the configured "Annual Leave Days" as default balance</li>
                <li>Carries forward remaining balance from {year - 1} if "Carry Forward" is enabled (including negative balances)</li>
              </ul>
              <p className="text-amber-600 dark:text-amber-400 mt-2">
                <strong>Note:</strong> Existing balances will not be modified.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={initMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInitialize}
              disabled={initMutation.isPending}
            >
              {initMutation.isPending ? "Initializing..." : "Initialize Balances"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
