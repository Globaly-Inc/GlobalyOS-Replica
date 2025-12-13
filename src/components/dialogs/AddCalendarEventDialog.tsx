import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  start_date: z.date({ required_error: "Start date is required" }),
  end_date: z.date({ required_error: "End date is required" }),
  event_type: z.enum(["holiday", "event"]),
  applies_to_all_offices: z.boolean(),
  office_ids: z.array(z.string()),
}).refine((data) => data.end_date >= data.start_date, {
  message: "End date must be on or after start date",
  path: ["end_date"],
}).refine((data) => data.applies_to_all_offices || data.office_ids.length > 0, {
  message: "Select at least one office or apply to all offices",
  path: ["office_ids"],
});

type FormValues = z.infer<typeof formSchema>;

interface AddCalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddCalendarEventDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: AddCalendarEventDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: offices = [] } = useQuery({
    queryKey: ["offices", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("offices")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      event_type: "holiday",
      applies_to_all_offices: true,
      office_ids: [],
    },
  });

  const appliesToAll = form.watch("applies_to_all_offices");
  const selectedOfficeIds = form.watch("office_ids");

  const toggleOffice = (officeId: string) => {
    const current = form.getValues("office_ids");
    if (current.includes(officeId)) {
      form.setValue("office_ids", current.filter(id => id !== officeId));
    } else {
      form.setValue("office_ids", [...current, officeId]);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!currentOrg?.id || !currentEmployee?.id) {
      toast.error("Missing organization or employee data");
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert calendar event
      const { data: eventData, error: eventError } = await supabase
        .from("calendar_events")
        .insert({
          organization_id: currentOrg.id,
          title: values.title,
          start_date: format(values.start_date, "yyyy-MM-dd"),
          end_date: format(values.end_date, "yyyy-MM-dd"),
          event_type: values.event_type,
          created_by: currentEmployee.id,
          applies_to_all_offices: values.applies_to_all_offices,
        })
        .select("id")
        .single();

      if (eventError) throw eventError;

      // If not applying to all offices, insert office associations
      if (!values.applies_to_all_offices && values.office_ids.length > 0) {
        const officeInserts = values.office_ids.map(officeId => ({
          calendar_event_id: eventData.id,
          office_id: officeId,
        }));

        const { error: officeError } = await supabase
          .from("calendar_event_offices")
          .insert(officeInserts);

        if (officeError) throw officeError;
      }

      toast.success(
        values.event_type === "holiday"
          ? "Holiday added successfully"
          : "Event added successfully"
      );
      form.reset();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to add event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Holiday / Event</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Christmas Day" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "d MMM yyyy")
                            ) : (
                              <span>Pick date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "d MMM yyyy")
                            ) : (
                              <span>Pick date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            form.getValues("start_date") && date < form.getValues("start_date")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Office Selection */}
            <FormField
              control={form.control}
              name="applies_to_all_offices"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Apply to all offices</FormLabel>
                    <FormDescription>
                      All employees will see this event regardless of their office
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {!appliesToAll && offices.length > 0 && (
              <FormField
                control={form.control}
                name="office_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Offices</FormLabel>
                    <FormDescription>
                      Only employees in selected offices will see this event
                    </FormDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {offices.map((office) => {
                        const isSelected = selectedOfficeIds.includes(office.id);
                        return (
                          <Badge
                            key={office.id}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-colors",
                              isSelected && "bg-primary"
                            )}
                            onClick={() => toggleOffice(office.id)}
                          >
                            {isSelected && <Check className="h-3 w-3 mr-1" />}
                            {office.name}
                          </Badge>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!appliesToAll && offices.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No offices configured. Please add offices in Settings first.
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCalendarEventDialog;
