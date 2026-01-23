import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useEmployeeLeaveTypesQuery } from "@/hooks/useEmployeeLeaveTypesQuery";

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day_type: string;
  reason: string | null;
  status: string;
  employee_id?: string;
}

interface EditLeaveRequestDialogProps {
  request: LeaveRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  employeeId?: string;
}

export const EditLeaveRequestDialog = ({
  request,
  open,
  onOpenChange,
  onSuccess,
  employeeId
}: EditLeaveRequestDialogProps) => {
  const { currentOrg } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [halfDayType, setHalfDayType] = useState<string>("full");
  const [reason, setReason] = useState<string>("");
  const [status, setStatus] = useState<string>("pending");
  const [originalStatus, setOriginalStatus] = useState<string>("pending");

  // Use the employee ID from request or prop
  const targetEmployeeId = request?.employee_id || employeeId;
  
  // Use office-aware leave types query
  const { data: leaveTypes = [], refetch: refetchLeaveTypes } = useEmployeeLeaveTypesQuery(targetEmployeeId);

  useEffect(() => {
    if (open && currentOrg) {
      refetchLeaveTypes();
    }
  }, [open, currentOrg?.id, refetchLeaveTypes]);

  useEffect(() => {
    if (request && open && leaveTypes.length > 0) {
      // Find matching leave type by name
      const matchedType = leaveTypes.find(lt => lt.name === request.leave_type);
      setLeaveTypeId(matchedType?.id || "");
      setStartDate(new Date(request.start_date));
      setEndDate(new Date(request.end_date));
      setHalfDayType(request.half_day_type);
      setReason(request.reason || "");
      setStatus(request.status);
      setOriginalStatus(request.status);
    }
  }, [request, open, leaveTypes]);

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const days = differenceInDays(endDate, startDate) + 1;
    if (halfDayType !== "full") return days - 0.5;
    return days;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (!leaveTypeId || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    // Get the selected leave type details
    const selectedLeaveType = leaveTypes.find(lt => lt.id === leaveTypeId);

    setLoading(true);
    try {
      const daysCount = calculateDays();
      
      // Get current user's employee ID for audit trail
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentEmployee } = await supabase
        .from("employees")
        .select("id, profiles!inner(full_name)")
        .eq("user_id", user?.id)
        .eq("organization_id", currentOrg?.id)
        .maybeSingle();

      const updateData: any = {
        leave_type: selectedLeaveType?.name || request.leave_type,  // Text for display
        leave_type_id: leaveTypeId,                                   // FK for trigger
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        days_count: daysCount,
        half_day_type: halfDayType,
        reason: reason || null,
        status: status,
        updated_by: currentEmployee?.id,
        updated_at: new Date().toISOString()
      };

      // If status changed, update reviewed_by and reviewed_at
      if (status !== originalStatus && currentEmployee) {
        updateData.reviewed_by = currentEmployee.id;
        updateData.reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("leave_requests")
        .update(updateData)
        .eq("id", request.id);

      if (error) throw error;

      // Send notification to employee about the edit
      if (employeeId && currentEmployee) {
        const { data: employeeData } = await supabase
          .from("employees")
          .select("user_id")
          .eq("id", employeeId)
          .single();

        if (employeeData?.user_id) {
          const editorName = (currentEmployee.profiles as any)?.full_name || "HR/Admin";
          const leaveTypeName = selectedLeaveType?.name || request.leave_type;
          let notificationMessage = `Your ${leaveTypeName} leave request was updated by ${editorName}`;
          
          // Add specific message if status changed
          if (status !== originalStatus) {
            notificationMessage = `Your ${leaveTypeName} leave request was ${status} by ${editorName}`;
          }

          await supabase.from("notifications").insert({
            user_id: employeeData.user_id,
            organization_id: currentOrg?.id,
            type: status !== originalStatus ? `leave_${status}` : "leave_updated",
            title: status !== originalStatus ? `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}` : "Leave Request Updated",
            message: notificationMessage,
            reference_type: "leave_request",
            reference_id: request.id,
            actor_id: currentEmployee.id
          });
        }
      }

      toast.success("Leave request updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating leave request:", error);
      toast.error(error.message || "Failed to update leave request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
            <DialogDescription>
              Modify the leave request details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="leave-type">Leave Type *</Label>
              <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                <SelectTrigger id="leave-type">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name} ({lt.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Half Day</Label>
                <Select value={halfDayType} onValueChange={setHalfDayType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Day</SelectItem>
                    <SelectItem value="first_half">First Half</SelectItem>
                    <SelectItem value="second_half">Second Half</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Days Count</Label>
                <Input value={calculateDays()} disabled className="bg-muted" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Reason for leave"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};