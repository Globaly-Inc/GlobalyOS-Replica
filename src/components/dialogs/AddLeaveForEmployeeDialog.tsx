import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Plus } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useQueryClient } from "@tanstack/react-query";

interface LeaveType {
  id: string;
  name: string;
  category: string;
}

interface AddLeaveForEmployeeDialogProps {
  employeeId: string;
  employeeName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddLeaveForEmployeeDialog = ({
  employeeId,
  employeeName,
  open,
  onOpenChange,
  onSuccess
}: AddLeaveForEmployeeDialogProps) => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [halfDayType, setHalfDayType] = useState<string>("full");
  const [reason, setReason] = useState<string>("");
  const [status, setStatus] = useState<string>("approved");

  useEffect(() => {
    if (open && currentOrg) {
      loadLeaveTypes();
      // Reset form
      setLeaveTypeId("");
      setStartDate(undefined);
      setEndDate(undefined);
      setHalfDayType("full");
      setReason("");
      setStatus("approved");
    }
  }, [open, currentOrg?.id]);

  // Force end_date to match start_date for half-day leaves
  useEffect(() => {
    if (halfDayType !== "full" && startDate) {
      setEndDate(startDate);
    }
  }, [halfDayType, startDate]);

  const loadLeaveTypes = async () => {
    if (!currentOrg) return;
    const { data, error } = await supabase
      .from("leave_types")
      .select("id, name, category")
      .eq("organization_id", currentOrg.id)
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setLeaveTypes(data);
    }
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    if (halfDayType !== "full") return 0.5;
    return differenceInCalendarDays(endDate, startDate) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leaveTypeId || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    setLoading(true);
    try {
      const selectedLeaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
      if (!selectedLeaveType) throw new Error("Leave type not found");

      const daysCount = calculateDays();

      // Get current user's employee ID for created_by tracking
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user?.id)
        .eq("organization_id", currentOrg?.id)
        .maybeSingle();

      const { error } = await supabase.from("leave_requests").insert({
        employee_id: employeeId,
        organization_id: currentOrg?.id,
        leave_type: selectedLeaveType.name,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        days_count: daysCount,
        half_day_type: halfDayType,
        reason: reason || `Added by HR/Admin`,
        status: status,
        reviewed_by: currentEmployee?.id,
        reviewed_at: new Date().toISOString()
      });

      if (error) throw error;

      // Notify employee about the added leave
      if (currentEmployee) {
        await supabase.from("notifications").insert({
          user_id: (await supabase.from("employees").select("user_id").eq("id", employeeId).single()).data?.user_id,
          organization_id: currentOrg?.id,
          type: "leave_added",
          title: "Leave Added",
          message: `${selectedLeaveType.name} leave (${daysCount} day${daysCount !== 1 ? 's' : ''}) was added to your record by HR/Admin`,
          reference_type: "leave_request",
          actor_id: currentEmployee.id
        });
      }

      toast.success("Leave added successfully");
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error adding leave:", error);
      toast.error(error.message || "Failed to add leave");
    } finally {
      setLoading(false);
    }
  };

  const isHalfDay = halfDayType !== "full";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Leave for Employee</DialogTitle>
            <DialogDescription>
              Add leave record for {employeeName || "this employee"}. This will be recorded in their leave history.
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

            <div className="grid gap-2">
              <Label>Duration *</Label>
              <RadioGroup
                value={halfDayType}
                onValueChange={setHalfDayType}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="add-full" />
                  <Label htmlFor="add-full" className="cursor-pointer">Full Day</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="first_half" id="add-first_half" />
                  <Label htmlFor="add-first_half" className="cursor-pointer">First Half</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="second_half" id="add-second_half" />
                  <Label htmlFor="add-second_half" className="cursor-pointer">Second Half</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{isHalfDay ? "Date *" : "Start Date *"}</Label>
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
              {!isHalfDay && (
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
              )}
              {isHalfDay && (
                <div className="grid gap-2">
                  <Label>Days</Label>
                  <div className="h-10 flex items-center px-3 border rounded-md bg-muted text-sm">
                    0.5
                  </div>
                </div>
              )}
            </div>

            {!isHalfDay && (
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">{calculateDays()}</span> day(s)
              </div>
            )}

            <div className="grid gap-2">
              <Label>Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
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
              {loading ? "Adding..." : "Add Leave"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};