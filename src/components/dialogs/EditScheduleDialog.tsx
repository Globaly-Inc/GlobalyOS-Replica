import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  organizationId: string;
  currentSchedule?: {
    work_start_time: string;
    work_end_time: string;
    late_threshold_minutes: number;
  } | null;
}

export const EditScheduleDialog = ({
  open,
  onOpenChange,
  employeeId,
  organizationId,
  currentSchedule,
}: EditScheduleDialogProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [lateThreshold, setLateThreshold] = useState(15);

  useEffect(() => {
    if (currentSchedule) {
      // Convert time from HH:MM:SS to HH:MM format
      setStartTime(currentSchedule.work_start_time.substring(0, 5));
      setEndTime(currentSchedule.work_end_time.substring(0, 5));
      setLateThreshold(currentSchedule.late_threshold_minutes);
    } else {
      setStartTime("09:00");
      setEndTime("17:00");
      setLateThreshold(15);
    }
  }, [currentSchedule, open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("employee_schedules")
        .upsert({
          employee_id: employeeId,
          organization_id: organizationId,
          work_start_time: `${startTime}:00`,
          work_end_time: `${endTime}:00`,
          late_threshold_minutes: lateThreshold,
        }, {
          onConflict: "employee_id",
        });

      if (error) throw error;

      toast.success("Schedule updated successfully");
      queryClient.invalidateQueries({ queryKey: ["employee-schedule", employeeId] });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Work Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
            <Input
              id="late-threshold"
              type="number"
              min={0}
              max={120}
              value={lateThreshold}
              onChange={(e) => setLateThreshold(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Employee is marked as "late" if they check in more than {lateThreshold} minutes after start time
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
