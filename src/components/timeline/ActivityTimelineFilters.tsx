/**
 * Activity Timeline Filters
 * Filter controls for the employee activity timeline
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ACTIVITY_CATEGORIES,
  DATE_RANGE_PRESETS,
  type ActivityCategory,
  type DateRangePreset,
  type ActivityTimelineFilters as FilterType,
} from '@/types/activity';

interface ActivityTimelineFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  className?: string;
}

export const ActivityTimelineFilters = ({
  filters,
  onFiltersChange,
  className,
}: ActivityTimelineFiltersProps) => {
  const [datePreset, setDatePreset] = useState<DateRangePreset>('any');
  const [showCustomDate, setShowCustomDate] = useState(false);

  const handleCategoryChange = (category: string) => {
    if (category === 'all') {
      onFiltersChange({ ...filters, eventTypes: undefined });
    } else {
      // Map category to event types
      const categoryEventTypes = getCategoryEventTypes(category as ActivityCategory);
      onFiltersChange({ ...filters, eventTypes: categoryEventTypes });
    }
  };

  const handleDatePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    
    if (preset === 'any') {
      onFiltersChange({ ...filters, startDate: undefined, endDate: undefined });
      setShowCustomDate(false);
    } else if (preset === 'custom') {
      setShowCustomDate(true);
    } else {
      const today = new Date();
      let startDate: Date;
      
      switch (preset) {
        case 'last_7_days':
          startDate = subDays(today, 7);
          break;
        case 'last_30_days':
          startDate = subDays(today, 30);
          break;
        case 'last_90_days':
          startDate = subDays(today, 90);
          break;
        default:
          startDate = subDays(today, 30);
      }
      
      onFiltersChange({
        ...filters,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      });
      setShowCustomDate(false);
    }
  };

  const handleCustomDateSelect = (date: Date | undefined) => {
    if (date) {
      // If no start date, set start date. Otherwise set end date.
      if (!filters.startDate) {
        onFiltersChange({ ...filters, startDate: format(date, 'yyyy-MM-dd') });
      } else if (!filters.endDate) {
        onFiltersChange({ ...filters, endDate: format(date, 'yyyy-MM-dd') });
      } else {
        // Reset and start fresh
        onFiltersChange({ ...filters, startDate: format(date, 'yyyy-MM-dd'), endDate: undefined });
      }
    }
  };

  const clearFilters = () => {
    onFiltersChange({});
    setDatePreset('any');
    setShowCustomDate(false);
  };

  const hasActiveFilters = filters.eventTypes?.length || filters.startDate || filters.endDate;

  const selectedCategory = filters.eventTypes?.length 
    ? getCategoryFromEventTypes(filters.eventTypes) 
    : 'all';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Category Filter */}
      <Select value={selectedCategory} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <Filter className="h-3 w-3 mr-1" />
          <SelectValue placeholder="Log Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {ACTIVITY_CATEGORIES.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Select value={datePreset} onValueChange={(v) => handleDatePresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <CalendarIcon className="h-3 w-3 mr-1" />
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Picker */}
      {showCustomDate && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              {filters.startDate && filters.endDate ? (
                <>
                  {format(new Date(filters.startDate), 'dd MMM')} - {format(new Date(filters.endDate), 'dd MMM')}
                </>
              ) : filters.startDate ? (
                <>From {format(new Date(filters.startDate), 'dd MMM')}</>
              ) : (
                'Select dates'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.startDate ? new Date(filters.startDate) : undefined}
              onSelect={handleCustomDateSelect}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Active Filters Badge */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={clearFilters}
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};

// Helper to map category to event types
function getCategoryEventTypes(category: ActivityCategory): string[] {
  const typeMap: Record<ActivityCategory, string[]> = {
    profile: ['profile_activated', 'joined_organization', 'profile_updated', 'position_changed', 'department_changed', 'manager_changed'],
    attendance: ['attendance_checked_in', 'attendance_checked_out', 'attendance_adjusted'],
    leave: ['leave_requested', 'leave_approved', 'leave_rejected', 'leave_cancelled', 'leave_modified'],
    kpi: ['kpi_created', 'kpi_updated', 'kpi_milestone_reached', 'review_started', 'review_completed'],
    documents: ['document_uploaded', 'document_deleted', 'document_acknowledged'],
    recognition: ['kudos_received', 'achievement_unlocked'],
    learning: ['training_assigned', 'training_completed', 'certification_earned'],
    workflow: ['workflow_task_completed', 'onboarding_completed'],
  };
  return typeMap[category] || [];
}

// Helper to get category from event types
function getCategoryFromEventTypes(eventTypes: string[]): string {
  if (!eventTypes.length) return 'all';
  
  // Check which category matches
  for (const cat of ACTIVITY_CATEGORIES) {
    const catTypes = getCategoryEventTypes(cat.id);
    if (eventTypes.some(t => catTypes.includes(t))) {
      return cat.id;
    }
  }
  return 'all';
}
