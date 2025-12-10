import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface LeaveBalanceLog {
  id: string;
  leave_type: string;
  change_amount: number;
  previous_balance: number;
  new_balance: number;
  reason: string | null;
  created_at: string;
  created_by_employee: {
    profiles: {
      full_name: string;
    };
  } | null;
}

interface LeaveBalanceLogsDialogProps {
  employeeId: string;
}

export const LeaveBalanceLogsDialog = ({
  employeeId,
}: LeaveBalanceLogsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LeaveBalanceLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leave_balance_logs")
        .select(`
          id,
          leave_type,
          change_amount,
          previous_balance,
          new_balance,
          reason,
          created_at,
          created_by_employee:employees!leave_balance_logs_created_by_fkey(
            profiles!inner(full_name)
          )
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs((data as any) || []);
    } catch (error) {
      console.error("Error loading leave balance logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadLogs();
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: "Vacation",
      sick: "Sick Leave",
      pto: "PTO",
    };
    return labels[type] || type;
  };

  const getLeaveTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "vacation":
        return "default";
      case "sick":
        return "secondary";
      case "pto":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <History className="h-4 w-4 mr-1" />
          Leave Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Leave Balance History
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No leave balance changes recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getLeaveTypeBadgeVariant(log.leave_type)}>
                        {getLeaveTypeLabel(log.leave_type)}
                      </Badge>
                      {log.change_amount > 0 ? (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-600"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{log.change_amount}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-red-600 border-red-600"
                        >
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {log.change_amount}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Balance:</span>
                    <span className="text-muted-foreground line-through">
                      {log.previous_balance}
                    </span>
                    <span className="text-foreground">→</span>
                    <span className="font-medium">{log.new_balance}</span>
                  </div>
                  {log.reason && (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                      {log.reason}
                    </p>
                  )}
                  {log.created_by_employee?.profiles && (
                    <p className="text-xs text-muted-foreground">
                      Updated by {log.created_by_employee.profiles.full_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
