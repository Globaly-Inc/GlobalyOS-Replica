import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const currentYear = new Date().getFullYear();

  const { data: balances = [] } = useQuery({
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

  // Filter to only show leave types with balance > 0
  const balancesWithValue = balances.filter((item) => item.balance > 0);

  return (
    <div>
      {balancesWithValue.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {balancesWithValue.map((item) => (
            <div key={item.id} className="text-center p-3 rounded-lg bg-primary/5">
              <div className="text-2xl font-bold text-primary">
                {item.balance}
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{item.leave_type.name}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No leave balance available
        </p>
      )}
    </div>
  );
};
