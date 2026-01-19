import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { getDaysInMonth, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_ABBREV = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const QUICK_PRESETS = [
  { label: "Jan 1", month: 1, day: 1 },
  { label: "Apr 1", month: 4, day: 1 },
  { label: "Jul 1", month: 7, day: 1 },
  { label: "Oct 1", month: 10, day: 1 },
];

export interface YearStartPickerProps {
  month: number; // 1-12
  day: number; // 1-31
  onChange: (month: number, day: number) => void;
  disabled?: boolean;
  className?: string;
}

export function YearStartPicker({
  month,
  day,
  onChange,
  disabled = false,
  className,
}: YearStartPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState(month);

  // Reset view month when popover opens
  React.useEffect(() => {
    if (open) {
      setViewMonth(month);
    }
  }, [open, month]);

  // Calculate days in the selected view month (use 2024 as leap year for Feb)
  const daysInViewMonth = getDaysInMonth(new Date(2024, viewMonth - 1));

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(2024, viewMonth - 1, 1).getDay();

  // Create array of day numbers
  const dayNumbers = Array.from({ length: daysInViewMonth }, (_, i) => i + 1);

  // Create empty slots for days before the first of the month
  const emptySlots = Array.from({ length: firstDayOfMonth }, (_, i) => null);

  const handlePrevMonth = () => {
    setViewMonth((prev) => (prev === 1 ? 12 : prev - 1));
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => (prev === 12 ? 1 : prev + 1));
  };

  const handleDaySelect = (selectedDay: number) => {
    onChange(viewMonth, selectedDay);
    setOpen(false);
  };

  const handlePresetClick = (preset: { month: number; day: number }) => {
    onChange(preset.month, preset.day);
    setOpen(false);
  };

  const displayValue = `${MONTH_ABBREV[month - 1]} ${day}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal h-9 px-3 gap-2",
            !month && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{MONTHS[viewMonth - 1]}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Grid */}
        <div className="p-3">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div
                key={i}
                className="h-7 w-7 flex items-center justify-center text-xs text-muted-foreground font-medium"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day Numbers */}
          <div className="grid grid-cols-7 gap-1">
            {emptySlots.map((_, i) => (
              <div key={`empty-${i}`} className="h-7 w-7" />
            ))}
            {dayNumbers.map((d) => {
              const isSelected = viewMonth === month && d === day;
              return (
                <button
                  key={d}
                  onClick={() => handleDaySelect(d)}
                  className={cn(
                    "h-7 w-7 rounded-md text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="px-3 pb-3 pt-1 border-t">
          <div className="text-xs text-muted-foreground mb-2">Quick select</div>
          <div className="flex gap-1.5">
            {QUICK_PRESETS.map((preset) => {
              const isActive = preset.month === month && preset.day === day;
              return (
                <Button
                  key={preset.label}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
