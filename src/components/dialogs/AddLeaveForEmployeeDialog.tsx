import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, Search, UserPlus } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import { useOrganization } from "@/hooks/useOrganization";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmployeeLeaveTypesQuery } from "@/hooks/useEmployeeLeaveTypesQuery";

interface AddLeaveForEmployeeDialogProps {
  employeeId?: string;
  employeeName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddLeaveForEmployeeDialog = ({
  employeeId: initialEmployeeId,
  employeeName: initialEmployeeName,
  open,
  onOpenChange,
  onSuccess
}: AddLeaveForEmployeeDialogProps) => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState<string>(initialEmployeeId || "");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [halfDayType, setHalfDayType] = useState<string>("full");
  const [reason, setReason] = useState<string>("");
  const [status, setStatus] = useState<string>("approved");

  // Use office-aware leave types query - refetch when employee changes
  const { data: leaveTypes = [], refetch: refetchLeaveTypes } = useEmployeeLeaveTypesQuery(employeeId || initialEmployeeId);

  // Fetch employees when no initial employee provided
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-leave-add", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          position,
          department,
          profiles!inner(full_name, avatar_url)
        `)
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .order("profiles(full_name)");

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id && open && !initialEmployeeId
  });

  const filteredEmployees = employees.filter(emp => {
    const name = (emp.profiles as any)?.full_name?.toLowerCase() || "";
    return name.includes(employeeSearch.toLowerCase());
  });

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const displayName = initialEmployeeName || (selectedEmployee?.profiles as any)?.full_name || "";

  useEffect(() => {
    if (open) {
      // Reset form
      setEmployeeId(initialEmployeeId || "");
      setEmployeeSearch("");
      setLeaveTypeId("");
      setStartDate(undefined);
      setEndDate(undefined);
      setHalfDayType("full");
      setReason("");
      setStatus("approved");
    }
  }, [open, initialEmployeeId]);

  // Refetch leave types when employee changes
  useEffect(() => {
    if (employeeId && open) {
      refetchLeaveTypes();
      // Reset leave type selection when employee changes
      setLeaveTypeId("");
    }
  }, [employeeId, open, refetchLeaveTypes]);

  // Force end_date to match start_date for half-day leaves
  useEffect(() => {
    if (halfDayType !== "full" && startDate) {
      setEndDate(startDate);
    }
  }, [halfDayType, startDate]);

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    if (halfDayType !== "full") return 0.5;
    return differenceInCalendarDays(endDate, startDate) + 1;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId) {
      toast.error("Please select a team member");
      return;
    }
    
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
        leave_type_id: selectedLeaveType.id,
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
        const { data: targetEmployee } = await supabase
          .from("employees")
          .select("user_id")
          .eq("id", employeeId)
          .single();
          
        if (targetEmployee?.user_id) {
          await supabase.from("notifications").insert({
            user_id: targetEmployee.user_id,
            organization_id: currentOrg?.id,
            type: "leave_added",
            title: "Leave Added",
            message: `${selectedLeaveType.name} leave (${daysCount} day${daysCount !== 1 ? 's' : ''}) was added to your record by HR/Admin`,
            reference_type: "leave_request",
            actor_id: currentEmployee.id
          });
        }
      }

      toast.success("Leave added successfully");
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      showErrorToast(error, "Failed to add leave", {
        componentName: "AddLeaveForEmployeeDialog",
        actionAttempted: "Add leave for employee",
        errorType: "database",
      });
    } finally {
      setLoading(false);
    }
  };

  const isHalfDay = halfDayType !== "full";
  const showEmployeeSelector = !initialEmployeeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Leave for Team Member
            </DialogTitle>
            <DialogDescription>
              {displayName 
                ? `Add leave record for ${displayName}`
                : "Select a team member and add leave to their record"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Employee Selector (only show when not pre-selected) */}
            {showEmployeeSelector && (
              <div className="space-y-2">
                <Label>Team Member *</Label>
                {!employeeId ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search team member..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-[180px] overflow-y-auto border rounded-md">
                      {filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No team members found
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            type="button"
                            key={emp.id}
                            onClick={() => {
                              setEmployeeId(emp.id);
                              setEmployeeSearch("");
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left border-b last:border-b-0"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={(emp.profiles as any)?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials((emp.profiles as any)?.full_name || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {(emp.profiles as any)?.full_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {emp.position} • {emp.department}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={(selectedEmployee?.profiles as any)?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials((selectedEmployee?.profiles as any)?.full_name || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {(selectedEmployee?.profiles as any)?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedEmployee?.position}
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEmployeeId("")}>
                      Change
                    </Button>
                  </div>
                )}
              </div>
            )}

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
                  <Label htmlFor="add-full" className="cursor-pointer font-normal">Full Day</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="first_half" id="add-first_half" />
                  <Label htmlFor="add-first_half" className="cursor-pointer font-normal">First Half</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="second_half" id="add-second_half" />
                  <Label htmlFor="add-second_half" className="cursor-pointer font-normal">Second Half</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{isHalfDay ? "Date *" : "Start Date *"}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
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
                        type="button"
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
                        disabled={(date) => startDate ? date < startDate : false}
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

            {!isHalfDay && startDate && endDate && (
              <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
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
