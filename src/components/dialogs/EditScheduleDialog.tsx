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
import { Clock, Globe, Building2, Home, Building } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkLocation, WORK_LOCATION_CONFIG } from "@/types/wfh";

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

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  organizationId: string;
  currentSchedule?: {
    work_start_time: string;
    work_end_time: string;
    late_threshold_minutes: number;
    timezone?: string;
    work_location?: WorkLocation;
  } | null;
  onSuccess?: () => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
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

  useEffect(() => {
    if (open) {
      if (currentSchedule) {
        // Convert old single schedule to week format
        const startTime = currentSchedule.work_start_time.substring(0, 5);
        const endTime = currentSchedule.work_end_time.substring(0, 5);
        setLateThreshold(currentSchedule.late_threshold_minutes);
        setWorkLocation(currentSchedule.work_location || "office");
        
        setWeekSchedule({
          monday: { enabled: true, start: startTime, end: endTime },
          tuesday: { enabled: true, start: startTime, end: endTime },
          wednesday: { enabled: true, start: startTime, end: endTime },
          thursday: { enabled: true, start: startTime, end: endTime },
          friday: { enabled: true, start: startTime, end: endTime },
          saturday: { enabled: false, start: startTime, end: endTime },
          sunday: { enabled: false, start: startTime, end: endTime },
        });
      } else {
        setWeekSchedule(getDefaultWeekSchedule());
        setLateThreshold(15);
        setWorkLocation("office");
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

    // Find the first enabled day to use as the primary schedule
    const enabledDay = DAYS.find(d => weekSchedule[d.key].enabled);
    if (!enabledDay) {
      toast.error("Please enable at least one working day");
      return;
    }

    const primarySchedule = weekSchedule[enabledDay.key];

    setLoading(true);
    try {
      const { error } = await supabase
        .from("employee_schedules")
        .upsert({
          employee_id: employeeId,
          organization_id: organizationId,
          work_start_time: `${primarySchedule.start}:00`,
          work_end_time: `${primarySchedule.end}:00`,
          late_threshold_minutes: lateThreshold,
          work_location: workLocation,
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

            {/* Timezone Selector */}
            <div className="space-y-2">
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

            {/* Quick Actions */}
            <div className="flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
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
