import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { AddLeaveBalanceDialog } from "@/components/dialogs/AddLeaveBalanceDialog";

interface LeaveManagementProps {
  employeeId: string;
}

interface LeaveTypeBalance {
  id: string;
  balance: number;
  leave_type: {
    id: string;
    name: string;
    category: string;
  };
}

export const LeaveManagement = ({ employeeId }: LeaveManagementProps) => {
  const queryClient = useQueryClient();
  const { isHR, isAdmin } = useUserRole();
  const { currentOrg } = useOrganization();
  const currentYear = new Date().getFullYear();
  const canManageLeave = isHR || isAdmin;

  const { data: balances = [], refetch: refetchBalance } = useQuery({
    queryKey: ["leave-type-balances", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_type_balances")
        .select(`
          id,
          balance,
          leave_type:leave_types!inner(
            id,
            name,
            category
          )
        `)
        .eq("employee_id", employeeId)
        .eq("year", currentYear);

      if (error) throw error;
      return (data || []) as LeaveTypeBalance[];
    },
  });

  const handleLeaveBalanceUpdate = () => {
    refetchBalance();
    queryClient.invalidateQueries({ queryKey: ["leave-type-balances", employeeId] });
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-end gap-2 mb-4">
          <Link to={`/team/${employeeId}/leave-history`}>
            <Button size="sm" variant="ghost">
              <History className="h-4 w-4 mr-1" />
              Leave History
            </Button>
          </Link>
          {canManageLeave && (
            <AddLeaveBalanceDialog
              employeeId={employeeId}
              onSuccess={handleLeaveBalanceUpdate}
            />
          )}
        </div>
        {balances.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {balances.slice(0, 3).map((item) => (
              <div key={item.id} className="text-center p-4 rounded-lg bg-primary/5">
                <div className="text-3xl font-bold text-primary">
                  {item.balance}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{item.leave_type.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No leave balance set for this year
          </p>
        )}
      </CardContent>
    </Card>
  );
};
