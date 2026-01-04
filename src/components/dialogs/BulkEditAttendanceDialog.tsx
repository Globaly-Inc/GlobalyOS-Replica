import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useTimezone } from "@/hooks/useTimezone";
import { toUTCDateTime, getTimezoneAbbreviation } from "@/utils/timezone";
import { Globe } from "lucide-react";

interface BulkEditAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRecordIds: string[];
  onSuccess: () => void;
}

export const BulkEditAttendanceDialog = ({
  open,
  onOpenChange,
  selectedRecordIds,
  onSuccess,
}: BulkEditAttendanceDialogProps) => {
  const queryClient = useQueryClient();
  const { timezone } = useTimezone();
  const [updating, setUpdating] = useState(false);
  
  // Toggle states for which fields to update
  const [updateCheckIn, setUpdateCheckIn] = useState(false);
  const [updateCheckOut, setUpdateCheckOut] = useState(false);
  
  // Time values (in user's local timezone)
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [checkOutTime, setCheckOutTime] = useState("18:00");


  const handleSave = async () => {
    if (!updateCheckIn && !updateCheckOut) {
      toast.error("Please select at least one field to update");
      return;
    }

    if (selectedRecordIds.length === 0) {
      toast.error("No records selected");
      return;
    }

    setUpdating(true);

    try {
      // Fetch existing records to get their dates and current times
      const { data: existingRecords, error: fetchError } = await supabase
        .from("attendance_records")
        .select("id, date, check_in_time, check_out_time")
        .in("id", selectedRecordIds);

      if (fetchError) throw fetchError;

      // Update each record individually to handle date-specific times with proper timezone conversion
      // Update each record - work_hours is a generated column, so we don't include it
      const updates = existingRecords?.map(async (record) => {
        const updateData: Record<string, any> = {};

        if (updateCheckIn) {
          // Convert user's local time to UTC for database storage
          updateData.check_in_time = toUTCDateTime(record.date, checkInTime, timezone);
        }

        if (updateCheckOut) {
          // Convert user's local time to UTC for database storage
          updateData.check_out_time = toUTCDateTime(record.date, checkOutTime, timezone);
        }

        return supabase
          .from("attendance_records")
          .update(updateData)
          .eq("id", record.id);
      }) || [];

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} records`);
      }

      toast.success(`Updated ${selectedRecordIds.length} attendance records`);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["org-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      
      // Reset form
      setUpdateCheckIn(false);
      setUpdateCheckOut(false);
      setCheckInTime("09:00");
      setCheckOutTime("18:00");
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating records:", error);
      toast.error(error.message || "Failed to update records");
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUpdateCheckIn(false);
      setUpdateCheckOut(false);
      setCheckInTime("09:00");
      setCheckOutTime("18:00");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Bulk Edit Attendance Times
          </DialogTitle>
          <DialogDescription>
            Update check-in and/or check-out times for{" "}
            <span className="font-semibold text-foreground">
              {selectedRecordIds.length} selected record{selectedRecordIds.length !== 1 ? "s" : ""}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Timezone indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            <Globe className="h-3 w-3" />
            <span>Times are in {timezone.replace(/_/g, ' ')} ({getTimezoneAbbreviation(timezone)})</span>
          </div>

          {/* Check In Time */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="update-check-in" className="text-sm font-medium">
                Update Check In Time ({getTimezoneAbbreviation(timezone)})
              </Label>
              <Switch
                id="update-check-in"
                checked={updateCheckIn}
                onCheckedChange={setUpdateCheckIn}
              />
            </div>
            {updateCheckIn && (
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full"
              />
            )}
          </div>

          {/* Check Out Time */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="update-check-out" className="text-sm font-medium">
                Update Check Out Time ({getTimezoneAbbreviation(timezone)})
              </Label>
              <Switch
                id="update-check-out"
                checked={updateCheckOut}
                onCheckedChange={setUpdateCheckOut}
              />
            </div>
            {updateCheckOut && (
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full"
              />
            )}
          </div>

          {/* Warning notice */}
          {(updateCheckIn || updateCheckOut) && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This will update {updateCheckIn && updateCheckOut ? "both check-in and check-out times" : updateCheckIn ? "check-in time" : "check-out time"} for all {selectedRecordIds.length} selected records. Work hours will be recalculated automatically.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={updating}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updating || (!updateCheckIn && !updateCheckOut)}
          >
            {updating ? "Updating..." : "Apply Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
