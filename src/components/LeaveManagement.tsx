import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, Sun, Heart, Moon, Briefcase, Baby, Plane } from "lucide-react";

interface LeaveManagementProps {
  employeeId: string;
}

interface HourBalance {
  overtime_minutes: number;
  undertime_minutes: number;
}

interface CalculatedBalance {
  leave_type_id: string;
  leave_type_name: string;
  category: string;
  balance: number;
}

// Get icon for leave type
const getLeaveTypeIcon = (leaveType: string) => {
  const type = leaveType.toLowerCase();
  if (type.includes('annual') || type.includes('vacation')) return <Sun className="h-3.5 w-3.5" />;
  if (type.includes('sick') || type.includes('medical')) return <Heart className="h-3.5 w-3.5" />;
  if (type.includes('menstrual') || type.includes('period')) return <Moon className="h-3.5 w-3.5" />;
  if (type.includes('unpaid')) return <Clock className="h-3.5 w-3.5" />;
  if (type.includes('maternity') || type.includes('paternity') || type.includes('parental')) return <Baby className="h-3.5 w-3.5" />;
  if (type.includes('travel') || type.includes('holiday')) return <Plane className="h-3.5 w-3.5" />;
  return <Briefcase className="h-3.5 w-3.5" />;
};

export const LeaveManagement = ({ employeeId }: LeaveManagementProps) => {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  // Fetch adjustments from leave_balance_logs
  const { data: adjustments = [] } = useQuery({
    queryKey: ["leave-adjustments", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balance_logs")
        .select(`
          days_changed,
          leave_type:leave_types!inner(
            id,
            name,
            category
          )
        `)
        .eq("employee_id", employeeId)
        .gte("created_at", yearStart)
        .lte("created_at", `${yearEnd}T23:59:59`);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch approved leave requests
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["leave-requests-taken", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          days,
          leave_type:leave_types!inner(
            id,
            name,
            category
          )
        `)
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .gte("start_date", yearStart)
        .lte("start_date", yearEnd);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: hourBalance } = useQuery({
    queryKey: ["attendance-hour-balance", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_hour_balances")
        .select("overtime_minutes, undertime_minutes")
        .eq("employee_id", employeeId)
        .eq("year", currentYear)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as HourBalance | null;
    },
  });

  // Calculate balances: Sum(Adjustments) - Sum(Approved Leave Taken)
  const calculatedBalances: CalculatedBalance[] = (() => {
    const balanceMap = new Map<string, CalculatedBalance>();

    // Add adjustments
    adjustments.forEach((adj: any) => {
      const leaveTypeId = adj.leave_type.id;
      if (!balanceMap.has(leaveTypeId)) {
        balanceMap.set(leaveTypeId, {
          leave_type_id: leaveTypeId,
          leave_type_name: adj.leave_type.name,
          category: adj.leave_type.category,
          balance: 0,
        });
      }
      const current = balanceMap.get(leaveTypeId)!;
      current.balance += adj.days_changed;
    });

    // Subtract approved leave taken
    leaveRequests.forEach((req: any) => {
      const leaveTypeId = req.leave_type.id;
      if (!balanceMap.has(leaveTypeId)) {
        balanceMap.set(leaveTypeId, {
          leave_type_id: leaveTypeId,
          leave_type_name: req.leave_type.name,
          category: req.leave_type.category,
          balance: 0,
        });
      }
      const current = balanceMap.get(leaveTypeId)!;
      current.balance -= req.days;
    });

    return Array.from(balanceMap.values());
  })();

  // Sort: paid first, then alphabetically
  const sortedBalances = calculatedBalances.sort((a, b) => {
    if (a.category === 'paid' && b.category !== 'paid') return -1;
    if (a.category !== 'paid' && b.category === 'paid') return 1;
    return a.leave_type_name.localeCompare(b.leave_type_name);
  });

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const hasHourBalance = hourBalance && (hourBalance.overtime_minutes > 0 || hourBalance.undertime_minutes > 0);

  return (
    <div className="space-y-4">
      {sortedBalances.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedBalances.map((item) => (
            <div 
              key={item.leave_type_id} 
              className={`text-center p-3 rounded-lg ${item.balance < 0 ? 'bg-destructive/10' : 'bg-primary/5'}`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className={item.balance < 0 ? 'text-destructive' : 'text-primary'}>
                  {getLeaveTypeIcon(item.leave_type_name)}
                </span>
              </div>
              <div className={`text-2xl font-bold ${item.balance < 0 ? 'text-destructive' : 'text-primary'}`}>
                {item.balance < 0 ? `(${Math.abs(item.balance)})` : item.balance}
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{item.leave_type_name}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No leave balance available
        </p>
      )}

      {hasHourBalance && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Clock className="h-4 w-4" />
            <span>Accumulated Hours</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {hourBalance.overtime_minutes > 0 && (
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                <TrendingUp className="h-3.5 w-3.5" />
                Overtime: {formatMinutes(hourBalance.overtime_minutes)}
              </Badge>
            )}
            {hourBalance.undertime_minutes > 0 && (
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                <TrendingDown className="h-3.5 w-3.5" />
                Undertime: {formatMinutes(hourBalance.undertime_minutes)}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
