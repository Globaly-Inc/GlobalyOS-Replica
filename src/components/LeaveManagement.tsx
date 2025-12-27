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

interface LeaveBalance {
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

  // Fetch leave balances directly from leave_type_balances (the authoritative source)
  const { data: balances = [] } = useQuery({
    queryKey: ["leave-type-balances-profile", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_type_balances")
        .select(`
          balance,
          leave_type:leave_types!inner(
            name,
            category
          )
        `)
        .eq("employee_id", employeeId)
        .eq("year", currentYear);

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        leave_type_name: item.leave_type.name,
        category: item.leave_type.category,
        balance: item.balance,
      })) as LeaveBalance[];
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

  // Sort: paid first, then alphabetically
  const sortedBalances = [...balances].sort((a, b) => {
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
