/**
 * Admin button/banner to initialize leave balances for a new year
 * Uses accurate eligibility filtering and supports selective initialization
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useMissingBalances } from "@/services/useLeaveBalanceMissing";
import { useInitializeSelectedEmployeesBalances } from "@/services/useLeaveBalanceInit";
import { InitializeYearBalancesDialog } from "./InitializeYearBalancesDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface InitializeYearBalancesButtonProps {
  year: number;
  onComplete?: () => void;
}

export const InitializeYearBalancesButton = ({
  year,
  onComplete,
}: InitializeYearBalancesButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isOwner, isAdmin, isHR } = useUserRole();
  
  // Use the new accurate missing balance detection
  const { data: missingEmployees = [], isLoading } = useMissingBalances(year);
  const initMutation = useInitializeSelectedEmployeesBalances();

  // Only show for admin roles
  if (!isOwner && !isAdmin && !isHR) {
    return null;
  }

  const handleInitialize = async (employeeIds: string[]) => {
    await initMutation.mutateAsync({ employeeIds, year });
    onComplete?.();
    // Close dialog only if all selected were initialized successfully
    if (!initMutation.isError) {
      setDialogOpen(false);
    }
  };

  const missingCount = missingEmployees.length;
  const showBanner = missingCount > 0;

  // Loading state
  if (isLoading) {
    return (
      <Alert className="mb-4 border-muted bg-muted/30">
        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        <AlertTitle className="text-muted-foreground">Checking {year} Leave Balances...</AlertTitle>
        <AlertDescription>
          <Skeleton className="h-4 w-48 mt-2" />
        </AlertDescription>
      </Alert>
    );
  }

  // Don't render anything when all balances are initialized
  if (!showBanner) {
    return null;
  }

  return (
    <>
      <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          {year} Leave Balances Not Initialized
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          <p className="mb-3">
            <strong>{missingCount}</strong> employee{missingCount > 1 ? "s are" : " is"} missing eligible leave balances for {year}.
            Click below to review and initialize balances with default days and carry forward from {year - 1}.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 bg-white dark:bg-amber-900 hover:bg-amber-100 dark:hover:bg-amber-800"
            onClick={() => setDialogOpen(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Initialize {year} Balances
          </Button>
        </AlertDescription>
      </Alert>

      <InitializeYearBalancesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        year={year}
        missingEmployees={missingEmployees}
        isLoading={isLoading}
        onInitialize={handleInitialize}
        isPending={initMutation.isPending}
      />
    </>
  );
};
