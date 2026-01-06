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
import type { Json } from "@/integrations/supabase/types";

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

// Structure for day_schedules JSONB column
interface DayScheduleDB {
  enabled: boolean;
  start: string;
  end: string;
}

type DaySchedulesDB = {
  [key: string]: DayScheduleDB;
};

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
    day_schedules?: DaySchedulesDB | null;
  } | null;
  onSuccess?: () => void;
}

// dayNum matches JS Date.getDay() - 0=Sunday, 1=Monday, etc.
const DAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon', dayNum: 1 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', dayNum: 2 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', dayNum: 3 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', dayNum: 4 },
  { key: 'friday', label: 'Friday', short: 'Fri', dayNum: 5 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', dayNum: 6 },
  { key: 'sunday', label: 'Sunday', short: 'Sun', dayNum: 0 },
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

const DEFAULT_DAY: DaySchedule = { enabled: true, start: "09:00", end: "17:00" };
const DEFAULT_WEEKEND: DaySchedule = { enabled: false, start: "09:00", end: "17:00" };

const getDefaultWeekSchedule = (): WeekSchedule => ({
  monday: { ...DEFAULT_DAY },
  tuesday: { ...DEFAULT_DAY },
  wednesday: { ...DEFAULT_DAY },
  thursday: { ...DEFAULT_DAY },
  friday: { ...DEFAULT_DAY },
  saturday: { ...DEFAULT_WEEKEND },
  sunday: { ...DEFAULT_WEEKEND },
});

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
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(getDefaultWeekSchedule());
  const [breakStartTime, setBreakStartTime] = useState("12:00");
  const [breakEndTime, setBreakEndTime] = useState("13:00");

  useEffect(() => {
    if (open) {
      if (currentSchedule) {
        // Default fallback times
        const defaultStartTime = currentSchedule.work_start_time.substring(0, 5);
        const defaultEndTime = currentSchedule.work_end_time.substring(0, 5);
        setLateThreshold(currentSchedule.late_threshold_minutes);
        setTimezone(currentSchedule.timezone || getLocalTimezone());
        setWorkLocation(currentSchedule.work_location || "office");
        setBreakStartTime(currentSchedule.break_start_time?.substring(0, 5) || "12:00");
        setBreakEndTime(currentSchedule.break_end_time?.substring(0, 5) || "13:00");
        
        // Check if we have per-day schedules in the new format
        const daySchedules = currentSchedule.day_schedules;
        const workDays = currentSchedule.work_days || [1, 2, 3, 4, 5];
        
        if (daySchedules && Object.keys(daySchedules).length > 0) {
          // Load from day_schedules JSONB
          setWeekSchedule({
            sunday: daySchedules['0'] || { enabled: workDays.includes(0), start: defaultStartTime, end: defaultEndTime },
            monday: daySchedules['1'] || { enabled: workDays.includes(1), start: defaultStartTime, end: defaultEndTime },
            tuesday: daySchedules['2'] || { enabled: workDays.includes(2), start: defaultStartTime, end: defaultEndTime },
            wednesday: daySchedules['3'] || { enabled: workDays.includes(3), start: defaultStartTime, end: defaultEndTime },
            thursday: daySchedules['4'] || { enabled: workDays.includes(4), start: defaultStartTime, end: defaultEndTime },
            friday: daySchedules['5'] || { enabled: workDays.includes(5), start: defaultStartTime, end: defaultEndTime },
            saturday: daySchedules['6'] || { enabled: workDays.includes(6), start: defaultStartTime, end: defaultEndTime },
          });
        } else {
          // Fallback to old format - all days use same time
          setWeekSchedule({
            sunday: { enabled: workDays.includes(0), start: defaultStartTime, end: defaultEndTime },
            monday: { enabled: workDays.includes(1), start: defaultStartTime, end: defaultEndTime },
            tuesday: { enabled: workDays.includes(2), start: defaultStartTime, end: defaultEndTime },
            wednesday: { enabled: workDays.includes(3), start: defaultStartTime, end: defaultEndTime },
            thursday: { enabled: workDays.includes(4), start: defaultStartTime, end: defaultEndTime },
            friday: { enabled: workDays.includes(5), start: defaultStartTime, end: defaultEndTime },
            saturday: { enabled: workDays.includes(6), start: defaultStartTime, end: defaultEndTime },
          });
        }
      } else {
        setWeekSchedule(getDefaultWeekSchedule());
        setLateThreshold(15);
        setTimezone(getLocalTimezone());
        setWorkLocation("office");
        setBreakStartTime("12:00");
        setBreakEndTime("13:00");
      }
    }
  }, [currentSchedule, open]);

  const updateDay = (day: keyof WeekSchedule, field: keyof DaySchedule, value: string | boolean) => {
    setWeekSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const applyToAllWeekdays = () => {
    const mondaySchedule = weekSchedule.monday;
    setWeekSchedule(prev => ({
      ...prev,
      tuesday: { ...mondaySchedule },
      wednesday: { ...mondaySchedule },
      thursday: { ...mondaySchedule },
      friday: { ...mondaySchedule },
    }));
    toast.success("Applied Monday's schedule to all weekdays");
  };

  const handleSave = async () => {
    if (!organizationId || !employeeId) {
      toast.error("Missing organization or employee information");
      return;
    }

    // Find the first enabled day to use as the primary schedule (for legacy columns)
    const enabledDay = DAYS.find(d => weekSchedule[d.key].enabled);
    if (!enabledDay) {
      toast.error("Please enable at least one working day");
      return;
    }

    const primarySchedule = weekSchedule[enabledDay.key];

    // Build work_days array from weekSchedule (0=Sunday, 1=Monday, ..., 6=Saturday)
    const workDays: number[] = [];
    if (weekSchedule.sunday.enabled) workDays.push(0);
    if (weekSchedule.monday.enabled) workDays.push(1);
    if (weekSchedule.tuesday.enabled) workDays.push(2);
    if (weekSchedule.wednesday.enabled) workDays.push(3);
    if (weekSchedule.thursday.enabled) workDays.push(4);
    if (weekSchedule.friday.enabled) workDays.push(5);
    if (weekSchedule.saturday.enabled) workDays.push(6);

    // Build day_schedules JSONB for per-day times
    const daySchedules: DaySchedulesDB = {
      '0': weekSchedule.sunday,
      '1': weekSchedule.monday,
      '2': weekSchedule.tuesday,
      '3': weekSchedule.wednesday,
      '4': weekSchedule.thursday,
      '5': weekSchedule.friday,
      '6': weekSchedule.saturday,
    };

    setLoading(true);
    try {
      const { error } = await supabase
        .from("employee_schedules")
        .upsert({
          employee_id: employeeId,
          organization_id: organizationId,
          work_start_time: `${primarySchedule.start}:00`,
          work_end_time: `${primarySchedule.end}:00`,
          break_start_time: `${breakStartTime}:00`,
          break_end_time: `${breakEndTime}:00`,
          late_threshold_minutes: lateThreshold,
          work_location: workLocation,
          work_days: workDays,
          timezone: timezone,
          day_schedules: daySchedules as unknown as Json,
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

            {/* Timezone & Quick Actions Row */}
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
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
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="whitespace-nowrap"
                onClick={applyToAllWeekdays}
              >
                Apply Mon to all weekdays
              </Button>
            </div>

            {/* Weekly Schedule */}
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div 
                  key={day.key} 
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    weekSchedule[day.key].enabled 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-muted/30 border-muted'
                  }`}
                >
                  <Switch
                    checked={weekSchedule[day.key].enabled}
                    onCheckedChange={(checked) => updateDay(day.key, 'enabled', checked)}
                  />
                  <span className={`w-12 font-medium text-sm ${
                    !weekSchedule[day.key].enabled ? 'text-muted-foreground' : ''
                  }`}>
                    {day.short}
                  </span>
                  
                  {weekSchedule[day.key].enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={weekSchedule[day.key].start}
                        onChange={(e) => updateDay(day.key, 'start', e.target.value)}
                        className="w-[110px] h-8 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <Input
                        type="time"
                        value={weekSchedule[day.key].end}
                        onChange={(e) => updateDay(day.key, 'end', e.target.value)}
                        className="w-[110px] h-8 text-sm"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Off</span>
                  )}
                </div>
              ))}
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
