import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyPayslips } from "@/services/usePayroll";
import { FileText, Download, Eye, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { PayslipDetailDialog } from "@/components/payroll/PayslipDetailDialog";
import type { Payslip } from "@/types/payroll";

export default function MyPayslips() {
  const { data: payslips, isLoading } = useMyPayslips();
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = (payslip: Payslip) => {
    setSelectedPayslipId(payslip.id);
    setDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <PageHeader title="My Payslips" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="My Payslips" />

      {payslips?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Payslips Yet</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your payslips will appear here once payroll is processed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {payslips?.map((payslip) => {
            const runItem = payslip.run_item;
            if (!runItem) return null;
            
            return (
              <Card key={payslip.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(payslip.generated_at), 'MMMM yyyy')}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Payslip #{payslip.payslip_number}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Paid
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Gross Earnings</span>
                      <span>{runItem.currency} {runItem.gross_earnings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Deductions</span>
                      <span className="text-red-600">-{runItem.currency} {runItem.total_deductions.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Net Pay</span>
                      <span className="font-semibold text-lg text-primary">
                        {runItem.currency} {runItem.net_pay.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewDetails(payslip)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PayslipDetailDialog 
        payslipId={selectedPayslipId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
