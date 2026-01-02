import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Calendar, ArrowDownRight, ArrowUpRight, Minus, Edit, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaveBalanceVerificationProps {
  employeeId: string;
  year?: number;
}

interface TransactionSummary {
  leave_type: string;
  year_allocation: number;
  carry_forward_in: number;
  carry_forward_out: number;
  leave_taken: number;
  manual_adjustments: number;
  legacy_init: number;
  calculated_balance: number;
  actual_balance: number;
  is_verified: boolean;
}

export const LeaveBalanceVerification = ({ employeeId, year = new Date().getFullYear() }: LeaveBalanceVerificationProps) => {
  // Fetch all transaction logs for the year
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["leave-balance-verification-logs", employeeId, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balance_logs")
        .select("leave_type, change_amount, action")
        .eq("employee_id", employeeId)
        .gte("effective_date", `${year}-01-01`)
        .lte("effective_date", `${year}-12-31`);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch actual balances
  const { data: balances = [], isLoading: balancesLoading } = useQuery({
    queryKey: ["leave-balance-verification-balances", employeeId, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_type_balances")
        .select(`
          balance,
          leave_type:leave_types!inner(name)
        `)
        .eq("employee_id", employeeId)
        .eq("year", year);

      if (error) throw error;
      return (data || []).map((b: any) => ({
        leave_type: b.leave_type.name,
        balance: b.balance,
      }));
    },
  });

  // Calculate summary per leave type
  const summaries: TransactionSummary[] = (() => {
    const byType: Record<string, Omit<TransactionSummary, 'is_verified'>> = {};

    // Initialize from logs
    logs.forEach((log) => {
      if (!byType[log.leave_type]) {
        byType[log.leave_type] = {
          leave_type: log.leave_type,
          year_allocation: 0,
          carry_forward_in: 0,
          carry_forward_out: 0,
          leave_taken: 0,
          manual_adjustments: 0,
          legacy_init: 0,
          calculated_balance: 0,
          actual_balance: 0,
        };
      }

      const amount = log.change_amount || 0;
      switch (log.action) {
        case 'year_allocation':
          byType[log.leave_type].year_allocation += amount;
          break;
        case 'carry_forward_in':
          byType[log.leave_type].carry_forward_in += amount;
          break;
        case 'carry_forward_out':
          byType[log.leave_type].carry_forward_out += amount;
          break;
        case 'leave_deduct':
          byType[log.leave_type].leave_taken += amount;
          break;
        case 'manual_adjustment':
          byType[log.leave_type].manual_adjustments += amount;
          break;
        case 'year_init':
          byType[log.leave_type].legacy_init += amount;
          break;
      }
    });

    // Add actual balances
    balances.forEach((b) => {
      if (!byType[b.leave_type]) {
        byType[b.leave_type] = {
          leave_type: b.leave_type,
          year_allocation: 0,
          carry_forward_in: 0,
          carry_forward_out: 0,
          leave_taken: 0,
          manual_adjustments: 0,
          legacy_init: 0,
          calculated_balance: 0,
          actual_balance: 0,
        };
      }
      byType[b.leave_type].actual_balance = b.balance;
    });

    // Calculate and verify
    return Object.values(byType).map((s) => {
      const calculated = s.year_allocation + s.carry_forward_in + s.carry_forward_out + s.leave_taken + s.manual_adjustments + s.legacy_init;
      return {
        ...s,
        calculated_balance: calculated,
        is_verified: Math.abs(calculated - s.actual_balance) < 0.01,
      };
    });
  })();

  const isLoading = logsLoading || balancesLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No leave transactions for {year}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summaries.map((summary) => (
        <Card key={summary.leave_type} className="overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{summary.leave_type} {year}</CardTitle>
              {summary.is_verified ? (
                <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200">
                  <AlertCircle className="h-3 w-3" />
                  Mismatch
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              {/* Opening Balance */}
              <div className="flex justify-between text-muted-foreground">
                <span>Opening Balance (Jan 1)</span>
                <span>0</span>
              </div>

              {/* Year Allocation */}
              {summary.year_allocation !== 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>Year Allocation</span>
                  </div>
                  <span className="text-green-600 font-medium">+{summary.year_allocation}</span>
                </div>
              )}

              {/* Carry Forward In */}
              {summary.carry_forward_in !== 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="h-3.5 w-3.5 text-green-500" />
                    <span>Carry Forward (from {year - 1})</span>
                  </div>
                  <span className="text-green-600 font-medium">+{summary.carry_forward_in}</span>
                </div>
              )}

              {/* Legacy Init */}
              {summary.legacy_init !== 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-gray-500" />
                    <span>Legacy Init</span>
                  </div>
                  <span className={summary.legacy_init >= 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                    {summary.legacy_init >= 0 ? '+' : ''}{summary.legacy_init}
                  </span>
                </div>
              )}

              {/* Leave Taken */}
              {summary.leave_taken !== 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Minus className="h-3.5 w-3.5 text-red-500" />
                    <span>Leave Taken</span>
                  </div>
                  <span className="text-destructive font-medium">{summary.leave_taken}</span>
                </div>
              )}

              {/* Manual Adjustments */}
              {summary.manual_adjustments !== 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Edit className="h-3.5 w-3.5 text-amber-500" />
                    <span>Manual Adjustments</span>
                  </div>
                  <span className={summary.manual_adjustments >= 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                    {summary.manual_adjustments >= 0 ? '+' : ''}{summary.manual_adjustments}
                  </span>
                </div>
              )}

              {/* Carry Forward Out */}
              {summary.carry_forward_out !== 0 && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-orange-500" />
                    <span>Carried to {year + 1}</span>
                  </div>
                  <span className="text-destructive font-medium">{summary.carry_forward_out}</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t my-2" />

              {/* Calculated vs Actual */}
              <div className="flex justify-between font-medium">
                <span>Calculated Balance</span>
                <span>{summary.calculated_balance}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Actual Balance</span>
                <span className={summary.is_verified ? "text-green-600" : "text-destructive"}>
                  {summary.actual_balance}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
