import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, Save } from "lucide-react";

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  notes: string | null;
  work_hours: number | null;
}

interface EditAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
  employeeId: string;
  organizationId: string;
  date?: string;
}

export const EditAttendanceDialog = ({
  open,
  onOpenChange,
  record,
  employeeId,
  organizationId,
  date,
}: EditAttendanceDialogProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [status, setStatus] = useState("present");
  const [notes, setNotes] = useState("");
  const [recordDate, setRecordDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const isEditing = !!record;

  useEffect(() => {
    if (open) {
      if (record) {
        // Extract time from datetime for existing record
        setCheckInTime(record.check_in_time ? format(new Date(record.check_in_time), "HH:mm") : "");
        setCheckOutTime(record.check_out_time ? format(new Date(record.check_out_time), "HH:mm") : "");
        setStatus(record.status || "present");
        setNotes(record.notes || "");
        setRecordDate(record.date);
      } else {
        // Reset for new record
        setCheckInTime("09:00");
        setCheckOutTime("");
        setStatus("present");
        setNotes("");
        setRecordDate(date || format(new Date(), "yyyy-MM-dd"));
      }
    }
  }, [open, record, date]);

  const calculateWorkHours = (checkIn: string, checkOut: string): number | null => {
    if (!checkIn || !checkOut) return null;
    
    const [inHours, inMinutes] = checkIn.split(":").map(Number);
    const [outHours, outMinutes] = checkOut.split(":").map(Number);
    
    const inTotalMinutes = inHours * 60 + inMinutes;
    const outTotalMinutes = outHours * 60 + outMinutes;
    
    if (outTotalMinutes <= inTotalMinutes) return null;
    
    return (outTotalMinutes - inTotalMinutes) / 60;
  };

  const handleSave = async () => {
    if (!checkInTime) {
      toast.error("Check-in time is required");
      return;
    }

    setSaving(true);
    try {
      // Construct full datetime strings
      const checkInDateTime = checkInTime ? `${recordDate}T${checkInTime}:00` : null;
      const checkOutDateTime = checkOutTime ? `${recordDate}T${checkOutTime}:00` : null;
      const workHours = calculateWorkHours(checkInTime, checkOutTime);

      if (isEditing && record) {
        // Update existing record
        const { error } = await supabase
          .from("attendance_records")
          .update({
            date: recordDate,
            check_in_time: checkInDateTime,
            check_out_time: checkOutDateTime,
            status,
            notes: notes || null,
            work_hours: workHours,
          })
          .eq("id", record.id);

        if (error) throw error;
        toast.success("Attendance record updated");
      } else {
        // Insert new record
        const { error } = await supabase
          .from("attendance_records")
          .insert({
            employee_id: employeeId,
            organization_id: organizationId,
            date: recordDate,
            check_in_time: checkInDateTime,
            check_out_time: checkOutDateTime,
            status,
            notes: notes || null,
            work_hours: workHours,
          });

        if (error) throw error;
        toast.success("Attendance record added");
      }

      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-month"] });
      queryClient.invalidateQueries({ queryKey: ["org-attendance"] });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      toast.error(error.message || "Failed to save attendance record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isEditing ? "Edit Attendance" : "Add Attendance Record"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in Time</Label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out Time</Label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this attendance record..."
              rows={3}
            />
          </div>

          {checkInTime && checkOutTime && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                Calculated Hours:{" "}
                <span className="font-medium text-foreground">
                  {calculateWorkHours(checkInTime, checkOutTime)?.toFixed(1) || "Invalid"}h
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
