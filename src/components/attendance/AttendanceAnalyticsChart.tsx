import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, BarChart3, Clock, MapPin, Percent, Timer } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
import { format, parseISO, eachDayOfInterval } from 'date-fns';

interface AttendanceAnalyticsChartProps {
  records: any[];
  dateRange: { start: Date; end: Date };
  dateRangeLabel: string;
  getSchedule: (scheduleData: any) => any;
  isLateArrival: (record: any, scheduleData: any, halfDayType?: string | null) => boolean;
  isEarlyDeparture: (record: any, scheduleData: any, halfDayType?: string | null) => boolean;
  getNetHours: (workHours: number | null, scheduleData: any) => number;
  getTimeVariance: (workHours: number | null, scheduleData: any) => { status: string; diff: string | null };
  getHalfDayTypeForRecord?: (employeeId: string, date: string) => string | null;
}

interface TrendDataPoint {
  date: string;
  displayDate: string;
  shortDate: string;
  totalCheckIns: number;
  lateArrivals: number;
  earlyCheckouts: number;
  onTime: number;
  belowTime: number;
  overTime: number;
  wfh: number;
  office: number;
  netHours: number;
  avgNetHours: number;
}

const AttendanceAnalyticsChart = ({
  records,
  dateRange,
  dateRangeLabel,
  getSchedule,
  isLateArrival,
  isEarlyDeparture,
  getNetHours,
  getTimeVariance,
  getHalfDayTypeForRecord,
}: AttendanceAnalyticsChartProps) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Process records into daily trend data
  const trendData: TrendDataPoint[] = useMemo(() => {
    if (!records?.length) return [];

    // Get all days in the range
    const allDays = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    // Group records by date
    const groupedByDate = new Map<string, any[]>();
    records.forEach(record => {
      const dateKey = record.date;
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey)!.push(record);
    });

    // Calculate metrics per day
    return allDays.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayRecords = groupedByDate.get(dateKey) || [];
      
      const totalCheckIns = dayRecords.length;
      const lateArrivals = dayRecords.filter(r => {
        const employee = r.employee as any;
        const halfDayType = getHalfDayTypeForRecord?.(r.employee_id, r.date) ?? null;
        return isLateArrival(r, employee?.employee_schedules, halfDayType);
      }).length;
      
      const earlyCheckouts = dayRecords.filter(r => {
        const employee = r.employee as any;
        const halfDayType = getHalfDayTypeForRecord?.(r.employee_id, r.date) ?? null;
        return isEarlyDeparture(r, employee?.employee_schedules, halfDayType);
      }).length;
      
      const onTime = dayRecords.filter(r => {
        const employee = r.employee as any;
        const halfDayType = getHalfDayTypeForRecord?.(r.employee_id, r.date) ?? null;
        return r.check_in_time && !isLateArrival(r, employee?.employee_schedules, halfDayType);
      }).length;
      
      const wfh = dayRecords.filter(r => r.status === 'remote').length;
      const office = totalCheckIns - wfh;
      
      const netHoursTotal = dayRecords.reduce((sum, r) => {
        const employee = r.employee as any;
        return sum + getNetHours(r.work_hours, employee?.employee_schedules);
      }, 0);
      
      const belowTime = dayRecords.filter(r => {
        const employee = r.employee as any;
        return getTimeVariance(r.work_hours, employee?.employee_schedules).status === 'belowTime';
      }).length;
      
      const overTime = dayRecords.filter(r => {
        const employee = r.employee as any;
        return getTimeVariance(r.work_hours, employee?.employee_schedules).status === 'overTime';
      }).length;

      return {
        date: dateKey,
        displayDate: format(day, 'EEE, MMM d'),
        shortDate: format(day, 'MMM d'),
        totalCheckIns,
        lateArrivals,
        earlyCheckouts,
        onTime,
        belowTime,
        overTime,
        wfh,
        office,
        netHours: Math.round(netHoursTotal * 10) / 10,
        avgNetHours: totalCheckIns > 0 ? Math.round((netHoursTotal / totalCheckIns) * 10) / 10 : 0,
      };
    });
  }, [records, dateRange, isLateArrival, isEarlyDeparture, getNetHours, getTimeVariance, getHalfDayTypeForRecord]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!trendData.length) return null;
    
    const daysWithData = trendData.filter(d => d.totalCheckIns > 0);
    if (!daysWithData.length) return null;
    
    const totalCheckIns = daysWithData.reduce((sum, d) => sum + d.totalCheckIns, 0);
    const avgDaily = Math.round(totalCheckIns / daysWithData.length);
    
    const peakDay = daysWithData.reduce((max, d) => d.totalCheckIns > max.totalCheckIns ? d : max, daysWithData[0]);
    const lowDay = daysWithData.reduce((min, d) => d.totalCheckIns < min.totalCheckIns ? d : min, daysWithData[0]);
    
    // Calculate trend (compare last half vs first half)
    const midPoint = Math.floor(daysWithData.length / 2);
    const firstHalf = daysWithData.slice(0, midPoint);
    const secondHalf = daysWithData.slice(midPoint);
    
    const firstHalfAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, d) => sum + d.totalCheckIns, 0) / firstHalf.length 
      : 0;
    const secondHalfAvg = secondHalf.length > 0 
      ? secondHalf.reduce((sum, d) => sum + d.totalCheckIns, 0) / secondHalf.length 
      : 0;
    
    const trendPercent = firstHalfAvg > 0 
      ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) 
      : 0;

    return { avgDaily, peakDay, lowDay, trendPercent };
  }, [trendData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {entry.name.includes('Hours') ? `${entry.value}h` : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (trendData.length < 2) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-sm">Select a longer date range to see trends</p>
          <p className="text-xs mt-1">At least 2 days of data required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Attendance Trends
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {dateRangeLabel}
          </span>
        </div>
        
        {/* Summary Stats Row */}
        {summaryStats && (
          <div className="grid grid-cols-4 gap-3 mt-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-foreground">{summaryStats.avgDaily}</div>
              <div className="text-[10px] text-muted-foreground">Avg Daily</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-foreground">{summaryStats.peakDay.totalCheckIns}</div>
              <div className="text-[10px] text-muted-foreground">Peak ({summaryStats.peakDay.shortDate})</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-foreground">{summaryStats.lowDay.totalCheckIns}</div>
              <div className="text-[10px] text-muted-foreground">Low ({summaryStats.lowDay.shortDate})</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className={`text-lg font-bold flex items-center justify-center gap-1 ${summaryStats.trendPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summaryStats.trendPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(summaryStats.trendPercent)}%
              </div>
              <div className="text-[10px] text-muted-foreground">Trend</div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-9">
            <TabsTrigger value="overview" className="text-xs gap-1 px-2">
              <BarChart3 className="h-3 w-3" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="punctuality" className="text-xs gap-1 px-2">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Punctuality</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="text-xs gap-1 px-2">
              <Timer className="h-3 w-3" />
              <span className="hidden sm:inline">Hours</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="text-xs gap-1 px-2">
              <MapPin className="h-3 w-3" />
              <span className="hidden sm:inline">Location</span>
            </TabsTrigger>
            <TabsTrigger value="rate" className="text-xs gap-1 px-2">
              <Percent className="h-3 w-3" />
              <span className="hidden sm:inline">On-Time %</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Area Chart */}
          <TabsContent value="overview" className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="onTimeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="shortDate" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="totalCheckIns"
                  name="Total"
                  fill="url(#totalGradient)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="onTime"
                  name="On Time"
                  fill="url(#onTimeGradient)"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Punctuality Tab - Line Chart */}
          <TabsContent value="punctuality" className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="shortDate"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="onTime"
                  name="On Time"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142 76% 36%)', r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="lateArrivals"
                  name="Late"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(38 92% 50%)', r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="earlyCheckouts"
                  name="Early"
                  stroke="hsl(0 84% 60%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(0 84% 60%)', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Work Hours Tab - Composed Chart */}
          <TabsContent value="hours" className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="shortDate"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="netHours"
                  name="Net Hours"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="avgNetHours"
                  name="Avg Hours"
                  stroke="hsl(280 85% 60%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(280 85% 60%)', r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Location Tab - Stacked Bar Chart */}
          <TabsContent value="location" className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="shortDate"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="office"
                  name="Office"
                  fill="hsl(217 91% 60%)"
                  stackId="location"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="wfh"
                  name="WFH"
                  fill="hsl(280 67% 59%)"
                  stackId="location"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* On-Time Rate Tab - Area Chart */}
          <TabsContent value="rate" className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData.map(d => ({
                ...d,
                onTimeRate: d.totalCheckIns > 0 ? Math.round((d.onTime / d.totalCheckIns) * 100) : 0
              }))}>
                <defs>
                  <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="shortDate"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <p className="font-medium mb-2">{label}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-sm bg-green-500" />
                            <span className="text-muted-foreground">On-Time Rate:</span>
                            <span className="font-medium">{payload[0].value}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="onTimeRate"
                  name="On-Time Rate"
                  fill="url(#rateGradient)"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AttendanceAnalyticsChart;
