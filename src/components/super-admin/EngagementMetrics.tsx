import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Monitor, Smartphone, Tablet, TrendingUp, Globe } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, differenceInDays, subWeeks, eachDayOfInterval } from "date-fns";

interface EngagementMetricsProps {
  selectedOrgs: string[];
  selectedUsers: string[];
  dateRange: { start: Date; end: Date };
}

interface PageVisit {
  user_id: string;
  visited_at: string;
  device_type: string | null;
  browser_info: string | null;
  organization_id: string | null;
}

const DEVICE_COLORS = {
  desktop: 'hsl(var(--primary))',
  mobile: 'hsl(142 76% 36%)',
  tablet: 'hsl(45 93% 47%)',
  unknown: 'hsl(var(--muted-foreground))',
};

const BROWSER_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)',
  'hsl(45 93% 47%)',
  'hsl(280 65% 60%)',
  'hsl(200 95% 45%)',
  'hsl(var(--muted-foreground))',
];

const EngagementMetrics = ({ selectedOrgs, selectedUsers, dateRange }: EngagementMetricsProps) => {
  const [loading, setLoading] = useState(true);
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);

  // Stabilize dependencies using primitive values to prevent infinite re-renders
  const selectedOrgsKey = selectedOrgs.join(',');
  const selectedUsersKey = selectedUsers.join(',');
  const dateRangeKey = `${dateRange.start.getTime()}-${dateRange.end.getTime()}`;

  useEffect(() => {
    fetchPageVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgsKey, selectedUsersKey, dateRangeKey]);

  const fetchPageVisits = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_page_visits')
        .select('user_id, visited_at, device_type, browser_info, organization_id')
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

  // Calculate DAU/WAU metrics
  const engagementMetrics = useMemo(() => {
    if (pageVisits.length === 0) {
      return { dau: 0, wau: 0, stickiness: 0, avgDailyVisits: 0, dauTrend: [] };
    }

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(subDays(now, 1));
    const weekAgo = startOfDay(subWeeks(now, 1));

    // DAU - unique users today
    const todayUsers = new Set(
      pageVisits
        .filter(v => new Date(v.visited_at) >= today)
        .map(v => v.user_id)
    );

    // WAU - unique users in last 7 days
    const weekUsers = new Set(
      pageVisits
        .filter(v => new Date(v.visited_at) >= weekAgo)
        .map(v => v.user_id)
    );

    // Stickiness ratio (DAU/WAU)
    const stickiness = weekUsers.size > 0 ? (todayUsers.size / weekUsers.size) * 100 : 0;

    // Average daily visits in date range
    const daysInRange = Math.max(1, differenceInDays(dateRange.end, dateRange.start) + 1);
    const avgDailyVisits = pageVisits.length / daysInRange;

    // DAU trend over last 7 days
    const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
    const dauTrend = last7Days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const uniqueUsers = new Set(
        pageVisits
          .filter(v => {
            const visitDate = new Date(v.visited_at);
            return visitDate >= dayStart && visitDate <= dayEnd;
          })
          .map(v => v.user_id)
      );
      
      return {
        date: format(day, 'EEE'),
        users: uniqueUsers.size,
      };
    });

    return {
      dau: todayUsers.size,
      wau: weekUsers.size,
      stickiness: Math.round(stickiness),
      avgDailyVisits: Math.round(avgDailyVisits),
      dauTrend,
    };
  }, [pageVisits, dateRange]);

  // Device distribution
  const deviceData = useMemo(() => {
    const counts: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    
    pageVisits.forEach(visit => {
      const device = visit.device_type?.toLowerCase() || 'unknown';
      if (device in counts) {
        counts[device]++;
      } else {
        counts.unknown++;
      }
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: DEVICE_COLORS[name as keyof typeof DEVICE_COLORS] || DEVICE_COLORS.unknown,
      }));
  }, [pageVisits]);

  // Browser distribution
  const browserData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    pageVisits.forEach(visit => {
      const browser = visit.browser_info || 'Unknown';
      counts[browser] = (counts[browser] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 browsers
      .map(([name, value], index) => ({
        name,
        value,
        color: BROWSER_COLORS[index] || BROWSER_COLORS[BROWSER_COLORS.length - 1],
      }));
  }, [pageVisits]);

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engagement Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementMetrics.dau}</div>
            <p className="text-xs text-muted-foreground">
              Today's unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementMetrics.wau}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stickiness (DAU/WAU)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementMetrics.stickiness}%</div>
            <p className="text-xs text-muted-foreground">
              Higher is better (target: 20-30%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Page Views</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementMetrics.avgDailyVisits}</div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Device & Browser Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Device Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviceData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value} visits`, 'Count']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Browser Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {browserData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={browserData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {browserData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value} visits`, 'Count']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EngagementMetrics;
