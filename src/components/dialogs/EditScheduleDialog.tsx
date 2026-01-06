import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Globe, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkLocation, WORK_LOCATION_CONFIG } from "@/types/wfh";

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  organizationId: string;
  currentSchedule?: {
    work_start_time: string;
    work_end_time: string;
    break_start_time?: string;
    break_end_time?: string;
    late_threshold_minutes: number;
    timezone?: string;
    work_location?: WorkLocation;
    work_days?: number[];
  } | null;
  onSuccess?: () => void;
}

const DAYS = [
  { key: 'sunday', label: 'Sunday', short: 'Sun', dayNum: 0 },
  { key: 'monday', label: 'Monday', short: 'Mon', dayNum: 1 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', dayNum: 2 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', dayNum: 3 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', dayNum: 4 },
  { key: 'friday', label: 'Friday', short: 'Fri', dayNum: 5 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', dayNum: 6 },
] as const;

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Kathmandu", label: "Nepal (NPT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)" },
];

const getLocalTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

export const EditScheduleDialog = ({
  open,
  onOpenChange,
  employeeId,
  organizationId,
  currentSchedule,
  onSuccess,
}: EditScheduleDialogProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [lateThreshold, setLateThreshold] = useState(15);
  const [timezone, setTimezone] = useState(getLocalTimezone());
  const [workLocation, setWorkLocation] = useState<WorkLocation>("office");
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");
  const [breakStartTime, setBreakStartTime] = useState("12:00");
  const [breakEndTime, setBreakEndTime] = useState("13:00");
  const [enabledDays, setEnabledDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri by default

  useEffect(() => {
    if (open) {
      if (currentSchedule) {
        setWorkStartTime(currentSchedule.work_start_time.substring(0, 5));
        setWorkEndTime(currentSchedule.work_end_time.substring(0, 5));
        setLateThreshold(currentSchedule.late_threshold_minutes);
        setTimezone(currentSchedule.timezone || getLocalTimezone());
        setWorkLocation(currentSchedule.work_location || "office");
        setBreakStartTime(currentSchedule.break_start_time?.substring(0, 5) || "12:00");
        setBreakEndTime(currentSchedule.break_end_time?.substring(0, 5) || "13:00");
        setEnabledDays(currentSchedule.work_days || [1, 2, 3, 4, 5]);
      } else {
        setWorkStartTime("09:00");
        setWorkEndTime("17:00");
        setLateThreshold(15);
        setTimezone(getLocalTimezone());
        setWorkLocation("office");
        setBreakStartTime("12:00");
        setBreakEndTime("13:00");
        setEnabledDays([1, 2, 3, 4, 5]);
      }
    }
  }, [currentSchedule, open]);

  const toggleDay = (dayNum: number) => {
    setEnabledDays(prev => 
      prev.includes(dayNum) 
        ? prev.filter(d => d !== dayNum)
        : [...prev, dayNum].sort((a, b) => a - b)
    );
  };

  const handleSave = async () => {
    if (!organizationId || !employeeId) {
      toast.error("Missing organization or employee information");
      return;
    }

    if (enabledDays.length === 0) {
      toast.error("Please enable at least one working day");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("employee_schedules")
        .upsert({
          employee_id: employeeId,
          organization_id: organizationId,
          work_start_time: `${workStartTime}:00`,
          work_end_time: `${workEndTime}:00`,
          break_start_time: `${breakStartTime}:00`,
          break_end_time: `${breakEndTime}:00`,
          late_threshold_minutes: lateThreshold,
          work_location: workLocation,
          work_days: enabledDays,
          timezone: timezone,
        }, {
          onConflict: "employee_id",
        });

      if (error) throw error;

      toast.success("Schedule updated successfully");
      queryClient.invalidateQueries({ queryKey: ["employee-schedule", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employee-work-location", employeeId] });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error(error.message || "Failed to save schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Work Schedule
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            {/* Work Location Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Work Location
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['office', 'hybrid', 'remote'] as const).map((location) => {
                  const config = WORK_LOCATION_CONFIG[location];
                  const isSelected = workLocation === location;
                  return (
                    <button
                      key={location}
                      type="button"
                      onClick={() => setWorkLocation(location)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        isSelected
                          ? `${config.bgColor} ${config.borderColor} ${config.color}`
                          : 'border-muted hover:border-muted-foreground/30 bg-background'
                      }`}
                    >
                      <div className="text-lg mb-1">{config.icon}</div>
                      <div className="text-sm font-medium">{config.label}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {WORK_LOCATION_CONFIG[workLocation].description}
              </p>
            </div>

            {/* Work Hours - Single Global Input */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Work Hours
              </Label>
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                    className="w-[120px] h-9"
                  />
                </div>
                <span className="text-muted-foreground mt-5">to</span>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input
                    type="time"
                    value={workEndTime}
                    onChange={(e) => setWorkEndTime(e.target.value)}
                    className="w-[120px] h-9"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                These hours apply to all selected working days
              </p>
            </div>

            {/* Working Days - Toggle Only */}
            <div className="space-y-3">
              <Label>Working Days</Label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day) => {
                  const isEnabled = enabledDays.includes(day.dayNum);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDay(day.dayNum)}
                      className={`p-2 rounded-lg border-2 transition-all text-center ${
                        isEnabled
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'border-muted bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <div className="text-sm font-medium">{day.short.charAt(0)}</div>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                {DAYS.filter(d => enabledDays.includes(d.dayNum)).map(d => d.short).join(', ') || 'No days selected'}
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Break Time */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="flex items-center gap-2">
                ☕ Break Time
              </Label>
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    value={breakStartTime}
                    onChange={(e) => setBreakStartTime(e.target.value)}
                    className="w-[110px] h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input
                    type="time"
                    value={breakEndTime}
                    onChange={(e) => setBreakEndTime(e.target.value)}
                    className="w-[110px] h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <div className="h-8 flex items-center text-sm text-muted-foreground">
                    {(() => {
                      const [startH, startM] = breakStartTime.split(':').map(Number);
                      const [endH, endM] = breakEndTime.split(':').map(Number);
                      const mins = (endH * 60 + endM) - (startH * 60 + startM);
                      if (mins <= 0) return '—';
                      if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`;
                      return `${mins}m`;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Late Threshold */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
              <Input
                id="late-threshold"
                type="number"
                min={0}
                max={120}
                value={lateThreshold}
                onChange={(e) => setLateThreshold(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Marked as "late" if check-in exceeds {lateThreshold} min after start time
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
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
