import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, addDays, addWeeks, startOfWeek, endOfWeek, differenceInDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isWithinInterval, startOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { DateRangeOption } from '@/hooks/useLeaveHistoryFilters';

interface LeaveTransaction {
  id: string;
  type: 'leave_taken' | 'adjustment';
  leave_type: string;
  effective_date: string;
  end_date?: string;
  days: number;
  reason: string;
  status: string;
  employee_id: string;
  employee_name: string;
  employee_avatar?: string;
  running_balance?: number;
}

interface LeaveAnalyticsChartProps {
  transactions: LeaveTransaction[];
  yearFilter: string;
  dateRangeFilter: DateRangeOption;
  dateRange: { startDate: Date; endDate: Date };
}

type ChartGranularity = 'daily' | 'weekly' | 'monthly';

interface PeriodData {
  label: string;
  periodKey: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
  adjustments: number;
  daysTaken: number;
  leaveTypes: Record<string, number>;
  approvalRate: number;
  cumulativeDays: number;
}

const leaveTypeColors: Record<string, string> = {
  'Annual Leave': 'hsl(var(--primary))',
  'Sick Leave': 'hsl(0, 84%, 60%)',
  'Personal Leave': 'hsl(262, 83%, 58%)',
  'Maternity Leave': 'hsl(330, 81%, 60%)',
  'Paternity Leave': 'hsl(200, 98%, 39%)',
  'Unpaid Leave': 'hsl(0, 0%, 45%)',
  'Bereavement Leave': 'hsl(0, 0%, 25%)',
  'Compensatory Off': 'hsl(142, 76%, 36%)',
};

const getLeaveTypeColor = (type: string, index: number): string => {
  if (leaveTypeColors[type]) return leaveTypeColors[type];
  const fallbackColors = [
    'hsl(199, 89%, 48%)',
    'hsl(280, 65%, 60%)',
    'hsl(25, 95%, 53%)',
    'hsl(173, 80%, 40%)',
    'hsl(340, 82%, 52%)',
  ];
  return fallbackColors[index % fallbackColors.length];
};

const getGranularity = (dateRangeFilter: DateRangeOption, startDate: Date, endDate: Date): ChartGranularity => {
  const daysDiff = differenceInDays(endDate, startDate);
  
  if (dateRangeFilter === 'today' || dateRangeFilter === 'last7days' || dateRangeFilter === 'last14days') {
    return 'daily';
  }
  if (dateRangeFilter === 'last30days' || dateRangeFilter === 'thisMonth' || dateRangeFilter === 'lastMonth') {
    return 'weekly';
  }
  if (dateRangeFilter === 'thisYear') {
    return 'monthly';
  }
  // Custom: determine by range
  if (daysDiff <= 14) return 'daily';
  if (daysDiff <= 60) return 'weekly';
  return 'monthly';
};

const getGranularityLabel = (granularity: ChartGranularity): { avgLabel: string; peakLabel: string; trendLabel: string } => {
  switch (granularity) {
    case 'daily':
      return { avgLabel: 'Avg / Day', peakLabel: 'Peak Day', trendLabel: '2nd Half vs 1st Half' };
    case 'weekly':
      return { avgLabel: 'Avg / Week', peakLabel: 'Peak Week', trendLabel: '2nd Half vs 1st Half' };
    case 'monthly':
      return { avgLabel: 'Avg / Month', peakLabel: 'Peak Month', trendLabel: 'H2 vs H1' };
  }
};

export function LeaveAnalyticsChart({ transactions, yearFilter, dateRangeFilter, dateRange }: LeaveAnalyticsChartProps) {
  const granularity = useMemo(() => 
    getGranularity(dateRangeFilter, dateRange.startDate, dateRange.endDate),
    [dateRangeFilter, dateRange.startDate, dateRange.endDate]
  );

  const trendData = useMemo(() => {
    const { startDate, endDate } = dateRange;
    const periods: PeriodData[] = [];
    
    // Generate periods based on granularity
    if (granularity === 'daily') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      days.forEach(day => {
        periods.push({
          label: format(day, 'MMM d'),
          periodKey: format(day, 'yyyy-MM-dd'),
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          cancelled: 0,
          adjustments: 0,
          daysTaken: 0,
          leaveTypes: {},
          approvalRate: 0,
          cumulativeDays: 0,
        });
      });
    } else if (granularity === 'weekly') {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      weeks.forEach((weekStart, index) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const displayEnd = weekEnd > endDate ? endDate : weekEnd;
        periods.push({
          label: `${format(weekStart, 'MMM d')} - ${format(displayEnd, 'd')}`,
          periodKey: format(weekStart, 'yyyy-ww'),
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          cancelled: 0,
          adjustments: 0,
          daysTaken: 0,
          leaveTypes: {},
          approvalRate: 0,
          cumulativeDays: 0,
        });
      });
    } else {
      // Monthly
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      months.forEach(monthStart => {
        periods.push({
          label: format(monthStart, 'MMM'),
          periodKey: format(monthStart, 'yyyy-MM'),
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          cancelled: 0,
          adjustments: 0,
          daysTaken: 0,
          leaveTypes: {},
          approvalRate: 0,
          cumulativeDays: 0,
        });
      });
    }

    // Process transactions
    transactions.forEach(t => {
      const txDate = new Date(t.effective_date);
      
      // Find the matching period
      let periodIndex = -1;
      
      if (granularity === 'daily') {
        periodIndex = periods.findIndex(p => p.periodKey === format(txDate, 'yyyy-MM-dd'));
      } else if (granularity === 'weekly') {
        const txWeekStart = startOfWeek(txDate, { weekStartsOn: 1 });
        periodIndex = periods.findIndex(p => p.periodKey === format(txWeekStart, 'yyyy-ww'));
      } else {
        const txMonthStart = startOfMonth(txDate);
        periodIndex = periods.findIndex(p => p.periodKey === format(txMonthStart, 'yyyy-MM'));
      }
      
      if (periodIndex === -1) return;
      
      if (t.type === 'leave_taken') {
        periods[periodIndex].total++;
        
        if (t.status === 'approved') {
          periods[periodIndex].approved++;
          periods[periodIndex].daysTaken += Math.abs(t.days);
        }
        if (t.status === 'pending') periods[periodIndex].pending++;
        if (t.status === 'rejected') periods[periodIndex].rejected++;
        if (t.status === 'cancelled') periods[periodIndex].cancelled++;
        
        // Track by leave type
        const leaveType = t.leave_type || 'Other';
        periods[periodIndex].leaveTypes[leaveType] = 
          (periods[periodIndex].leaveTypes[leaveType] || 0) + 1;
      } else {
        periods[periodIndex].adjustments++;
      }
    });

    // Calculate approval rate and cumulative days
    let cumulative = 0;
    return periods.map(p => {
      const decidedRequests = p.approved + p.rejected;
      cumulative += p.daysTaken;
      return {
        ...p,
        approvalRate: decidedRequests > 0 ? Math.round((p.approved / decidedRequests) * 100) : 0,
        cumulativeDays: cumulative,
      };
    });
  }, [transactions, dateRange, granularity]);

  // Get unique leave types across all periods
  const allLeaveTypes = useMemo(() => {
    const types = new Set<string>();
    trendData.forEach(p => {
      Object.keys(p.leaveTypes).forEach(t => types.add(t));
    });
    return Array.from(types);
  }, [trendData]);

  // Normalize trendData to ensure all leave types have 0 values for every period
  const normalizedTrendData = useMemo(() => {
    return trendData.map(period => {
      const normalizedLeaveTypes: Record<string, number> = {};
      allLeaveTypes.forEach(type => {
        normalizedLeaveTypes[type] = period.leaveTypes[type] || 0;
      });
      return {
        ...period,
        leaveTypes: normalizedLeaveTypes,
      };
    });
  }, [trendData, allLeaveTypes]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalRequests = trendData.reduce((sum, p) => sum + p.total, 0);
    const totalApproved = trendData.reduce((sum, p) => sum + p.approved, 0);
    const periodsWithData = trendData.filter(p => p.total > 0).length;
    
    // Find peak period
    let peakPeriod = trendData[0];
    trendData.forEach(p => {
      if (p.total > (peakPeriod?.total || 0)) peakPeriod = p;
    });
    
    // Calculate trend (first half vs second half)
    const midpoint = Math.floor(trendData.length / 2);
    const firstHalf = trendData.slice(0, midpoint).reduce((sum, p) => sum + p.total, 0);
    const secondHalf = trendData.slice(midpoint).reduce((sum, p) => sum + p.total, 0);
    const trendPercent = firstHalf > 0 
      ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) 
      : secondHalf > 0 ? 100 : 0;
    
    return {
      avgPeriod: periodsWithData > 0 ? Math.round(totalRequests / periodsWithData * 10) / 10 : 0,
      peakPeriod: peakPeriod?.total > 0 ? peakPeriod.label : '-',
      peakCount: peakPeriod?.total || 0,
      approvalRate: totalRequests > 0 ? Math.round((totalApproved / totalRequests) * 100) : 0,
      trendPercent,
    };
  }, [trendData]);

  const granularityLabels = getGranularityLabel(granularity);

  // Format date range header
  const dateRangeHeader = useMemo(() => {
    const { startDate, endDate } = dateRange;
    if (dateRangeFilter === 'thisYear') {
      return yearFilter;
    }
    if (isSameDay(startDate, endDate)) {
      return format(startDate, 'MMM d, yyyy');
    }
    if (startDate.getFullYear() === endDate.getFullYear()) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  }, [dateRange, dateRangeFilter, yearFilter]);

  // Check if we have enough data
  const hasEnoughData = trendData.some(p => p.total > 0 || p.adjustments > 0);

  if (!hasEnoughData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Leave Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No leave data available for {dateRangeHeader}
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {entry.name.includes('Rate') ? `${entry.value}%` : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Leave Trends
          </CardTitle>
          <span className="text-sm text-muted-foreground">{dateRangeHeader}</span>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{summaryStats.avgPeriod}</div>
            <div className="text-xs text-muted-foreground">{granularityLabels.avgLabel}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold truncate" title={summaryStats.peakPeriod}>{summaryStats.peakPeriod}</div>
            <div className="text-xs text-muted-foreground">
              {granularityLabels.peakLabel} ({summaryStats.peakCount})
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{summaryStats.approvalRate}%</div>
            <div className="text-xs text-muted-foreground">Approval Rate</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
              summaryStats.trendPercent >= 0 ? 'text-amber-600' : 'text-green-600'
            }`}>
              {summaryStats.trendPercent >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {Math.abs(summaryStats.trendPercent)}%
            </div>
            <div className="text-xs text-muted-foreground">{granularityLabels.trendLabel}</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Leave Types</TabsTrigger>
            <TabsTrigger value="status" className="text-xs sm:text-sm">Status</TabsTrigger>
            <TabsTrigger value="types" className="text-xs sm:text-sm">Types</TabsTrigger>
            <TabsTrigger value="days" className="text-xs sm:text-sm">Days</TabsTrigger>
            <TabsTrigger value="rate" className="text-xs sm:text-sm">Rate</TabsTrigger>
          </TabsList>

          {/* Overview Tab - Leave Types Line Chart */}
          <TabsContent value="overview" className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={normalizedTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" angle={normalizedTrendData.length > 14 ? -45 : 0} textAnchor={normalizedTrendData.length > 14 ? 'end' : 'middle'} height={normalizedTrendData.length > 14 ? 60 : 30} />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {allLeaveTypes.map((type, index) => (
                  <Line
                    key={type}
                    type="monotone"
                    dataKey={`leaveTypes.${type}`}
                    name={type}
                    stroke={getLeaveTypeColor(type, index)}
                    strokeWidth={2}
                    dot={{ fill: getLeaveTypeColor(type, index), r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Status Distribution Tab - Line Chart */}
          <TabsContent value="status" className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={normalizedTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" angle={normalizedTrendData.length > 14 ? -45 : 0} textAnchor={normalizedTrendData.length > 14 ? 'end' : 'middle'} height={normalizedTrendData.length > 14 ? 60 : 30} />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="approved"
                  name="Approved"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(142, 76%, 36%)" }}
                  connectNulls={true}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  name="Pending"
                  stroke="hsl(45, 93%, 47%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(45, 93%, 47%)" }}
                  connectNulls={true}
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  name="Rejected"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(0, 84%, 60%)" }}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Leave Types Tab - Stacked Bar */}
          <TabsContent value="types" className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={normalizedTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" angle={normalizedTrendData.length > 14 ? -45 : 0} textAnchor={normalizedTrendData.length > 14 ? 'end' : 'middle'} height={normalizedTrendData.length > 14 ? 60 : 30} />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {allLeaveTypes.map((type, index) => (
                  <Bar
                    key={type}
                    dataKey={`leaveTypes.${type}`}
                    name={type}
                    stackId="types"
                    fill={getLeaveTypeColor(type, index)}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Days Taken Tab - Composed Chart */}
          <TabsContent value="days" className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={normalizedTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" angle={normalizedTrendData.length > 14 ? -45 : 0} textAnchor={normalizedTrendData.length > 14 ? 'end' : 'middle'} height={normalizedTrendData.length > 14 ? 60 : 30} />
                <YAxis yAxisId="left" className="text-xs" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" className="text-xs" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="daysTaken"
                  name="Days Taken"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativeDays"
                  name="Cumulative"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(262, 83%, 58%)" }}
                  connectNulls={true}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Approval Rate Tab - Area Chart */}
          <TabsContent value="rate" className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={normalizedTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" angle={normalizedTrendData.length > 14 ? -45 : 0} textAnchor={normalizedTrendData.length > 14 ? 'end' : 'middle'} height={normalizedTrendData.length > 14 ? 60 : 30} />
                <YAxis className="text-xs" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  content={<CustomTooltip />}
                  formatter={(value: number) => [`${value}%`, 'Approval Rate']}
                />
                <Area
                  type="monotone"
                  dataKey="approvalRate"
                  name="Approval Rate"
                  stroke="hsl(142, 76%, 36%)"
                  fill="hsl(142, 76%, 36%)"
                  fillOpacity={0.3}
                  connectNulls={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
