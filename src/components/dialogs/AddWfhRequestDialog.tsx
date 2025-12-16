import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Home } from "lucide-react";
import { format, differenceInBusinessDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreateWfhRequest } from "@/services/useWfh";

interface AddWfhRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddWfhRequestDialog = ({ open, onOpenChange }: AddWfhRequestDialogProps) => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState("");

  const createMutation = useCreateWfhRequest();

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    // Calculate business days between dates (inclusive)
    return differenceInBusinessDays(addDays(endDate, 1), startDate);
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) return;

    const daysCount = calculateDays();
    if (daysCount <= 0) return;

    await createMutation.mutateAsync({
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      days_count: daysCount,
      reason: reason || undefined,
    });

    // Reset and close
    setStartDate(undefined);
    setEndDate(undefined);
    setReason("");
    onOpenChange(false);
  };

  const daysCount = calculateDays();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Request Work From Home
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
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
                  {startDate ? format(startDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    if (!endDate || (date && date > endDate)) {
                      setEndDate(date);
                    }
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>End Date</Label>
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
                  {endDate ? format(endDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => (startDate ? date < startDate : date < new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Days Count */}
          {daysCount > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
              <span className="text-sm font-medium">Total Days</span>
              <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {daysCount} {daysCount === 1 ? "day" : "days"}
              </span>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Textarea
              placeholder="Why do you need to work from home?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!startDate || !endDate || daysCount <= 0 || createMutation.isPending}
          >
            {createMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
