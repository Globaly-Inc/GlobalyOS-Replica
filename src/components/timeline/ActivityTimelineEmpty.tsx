/**
 * Activity Timeline Empty State
 * Shown when no events are available
 */

import { Calendar } from 'lucide-react';

interface ActivityTimelineEmptyProps {
  hasFilters?: boolean;
}

export const ActivityTimelineEmpty = ({ hasFilters = false }: ActivityTimelineEmptyProps) => {
  return (
    <div className="text-center py-12">
      <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
      <h3 className="font-medium text-muted-foreground mb-1">
        {hasFilters ? 'No matching events' : 'No timeline events yet'}
      </h3>
      <p className="text-sm text-muted-foreground/70">
        {hasFilters 
          ? 'Try adjusting your filters to see more events'
          : 'Activity will appear here as it happens'
        }
      </p>
    </div>
  );
};
