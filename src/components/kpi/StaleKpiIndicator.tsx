import { AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInDays, parseISO } from 'date-fns';
import type { KpiReminderFrequency } from '@/types/kpi';

interface StaleKpiIndicatorProps {
  lastUpdated: string;
  frequency?: KpiReminderFrequency | null;
  variant?: 'badge' | 'icon' | 'banner';
}

// Calculate stale threshold based on frequency
const getStaleThresholdDays = (frequency?: KpiReminderFrequency | null): number => {
  switch (frequency) {
    case 'daily': return 2;
    case 'weekly': return 10;
    case 'biweekly': return 18;
    case 'monthly': return 40;
    default: return 14; // Default 14 days
  }
};

export const isKpiStale = (lastUpdated: string, frequency?: KpiReminderFrequency | null): boolean => {
  const threshold = getStaleThresholdDays(frequency);
  const daysSinceUpdate = differenceInDays(new Date(), parseISO(lastUpdated));
  return daysSinceUpdate > threshold;
};

export const getDaysSinceUpdate = (lastUpdated: string): number => {
  return differenceInDays(new Date(), parseISO(lastUpdated));
};

export const StaleKpiIndicator = ({
  lastUpdated,
  frequency,
  variant = 'badge',
}: StaleKpiIndicatorProps) => {
  const threshold = getStaleThresholdDays(frequency);
  const daysSinceUpdate = getDaysSinceUpdate(lastUpdated);
  const isStale = daysSinceUpdate > threshold;

  if (!isStale) return null;

  const tooltipContent = (
    <div className="text-center">
      <p className="font-medium">KPI Needs Attention</p>
      <p className="text-xs">Not updated in {daysSinceUpdate} days</p>
      <p className="text-xs text-muted-foreground">
        Expected update every {threshold} days
      </p>
    </div>
  );

  if (variant === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-600 animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="font-medium">This KPI needs attention</p>
          <p className="text-sm text-amber-700">
            Last updated {daysSinceUpdate} days ago. Consider adding a progress update.
          </p>
        </div>
      </div>
    );
  }

  // Default badge variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse cursor-help"
          >
            <Clock className="h-3 w-3 mr-1" />
            Stale
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
