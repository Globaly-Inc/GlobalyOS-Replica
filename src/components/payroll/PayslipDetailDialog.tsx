import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { usePayslip } from "@/services/usePayroll";

interface PayslipDetailDialogProps {
  payslipId: string | null;
  employeeName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PayslipDetailDialog = ({ 
  payslipId,
  employeeName,
  open, 
  onOpenChange 
}: PayslipDetailDialogProps) => {
  const { data: payslip, isLoading } = usePayslip(payslipId || undefined);

  if (!payslipId) return null;

  const runItem = payslip?.run_item;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payslip Details
            {employeeName && <span className="text-muted-foreground font-normal">- {employeeName}</span>}
          </DialogTitle>
          {payslip && (
            <DialogDescription>
              Payslip #{payslip.payslip_number} • Generated {format(new Date(payslip.generated_at), 'MMM d, yyyy')}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : payslip && runItem ? (
          <div className="space-y-6">
            {/* Earnings Section */}
            <div>
              <h4 className="font-semibold mb-3 text-green-700 dark:text-green-400">Earnings</h4>
              <div className="space-y-2 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                {runItem.earnings?.map((earning, idx) => (
                  <div key={earning.id || idx} className="flex justify-between text-sm">
                    <span>{earning.description}</span>
                    <span>{runItem.currency} {earning.amount.toLocaleString()}</span>
                  </div>
                ))}
                {(!runItem.earnings || runItem.earnings.length === 0) && (
                  <div className="text-sm text-muted-foreground">No earnings breakdown available</div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Gross Earnings</span>
                  <span>{runItem.currency} {runItem.gross_earnings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div>
              <h4 className="font-semibold mb-3 text-red-700 dark:text-red-400">Deductions</h4>
              <div className="space-y-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                {runItem.deductions?.map((deduction, idx) => (
                  <div key={deduction.id || idx} className="flex justify-between text-sm">
                    <span>{deduction.description}</span>
                    <span>-{runItem.currency} {deduction.amount.toLocaleString()}</span>
                  </div>
                ))}
                {(!runItem.deductions || runItem.deductions.length === 0) && (
                  <div className="text-sm text-muted-foreground">No deductions breakdown available</div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total Deductions</span>
                  <span>-{runItem.currency} {runItem.total_deductions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Employer Contributions (if any) */}
            {runItem.employer_contributions && runItem.employer_contributions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 text-blue-700 dark:text-blue-400">Employer Contributions</h4>
                <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  {runItem.employer_contributions.map((contribution, idx) => (
                    <div key={contribution.id || idx} className="flex justify-between text-sm">
                      <span>{contribution.description}</span>
                      <span>{runItem.currency} {contribution.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Net Pay Summary */}
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Net Pay</span>
                <span className="font-bold text-2xl text-primary">
                  {runItem.currency} {runItem.net_pay.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Payslip not found
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {payslip && (
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
