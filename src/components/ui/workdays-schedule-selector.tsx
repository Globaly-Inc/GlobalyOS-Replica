import * as React from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock } from "lucide-react";

const WEEKDAYS = [
  { value: 0, label: "S", fullName: "Sunday" },
  { value: 1, label: "M", fullName: "Monday" },
  { value: 2, label: "T", fullName: "Tuesday" },
  { value: 3, label: "W", fullName: "Wednesday" },
  { value: 4, label: "T", fullName: "Thursday" },
  { value: 5, label: "F", fullName: "Friday" },
  { value: 6, label: "S", fullName: "Saturday" },
];

export interface DaySchedule {
  enabled: boolean;
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface DaySchedulesMap {
  [dayNum: string]: DaySchedule;
}

export interface WorkdaysScheduleSelectorProps {
  value: DaySchedulesMap;
  onChange: (schedules: DaySchedulesMap) => void;
  disabled?: boolean;
  defaultStart?: string;
  defaultEnd?: string;
  className?: string;
}

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

export function WorkdaysScheduleSelector({
  value,
  onChange,
  disabled = false,
  defaultStart = DEFAULT_START,
  defaultEnd = DEFAULT_END,
  className,
}: WorkdaysScheduleSelectorProps) {
  const [openDay, setOpenDay] = React.useState<number | null>(null);

  const getDaySchedule = (day: number): DaySchedule => {
    return (
      value[day.toString()] || {
        enabled: false,
        start: defaultStart,
        end: defaultEnd,
      }
    );
  };

  const updateDaySchedule = (day: number, updates: Partial<DaySchedule>) => {
    const current = getDaySchedule(day);
    const newSchedules = {
      ...value,
      [day.toString()]: {
        ...current,
        ...updates,
      },
    };
    onChange(newSchedules);
  };

  const handleDayToggle = (day: number) => {
    const current = getDaySchedule(day);
    updateDaySchedule(day, { enabled: !current.enabled });
  };

  const applyToAllWeekdays = (day: number) => {
    const sourceSchedule = getDaySchedule(day);
    const weekdays = [1, 2, 3, 4, 5]; // Mon-Fri
    const newSchedules = { ...value };

    weekdays.forEach((d) => {
      newSchedules[d.toString()] = {
        enabled: sourceSchedule.enabled,
        start: sourceSchedule.start,
        end: sourceSchedule.end,
      };
    });

    onChange(newSchedules);
    setOpenDay(null);
  };

  const hasCustomTimes = (day: number): boolean => {
    const schedule = getDaySchedule(day);
    return (
      schedule.enabled &&
      (schedule.start !== defaultStart || schedule.end !== defaultEnd)
    );
  };

  const getEnabledDays = (): number[] => {
    return WEEKDAYS.filter((d) => getDaySchedule(d.value).enabled).map(
      (d) => d.value
    );
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1">
        {WEEKDAYS.map((day) => {
          const schedule = getDaySchedule(day.value);
          const isEnabled = schedule.enabled;
          const hasCustom = hasCustomTimes(day.value);

          return (
            <Popover
              key={day.value}
              open={openDay === day.value}
              onOpenChange={(open) => setOpenDay(open ? day.value : null)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={disabled}
                      className={cn(
                        "relative h-9 w-9 rounded-lg text-sm font-medium transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isEnabled
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                        disabled && "opacity-50 cursor-not-allowed",
                        !disabled && "cursor-pointer hover:scale-105"
                      )}
                    >
                      {day.label}
                      {hasCustom && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent-foreground" />
                      )}
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {day.fullName}
                  {isEnabled && (
                    <span className="text-muted-foreground ml-1">
                      ({schedule.start} - {schedule.end})
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>

              <PopoverContent className="w-64 p-0" align="center">
                <div className="p-4 space-y-4">
                  {/* Day Toggle */}
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={`day-toggle-${day.value}`}
                      className="text-sm font-medium"
                    >
                      {day.fullName}
                    </Label>
                    <Switch
                      id={`day-toggle-${day.value}`}
                      checked={isEnabled}
                      onCheckedChange={() => handleDayToggle(day.value)}
                    />
                  </div>

                  {/* Time Inputs - only show if enabled */}
                  {isEnabled && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Work hours
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`start-${day.value}`}
                            className="text-xs text-muted-foreground"
                          >
                            Start
                          </Label>
                          <input
                            id={`start-${day.value}`}
                            type="time"
                            value={schedule.start}
                            onChange={(e) =>
                              updateDaySchedule(day.value, {
                                start: e.target.value,
                              })
                            }
                            className={cn(
                              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1",
                              "text-sm shadow-sm transition-colors",
                              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`end-${day.value}`}
                            className="text-xs text-muted-foreground"
                          >
                            End
                          </Label>
                          <input
                            id={`end-${day.value}`}
                            type="time"
                            value={schedule.end}
                            onChange={(e) =>
                              updateDaySchedule(day.value, {
                                end: e.target.value,
                              })
                            }
                            className={cn(
                              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1",
                              "text-sm shadow-sm transition-colors",
                              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            )}
                          />
                        </div>
                      </div>

                      {/* Apply to all weekdays button - only for Mon-Fri */}
                      {day.value >= 1 && day.value <= 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => applyToAllWeekdays(day.value)}
                        >
                          Apply to all weekdays
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      {/* Summary text */}
      <div className="text-xs text-muted-foreground">
        {getEnabledDays().length === 0 ? (
          "Click a day to configure"
        ) : (
          <>
            {getEnabledDays().length} day
            {getEnabledDays().length !== 1 ? "s" : ""} selected
            {WEEKDAYS.some((d) => hasCustomTimes(d.value)) && (
              <span className="text-foreground"> • Custom hours set</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Utility to convert old work_days array to new DaySchedulesMap
export function workDaysArrayToScheduleMap(
  workDays: number[],
  defaultStart = DEFAULT_START,
  defaultEnd = DEFAULT_END
): DaySchedulesMap {
  const map: DaySchedulesMap = {};
  workDays.forEach((day) => {
    map[day.toString()] = {
      enabled: true,
      start: defaultStart,
      end: defaultEnd,
    };
  });
  return map;
}

// Utility to convert DaySchedulesMap to work_days array
export function scheduleMapToWorkDaysArray(schedules: DaySchedulesMap): number[] {
  return Object.entries(schedules)
    .filter(([_, schedule]) => schedule.enabled)
    .map(([day]) => parseInt(day, 10))
    .sort((a, b) => a - b);
}

// Default Mon-Fri schedule
export const DEFAULT_WEEKDAY_SCHEDULES: DaySchedulesMap = {
  "1": { enabled: true, start: DEFAULT_START, end: DEFAULT_END },
  "2": { enabled: true, start: DEFAULT_START, end: DEFAULT_END },
  "3": { enabled: true, start: DEFAULT_START, end: DEFAULT_END },
  "4": { enabled: true, start: DEFAULT_START, end: DEFAULT_END },
  "5": { enabled: true, start: DEFAULT_START, end: DEFAULT_END },
};
