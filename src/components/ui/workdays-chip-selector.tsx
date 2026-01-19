/**
 * WorkdaysChipSelector - Reusable component for selecting working days
 * Renders toggleable day chips (S M T W T F S)
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const WEEKDAYS = [
  { value: 0, label: 'S', full: 'Sunday' },
  { value: 1, label: 'M', full: 'Monday' },
  { value: 2, label: 'T', full: 'Tuesday' },
  { value: 3, label: 'W', full: 'Wednesday' },
  { value: 4, label: 'T', full: 'Thursday' },
  { value: 5, label: 'F', full: 'Friday' },
  { value: 6, label: 'S', full: 'Saturday' },
] as const;

export interface WorkdaysChipSelectorProps {
  /** Array of selected day numbers (0=Sunday, 1=Monday, ..., 6=Saturday) */
  value: number[];
  /** Callback when selection changes */
  onChange: (days: number[]) => void;
  /** Disable all chips */
  disabled?: boolean;
  /** Size variant: 'sm' for compact/table use, 'md' for form use, 'lg' for alignment with taller inputs */
  size?: 'sm' | 'md' | 'lg';
  /** Show tooltips with full day names */
  showTooltips?: boolean;
  /** Additional class names */
  className?: string;
}

export function WorkdaysChipSelector({
  value,
  onChange,
  disabled = false,
  size = 'sm',
  showTooltips = true,
  className,
}: WorkdaysChipSelectorProps) {
  const toggleDay = (day: number) => {
    if (disabled) return;
    
    const newDays = value.includes(day)
      ? value.filter(d => d !== day)
      : [...value, day].sort((a, b) => a - b);
    
    onChange(newDays);
  };

  const handleKeyDown = (e: React.KeyboardEvent, day: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDay(day);
    }
  };

  const chipSizeMap = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-9 h-8 text-sm',
  };
  const gapMap = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };
  const chipSize = chipSizeMap[size];
  const gap = gapMap[size];

  const ChipButton = ({ day }: { day: typeof WEEKDAYS[number] }) => {
    const isSelected = value.includes(day.value);
    
    return (
      <button
        type="button"
        onClick={() => toggleDay(day.value)}
        onKeyDown={(e) => handleKeyDown(e, day.value)}
        disabled={disabled}
        aria-label={day.full}
        aria-pressed={isSelected}
        className={cn(
          chipSize,
          'font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {day.label}
      </button>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div 
        className={cn('flex', gap, className)}
        role="group"
        aria-label="Select working days"
      >
        {WEEKDAYS.map((day) => (
          showTooltips ? (
            <Tooltip key={day.value}>
              <TooltipTrigger asChild>
                <span>
                  <ChipButton day={day} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {day.full}
              </TooltipContent>
            </Tooltip>
          ) : (
            <ChipButton key={day.value} day={day} />
          )
        ))}
      </div>
    </TooltipProvider>
  );
}

// Quick preset for Mon-Fri (most common)
export const WEEKDAYS_MON_FRI = [1, 2, 3, 4, 5];
// Preset for Mon-Sat
export const WEEKDAYS_MON_SAT = [1, 2, 3, 4, 5, 6];
// Preset for Sun-Thu (Middle East)
export const WEEKDAYS_SUN_THU = [0, 1, 2, 3, 4];
