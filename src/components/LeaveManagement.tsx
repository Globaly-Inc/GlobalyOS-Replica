import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, History } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { AddLeaveBalanceDialog } from "@/components/dialogs/AddLeaveBalanceDialog";

interface LeaveManagementProps {
  employeeId: string;
}

interface LeaveType {
  id: string;
  name: string;
  category: string;
}

export const LeaveManagement = ({ employeeId }: LeaveManagementProps) => {
  const queryClient = useQueryClient();
  const { isHR, isAdmin } = useUserRole();
  const { currentOrg } = useOrganization();
  const currentYear = new Date().getFullYear();
  const canManageLeave = isHR || isAdmin;

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ["leave-balance", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("year", currentYear)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("leave_types")
        .select("id, name, category")
        .eq("organization_id", currentOrg.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as LeaveType[];
    },
    enabled: !!currentOrg,
  });

  const handleLeaveBalanceUpdate = () => {
    refetchBalance();
    queryClient.invalidateQueries({ queryKey: ["leave-balance", employeeId] });
  };

  const getBalanceForType = (leaveTypeName: string) => {
    if (!balance) return 0;
    const name = leaveTypeName.toLowerCase();
    if (name.includes('vacation')) return balance.vacation_days || 0;
    if (name.includes('sick')) return balance.sick_days || 0;
    return balance.pto_days || 0;
  };

  return (
    <div className="space-y-6">
      {/* Leave Balances */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Balances ({currentYear})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Link to={`/team/${employeeId}/leave-history`}>
                <Button size="sm" variant="ghost">
                  <History className="h-4 w-4 mr-1" />
                  Leave History
                </Button>
              </Link>
              {canManageLeave && (
                <AddLeaveBalanceDialog
                  employeeId={employeeId}
                  currentBalance={balance ? {
                    vacation_days: balance.vacation_days,
                    sick_days: balance.sick_days,
                    pto_days: balance.pto_days,
                  } : null}
                  onSuccess={handleLeaveBalanceUpdate}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {leaveTypes.length > 0 ? (
              leaveTypes.slice(0, 3).map((leaveType) => (
                <div key={leaveType.id} className="text-center p-4 rounded-lg bg-primary/5">
                  <div className="text-3xl font-bold text-primary">
                    {getBalanceForType(leaveType.name)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{leaveType.name}</div>
                </div>
              ))
            ) : (
              <>
                <div className="text-center p-4 rounded-lg bg-primary/5">
                  <div className="text-3xl font-bold text-primary">
                    {balance?.vacation_days || 0}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Vacation Days</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-primary/5">
                  <div className="text-3xl font-bold text-primary">
                    {balance?.sick_days || 0}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Sick Days</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-primary/5">
                  <div className="text-3xl font-bold text-primary">
                    {balance?.pto_days || 0}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">PTO Days</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
