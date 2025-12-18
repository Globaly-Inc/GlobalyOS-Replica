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
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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
}

interface MonthData {
  month: string;
  monthIndex: number;
  fullMonth: string;
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

const chartConfig = {
  total: {
    label: "Total Requests",
    color: "hsl(var(--primary))",
  },
  approved: {
    label: "Approved",
    color: "hsl(142, 76%, 36%)",
  },
  pending: {
    label: "Pending",
    color: "hsl(45, 93%, 47%)",
  },
  rejected: {
    label: "Rejected",
    color: "hsl(0, 84%, 60%)",
  },
  daysTaken: {
    label: "Days Taken",
    color: "hsl(var(--primary))",
  },
  cumulativeDays: {
    label: "Cumulative Days",
    color: "hsl(262, 83%, 58%)",
  },
  approvalRate: {
    label: "Approval Rate",
    color: "hsl(142, 76%, 36%)",
  },
} satisfies ChartConfig;

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

export function LeaveAnalyticsChart({ transactions, yearFilter }: LeaveAnalyticsChartProps) {
  const trendData = useMemo(() => {
    const year = parseInt(yearFilter);
    
    // Initialize all 12 months
    const months: MonthData[] = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(year, i, 1);
      return {
        month: format(date, 'MMM'),
        monthIndex: i,
        fullMonth: format(date, 'MMMM'),
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
      };
    });

    // Process transactions
    transactions.forEach(t => {
      const txDate = new Date(t.effective_date);
      if (txDate.getFullYear() !== year) return;
      
      const monthIndex = txDate.getMonth();
      
      if (t.type === 'leave_taken') {
        months[monthIndex].total++;
        
        if (t.status === 'approved') {
          months[monthIndex].approved++;
          months[monthIndex].daysTaken += Math.abs(t.days);
        }
        if (t.status === 'pending') months[monthIndex].pending++;
        if (t.status === 'rejected') months[monthIndex].rejected++;
        if (t.status === 'cancelled') months[monthIndex].cancelled++;
        
        // Track by leave type
        const leaveType = t.leave_type || 'Other';
        months[monthIndex].leaveTypes[leaveType] = 
          (months[monthIndex].leaveTypes[leaveType] || 0) + 1;
      } else {
        months[monthIndex].adjustments++;
      }
    });

    // Calculate approval rate and cumulative days
    let cumulative = 0;
    return months.map(m => {
      const decidedRequests = m.approved + m.rejected;
      cumulative += m.daysTaken;
      return {
        ...m,
        approvalRate: decidedRequests > 0 ? Math.round((m.approved / decidedRequests) * 100) : 0,
        cumulativeDays: cumulative,
      };
    });
  }, [transactions, yearFilter]);

  // Get unique leave types across all months
  const allLeaveTypes = useMemo(() => {
    const types = new Set<string>();
    trendData.forEach(m => {
      Object.keys(m.leaveTypes).forEach(t => types.add(t));
    });
    return Array.from(types);
  }, [trendData]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalRequests = trendData.reduce((sum, m) => sum + m.total, 0);
    const totalApproved = trendData.reduce((sum, m) => sum + m.approved, 0);
    const totalDays = trendData.reduce((sum, m) => sum + m.daysTaken, 0);
    const monthsWithData = trendData.filter(m => m.total > 0).length;
    
    // Find peak month
    let peakMonth = trendData[0];
    trendData.forEach(m => {
      if (m.total > peakMonth.total) peakMonth = m;
    });
    
    // Calculate trend (first half vs second half)
    const firstHalf = trendData.slice(0, 6).reduce((sum, m) => sum + m.total, 0);
    const secondHalf = trendData.slice(6).reduce((sum, m) => sum + m.total, 0);
    const trendPercent = firstHalf > 0 
      ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) 
      : secondHalf > 0 ? 100 : 0;
    
    return {
      avgMonthly: monthsWithData > 0 ? Math.round(totalRequests / monthsWithData) : 0,
      peakMonth: peakMonth.total > 0 ? peakMonth.month : '-',
      peakCount: peakMonth.total,
      approvalRate: totalRequests > 0 ? Math.round((totalApproved / totalRequests) * 100) : 0,
      trendPercent,
      totalDays,
    };
  }, [trendData]);

  // Check if we have enough data
  const hasEnoughData = trendData.some(m => m.total > 0 || m.adjustments > 0);

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
            No leave data available for {yearFilter}
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
          <span className="text-sm text-muted-foreground">{yearFilter}</span>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{summaryStats.avgMonthly}</div>
            <div className="text-xs text-muted-foreground">Avg / Month</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{summaryStats.peakMonth}</div>
            <div className="text-xs text-muted-foreground">
              Peak ({summaryStats.peakCount})
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
            <div className="text-xs text-muted-foreground">H2 vs H1</div>
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
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
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
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Status Distribution Tab - Line Chart */}
          <TabsContent value="status" className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
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
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  name="Pending"
                  stroke="hsl(45, 93%, 47%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(45, 93%, 47%)" }}
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  name="Rejected"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(0, 84%, 60%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Leave Types Tab - Stacked Bar */}
          <TabsContent value="types" className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
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
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
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
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Approval Rate Tab - Area Chart */}
          <TabsContent value="rate" className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
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
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
