import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Plus } from "lucide-react";
import { format, differenceInCalendarDays, addDays, isSameDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EmploymentType = 'trainee' | 'intern' | 'contract' | 'employee';

interface LeaveType {
  id: string;
  name: string;
  min_days_advance: number;
  category: string;
  max_negative_days: number;
  applies_to_gender: 'all' | 'male' | 'female';
  applies_to_employment_types: EmploymentType[] | null;
  currentBalance: number;
  availableBalance: number;
  isExhausted: boolean;
}

const formSchema = z.object({
  leave_type_id: z.string().min(1, "Please select a leave type"),
  start_date: z.date({ required_error: "Start date is required" }),
  end_date: z.date({ required_error: "End date is required" }),
  half_day_type: z.enum(["full", "first_half", "second_half"]),
  reason: z.string().min(1, "Reason is required"),
}).refine((data) => data.end_date >= data.start_date, {
  message: "End date must be after or equal to start date",
  path: ["end_date"],
});

interface AddLeaveRequestDialogProps {
  employeeId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export const AddLeaveRequestDialog = ({ 
  employeeId, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  trigger 
}: AddLeaveRequestDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  const { currentOrg } = useOrganization();
  
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leave_type_id: "",
      half_day_type: "full",
      reason: "",
    },
  });

  const selectedHalfDayType = form.watch("half_day_type");
  const selectedStartDate = form.watch("start_date");

  // Force end_date to match start_date for half-day leaves
  useEffect(() => {
    if (selectedHalfDayType !== "full" && selectedStartDate) {
      form.setValue("end_date", selectedStartDate);
    }
  }, [selectedHalfDayType, selectedStartDate, form]);

  // Fetch employee's office_id, gender, and employment_type
  const { data: employeeData } = useQuery({
    queryKey: ["employee-office-gender-employment", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("office_id, gender, employment_type")
        .eq("id", employeeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  // Fetch leave types based on employee's office, gender, and employment type, including balances
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types-for-employee", currentOrg?.id, employeeData?.office_id, employeeData?.gender, employeeData?.employment_type, employeeId],
    queryFn: async () => {
      if (!currentOrg) return [];
      
      const currentYear = new Date().getFullYear();
      
      // Get all active leave types for the organization
      const { data: types, error } = await supabase
        .from("leave_types")
        .select("id, name, min_days_advance, category, applies_to_all_offices, max_negative_days, applies_to_gender, applies_to_employment_types")
        .eq("organization_id", currentOrg.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      if (!types) return [];

      // Fetch all balances for this employee for the current year
      const { data: balances } = await supabase
        .from("leave_type_balances")
        .select("leave_type_id, balance")
        .eq("employee_id", employeeId)
        .eq("year", currentYear);

      const balanceMap = new Map(balances?.map(b => [b.leave_type_id, b.balance]) || []);

      // Filter by office, gender, and employment type
      const filteredTypes: LeaveType[] = [];
      const employeeGender = employeeData?.gender;
      const employeeEmploymentType = employeeData?.employment_type;
      
      for (const type of types) {
        // Check gender restriction
        const genderRestriction = type.applies_to_gender || 'all';
        if (genderRestriction !== 'all') {
          // If there's a gender restriction, check if employee's gender matches
          if (!employeeGender || employeeGender !== genderRestriction) {
            continue; // Skip this leave type
          }
        }
        
        // Check employment type restriction
        const employmentTypes = type.applies_to_employment_types;
        if (employmentTypes && employmentTypes.length > 0) {
          if (!employeeEmploymentType || !employmentTypes.includes(employeeEmploymentType)) {
            continue; // Skip this leave type
          }
        }
        
        const currentBalance = balanceMap.get(type.id) || 0;
        const maxNegative = type.max_negative_days || 0;
        const availableBalance = currentBalance + maxNegative;
        const isExhausted = availableBalance <= 0;
        
        // Check office restriction
        if (type.applies_to_all_offices) {
          filteredTypes.push({
            id: type.id,
            name: type.name,
            min_days_advance: type.min_days_advance,
            category: type.category,
            max_negative_days: maxNegative,
            applies_to_gender: (type.applies_to_gender || 'all') as 'all' | 'male' | 'female',
            applies_to_employment_types: type.applies_to_employment_types as EmploymentType[] | null,
            currentBalance,
            availableBalance,
            isExhausted,
          });
        } else if (employeeData?.office_id) {
          // Check if this leave type applies to the employee's office
          const { data: officeMapping } = await supabase
            .from("leave_type_offices")
            .select("id")
            .eq("leave_type_id", type.id)
            .eq("office_id", employeeData.office_id)
            .single();
          
          if (officeMapping) {
            filteredTypes.push({
              id: type.id,
              name: type.name,
              min_days_advance: type.min_days_advance,
              category: type.category,
              max_negative_days: maxNegative,
              applies_to_gender: (type.applies_to_gender || 'all') as 'all' | 'male' | 'female',
              applies_to_employment_types: type.applies_to_employment_types as EmploymentType[] | null,
              currentBalance,
              availableBalance,
              isExhausted,
            });
          }
        }
      }

      return filteredTypes;
    },
    enabled: !!currentOrg && employeeData !== undefined && !!employeeId,
  });

  // Fetch existing leave requests for the employee to check overlaps
  const { data: existingRequests = [] } = useQuery({
    queryKey: ["employee-leave-requests", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("start_date, end_date, half_day_type, status")
        .eq("employee_id", employeeId)
        .in("status", ["pending", "approved"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const selectedLeaveType = leaveTypes.find(lt => lt.id === values.leave_type_id);
      if (!selectedLeaveType) throw new Error("Invalid leave type");

      // Calculate days count
      let daysCount: number;
      if (values.half_day_type !== "full") {
        daysCount = 0.5;
      } else {
        daysCount = differenceInCalendarDays(values.end_date, values.start_date) + 1;
      }

      // Validate min_days_advance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntilStart = differenceInCalendarDays(values.start_date, today);
      
      if (daysUntilStart < selectedLeaveType.min_days_advance) {
        throw new Error(`This leave type requires at least ${selectedLeaveType.min_days_advance} days advance notice`);
      }

      // Check leave balance against max_negative_days limit
      const currentYear = new Date().getFullYear();
      
      // Get leave type ID to check balance
      const { data: leaveTypeData } = await supabase
        .from("leave_types")
        .select("id")
        .eq("organization_id", currentOrg?.id)
        .eq("name", selectedLeaveType.name)
        .maybeSingle();

      if (leaveTypeData) {
        // Get current balance
        const { data: balanceData } = await supabase
          .from("leave_type_balances")
          .select("balance")
          .eq("employee_id", employeeId)
          .eq("leave_type_id", leaveTypeData.id)
          .eq("year", currentYear)
          .maybeSingle();

        const currentBalance = balanceData?.balance || 0;
        const projectedBalance = currentBalance - daysCount;
        const maxNegative = selectedLeaveType.max_negative_days || 0;

        if (projectedBalance < -maxNegative) {
          if (maxNegative === 0) {
            throw new Error(`Insufficient ${selectedLeaveType.name} balance. You have ${currentBalance} days remaining.`);
          } else {
            throw new Error(`Insufficient ${selectedLeaveType.name} balance. You have ${currentBalance} days remaining with a maximum negative balance of ${maxNegative} days allowed.`);
          }
        }
      }

      // Check for overlapping requests
      const startDateStr = format(values.start_date, "yyyy-MM-dd");
      const endDateStr = format(values.end_date, "yyyy-MM-dd");

      for (const existing of existingRequests) {
        const existingStart = new Date(existing.start_date);
        const existingEnd = new Date(existing.end_date);
        
        // Check if dates overlap
        const requestStart = values.start_date;
        const requestEnd = values.end_date;
        
        const hasOverlap = requestStart <= existingEnd && requestEnd >= existingStart;
        
        if (hasOverlap) {
          // If existing request is a full day for the overlapping period - block any new request
          if (existing.half_day_type === "full") {
            throw new Error("You already have a full day leave request for this date range");
          }
          
          // If requesting a full day and there's an existing half day request
          if (values.half_day_type === "full" && existing.half_day_type !== "full" && isSameDay(requestStart, existingStart)) {
            throw new Error("You already have a half day leave request for this date. Please cancel it first to request a full day.");
          }
          
          // If both are half days on the same date
          if (values.half_day_type !== "full" && existing.half_day_type !== "full" && isSameDay(requestStart, existingStart)) {
            // If same half (both first_half or both second_half)
            if (values.half_day_type === existing.half_day_type) {
              throw new Error(`You already have a ${values.half_day_type === "first_half" ? "first half" : "second half"} leave request for this date`);
            }
            // Different halves - this means they want full day now, update existing to full
            // Delete existing half day and create full day
            const { error: deleteError } = await supabase
              .from("leave_requests")
              .update({ 
                half_day_type: "full",
                days_count: 1,
                reason: values.reason,
              })
              .eq("employee_id", employeeId)
              .eq("start_date", existing.start_date)
              .eq("half_day_type", existing.half_day_type)
              .in("status", ["pending", "approved"]);
            
            if (deleteError) throw deleteError;
            
            // Return early - we updated the existing request
            return { updated: true };
          }
        }
      }

      const { error } = await supabase.from("leave_requests").insert({
        employee_id: employeeId,
        organization_id: currentOrg?.id,
        leave_type: selectedLeaveType.name,
        start_date: startDateStr,
        end_date: endDateStr,
        days_count: daysCount,
        half_day_type: values.half_day_type,
        reason: values.reason,
      });

      if (error) throw error;

      // Get employee name for notification
      const { data: employee } = await supabase
        .from("employees")
        .select("profiles!inner(full_name)")
        .eq("id", employeeId)
        .single();

      const employeeName = (employee?.profiles as any)?.full_name || "Team member";

      // Send notification to manager and HR
      try {
        await supabase.functions.invoke("notify-leave-request", {
          body: {
            employee_id: employeeId,
            employee_name: employeeName,
            leave_type: selectedLeaveType.name,
            start_date: startDateStr,
            end_date: endDateStr,
            days_count: daysCount,
            half_day_type: values.half_day_type,
            reason: values.reason,
            organization_id: currentOrg?.id,
          },
        });
        console.log("Leave notification sent successfully");
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
      }

      return { updated: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-leave-requests"] });
      toast.success(result?.updated ? "Leave request updated to full day" : "Leave request submitted successfully");
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit leave request");
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values);
  };

  const isHalfDay = selectedHalfDayType !== "full";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="leave_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaveTypes.length === 0 ? (
                        <SelectItem value="none" disabled>No leave types available</SelectItem>
                      ) : (
                        leaveTypes.map((lt) => (
                          <SelectItem 
                            key={lt.id} 
                            value={lt.id}
                            disabled={lt.isExhausted}
                            className={cn(lt.isExhausted && "opacity-50")}
                          >
                            <div className="flex items-center justify-between w-full gap-3">
                              <span className="flex items-center gap-1">
                                {lt.name}
                                <span className="text-muted-foreground">({lt.category})</span>
                              </span>
                              <span className={cn(
                                "text-xs font-medium",
                                lt.currentBalance <= 0 ? "text-destructive" : "text-green-600"
                              )}>
                                {lt.currentBalance} {lt.currentBalance === 1 ? 'day' : 'days'}
                              </span>
                            </div>
                            {(lt.min_days_advance > 0 || lt.isExhausted) && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {lt.isExhausted && <span className="text-destructive">Balance exhausted</span>}
                                {lt.isExhausted && lt.min_days_advance > 0 && " • "}
                                {lt.min_days_advance > 0 && `${lt.min_days_advance}d advance required`}
                              </div>
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="half_day_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="full" id="full" />
                        <Label htmlFor="full" className="cursor-pointer">Full Day</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="first_half" id="first_half" />
                        <Label htmlFor="first_half" className="cursor-pointer">First Half</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="second_half" id="second_half" />
                        <Label htmlFor="second_half" className="cursor-pointer">Second Half</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{isHalfDay ? "Date *" : "Start Date *"}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isHalfDay && (
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide a reason for your leave request"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={mutation.isPending || leaveTypes.length === 0}>
                Submit Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
