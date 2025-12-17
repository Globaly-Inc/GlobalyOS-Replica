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

  // Fetch leave types for category lookup
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types-for-management", employeeId],
    queryFn: async () => {
      const { data: employee } = await supabase
        .from("employees")
        .select("organization_id")
        .eq("id", employeeId)
        .maybeSingle();
      
      if (!employee) return [];
      
      const { data } = await supabase
        .from("leave_types")
        .select("name, category")
        .eq("organization_id", employee.organization_id)
        .eq("is_active", true);
      
      return data || [];
    },
  });

  // Fetch adjustments from leave_balance_logs (correct column: change_amount, leave_type is string)
  const { data: adjustments = [] } = useQuery({
    queryKey: ["leave-adjustments", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balance_logs")
        .select("change_amount, leave_type")
        .eq("employee_id", employeeId)
        .gte("created_at", yearStart)
        .lte("created_at", `${yearEnd}T23:59:59`);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch approved leave requests (correct column: days_count, leave_type is string)
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["leave-requests-taken", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("days_count, leave_type")
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
        .maybeSingle();

      if (error) throw error;
      return data as HourBalance | null;
    },
  });

  // Helper to get category from leave type name
  const getCategory = (leaveTypeName: string): string => {
    const lt = leaveTypes.find(t => t.name === leaveTypeName);
    return lt?.category || 'paid';
  };

  // Calculate balances: Sum(Adjustments) - Sum(Approved Leave Taken)
  const calculatedBalances: CalculatedBalance[] = (() => {
    const balanceMap = new Map<string, CalculatedBalance>();

    // Add adjustments
    adjustments.forEach((adj: any) => {
      const leaveTypeName = adj.leave_type;
      if (!balanceMap.has(leaveTypeName)) {
        balanceMap.set(leaveTypeName, {
          leave_type_name: leaveTypeName,
          category: getCategory(leaveTypeName),
          balance: 0,
        });
      }
      const current = balanceMap.get(leaveTypeName)!;
      current.balance += adj.change_amount;
    });

    // Subtract approved leave taken
    leaveRequests.forEach((req: any) => {
      const leaveTypeName = req.leave_type;
      if (!balanceMap.has(leaveTypeName)) {
        balanceMap.set(leaveTypeName, {
          leave_type_name: leaveTypeName,
          category: getCategory(leaveTypeName),
          balance: 0,
        });
      }
      const current = balanceMap.get(leaveTypeName)!;
      current.balance -= req.days_count;
    });

    return Array.from(balanceMap.values());
  })();

  // Sort: paid first, then alphabetically
  const sortedBalances = calculatedBalances.sort((a, b) => {
    if (a.category === 'paid' && b.category !== 'paid') return -1;
    if (a.category !== 'paid' && b.category === 'paid') return 1;
    return a.leave_type_name.localeCompare(b.leave_type_name);
  });

  // Calculate totals for Taken and Adjusted cards
  const totalTaken = leaveRequests.reduce((sum, req: any) => sum + (req.days_count || 0), 0);
  const totalAdjustments = adjustments.reduce((sum, adj: any) => sum + (adj.change_amount || 0), 0);

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
        <div className="space-y-4">
          {/* Leave Type Balances */}
          <div 
            className="grid gap-3"
            style={{ 
              gridTemplateColumns: `repeat(auto-fit, minmax(${sortedBalances.length <= 2 ? '45%' : sortedBalances.length === 3 ? '30%' : '140px'}, 1fr))` 
            }}
          >
            {sortedBalances.map((item) => (
              <div 
                key={item.leave_type_name} 
                className={`text-center p-4 rounded-xl border transition-colors ${
                  item.balance < 0 
                    ? 'bg-destructive/5 border-destructive/20' 
                    : 'bg-primary/5 border-primary/10 hover:border-primary/20'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div className={`p-2 rounded-full ${item.balance < 0 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                    <span className={item.balance < 0 ? 'text-destructive' : 'text-primary'}>
                      {getLeaveTypeIcon(item.leave_type_name)}
                    </span>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${item.balance < 0 ? 'text-destructive' : 'text-primary'}`}>
                  {item.balance < 0 ? `(${Math.abs(item.balance)})` : item.balance}
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-1.5 truncate">{item.leave_type_name}</div>
              </div>
            ))}
          </div>
          
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">
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
