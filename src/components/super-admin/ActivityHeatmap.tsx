import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Clock } from "lucide-react";
import { getHours, getDay, format } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  selectedOrgs: string[];
  selectedUsers: string[];
  dateRange: { start: Date; end: Date };
}

interface PageVisit {
  visited_at: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const ActivityHeatmap = ({ selectedOrgs, selectedUsers, dateRange }: ActivityHeatmapProps) => {
  const [loading, setLoading] = useState(true);
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);

  useEffect(() => {
    fetchPageVisits();
  }, [selectedOrgs, selectedUsers, dateRange]);

  const fetchPageVisits = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_page_visits')
        .select('visited_at')
        .gte('visited_at', dateRange.start.toISOString())
        .lte('visited_at', dateRange.end.toISOString());

      if (selectedOrgs.length > 0) {
        query = query.in('organization_id', selectedOrgs);
      }

      if (selectedUsers.length > 0) {
        query = query.in('user_id', selectedUsers);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching page visits:', error);
        return;
      }

      setPageVisits(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build heatmap data
  const heatmapData = useMemo(() => {
    // Initialize grid: [day][hour] = count
    const grid: number[][] = Array.from({ length: 7 }, () => 
      Array.from({ length: 24 }, () => 0)
    );

    let maxCount = 0;

    pageVisits.forEach(visit => {
      const date = new Date(visit.visited_at);
      const day = getDay(date); // 0-6 (Sun-Sat)
      const hour = getHours(date); // 0-23
      
      grid[day][hour]++;
      if (grid[day][hour] > maxCount) {
        maxCount = grid[day][hour];
      }
    });

    return { grid, maxCount };
  }, [pageVisits]);

  // Get color intensity based on count
  const getColor = (count: number): string => {
    if (count === 0) return 'bg-muted/30';
    
    const intensity = heatmapData.maxCount > 0 
      ? Math.ceil((count / heatmapData.maxCount) * 5) 
      : 0;
    
    switch (intensity) {
      case 1: return 'bg-primary/20';
      case 2: return 'bg-primary/40';
      case 3: return 'bg-primary/60';
      case 4: return 'bg-primary/80';
      case 5: return 'bg-primary';
      default: return 'bg-muted/30';
    }
  };

  // Get top pages
  const topPagesData = useMemo(() => {
    // We need to fetch page paths for this
    return [];
  }, []);

  // Peak activity analysis
  const peakActivity = useMemo(() => {
    let peakDay = 0;
    let peakHour = 0;
    let maxCount = 0;

    heatmapData.grid.forEach((day, dayIndex) => {
      day.forEach((count, hourIndex) => {
        if (count > maxCount) {
          maxCount = count;
          peakDay = dayIndex;
          peakHour = hourIndex;
        }
      });
    });

    const formatHour = (hour: number) => {
      if (hour === 0) return '12 AM';
      if (hour === 12) return '12 PM';
      return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
    };

    return {
      day: DAYS[peakDay],
      hour: formatHour(peakHour),
      count: maxCount,
    };
  }, [heatmapData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity by Time of Day
          </span>
          {peakActivity.count > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              Peak: {peakActivity.day} at {peakActivity.hour} ({peakActivity.count} visits)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pageVisits.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No activity data available
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hour labels */}
            <div className="flex">
              <div className="w-12" /> {/* Spacer for day labels */}
              <div className="flex-1 flex justify-between text-xs text-muted-foreground">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>11 PM</span>
              </div>
            </div>

            {/* Heatmap grid */}
            <div className="space-y-1">
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-2">
                  <div className="w-10 text-xs text-muted-foreground text-right">
                    {day}
                  </div>
                  <div className="flex-1 flex gap-0.5">
                    {HOURS.map((hour) => {
                      const count = heatmapData.grid[dayIndex][hour];
                      return (
                        <div
                          key={hour}
                          className={cn(
                            "flex-1 h-5 rounded-sm transition-colors cursor-default",
                            getColor(count)
                          )}
                          title={`${day} ${hour}:00 - ${count} visits`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="w-4 h-4 rounded-sm bg-muted/30" />
                <div className="w-4 h-4 rounded-sm bg-primary/20" />
                <div className="w-4 h-4 rounded-sm bg-primary/40" />
                <div className="w-4 h-4 rounded-sm bg-primary/60" />
                <div className="w-4 h-4 rounded-sm bg-primary/80" />
                <div className="w-4 h-4 rounded-sm bg-primary" />
              </div>
              <span>More</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityHeatmap;
