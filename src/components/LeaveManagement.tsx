import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, Sun, Heart, Moon, Briefcase, Baby, Plane } from "lucide-react";

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

interface HourBalance {
  overtime_minutes: number;
  undertime_minutes: number;
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

  // Show ALL balances (including zero/negative), sort paid first
  const sortedBalances = balances.sort((a, b) => {
    if (a.leave_type.category === 'paid' && b.leave_type.category !== 'paid') return -1;
    if (a.leave_type.category !== 'paid' && b.leave_type.category === 'paid') return 1;
    return a.leave_type.name.localeCompare(b.leave_type.name);
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
              key={item.id} 
              className={`text-center p-3 rounded-lg ${item.balance < 0 ? 'bg-destructive/10' : 'bg-primary/5'}`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className={item.balance < 0 ? 'text-destructive' : 'text-primary'}>
                  {getLeaveTypeIcon(item.leave_type.name)}
                </span>
              </div>
              <div className={`text-2xl font-bold ${item.balance < 0 ? 'text-destructive' : 'text-primary'}`}>
                {item.balance < 0 ? `(${Math.abs(item.balance)})` : item.balance}
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
