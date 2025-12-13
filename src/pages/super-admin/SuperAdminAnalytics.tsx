import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Building2, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Activity,
  BookOpen,
  CalendarDays,
  Clock,
  ClipboardCheck,
  Trophy,
  Megaphone,
  Heart,
  Target,
  Minus,
  LucideIcon,
  CalendarIcon,
  FolderOpen,
  GraduationCap,
  FileCheck,
  FileText,
  Award,
  Briefcase,
  MapPin,
  History,
  Bell,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import { format, subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

type ViewMode = 'days' | 'week' | 'month';
type DatePreset = 'last7' | 'last30' | 'last90' | 'last6months' | 'last12months' | 'custom';

interface FeatureItem {
  name: string;
  count: number;
  lastWeekCount: number;
  icon: LucideIcon;
  module: 'team' | 'hr' | 'wiki' | 'organization';
}

interface GrowthDataPoint {
  label: string;
  count: number;
}

interface AnalyticsData {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  activeUsers: number;
  featureUsage: FeatureItem[];
  orgs: { id: string; created_at: string }[];
  users: { id: string; created_at: string }[];
  activities: { created_at: string }[];
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'last6months', label: 'Last 6 months' },
  { value: 'last12months', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
];

const SuperAdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Chart filter states
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [datePreset, setDatePreset] = useState<DatePreset>('last7');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());
  const [showCumulative, setShowCumulative] = useState(false);
  const [showActivitiesCumulative, setShowActivitiesCumulative] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoISO = oneWeekAgo.toISOString();

      // Get organization stats
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, plan, created_at');

      // Get user stats with created_at for growth calculation
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, created_at');

      // Get active employees
      const { data: employees } = await supabase
        .from('employees')
        .select('id, status');

      // Fetch activities for chart (all feature tables)
      const [
        { data: updatesData },
        { data: kudosData },
        { data: attendanceData },
        { data: leaveData },
        { data: wikiPagesData },
        { data: wikiFoldersData },
        { data: learningData },
        { data: reviewsData },
        { data: achievementsData },
        { data: calendarData },
        { data: kpisData },
        { data: documentsData },
        { data: notificationsData },
        { data: reactionsData },
        { data: positionHistoryData },
        { data: projectsData },
      ] = await Promise.all([
        supabase.from('updates').select('created_at'),
        supabase.from('kudos').select('created_at'),
        supabase.from('attendance_records').select('created_at'),
        supabase.from('leave_requests').select('created_at'),
        supabase.from('wiki_pages').select('created_at'),
        supabase.from('wiki_folders').select('created_at'),
        supabase.from('learning_development').select('created_at'),
        supabase.from('performance_reviews').select('created_at'),
        supabase.from('achievements').select('created_at'),
        supabase.from('calendar_events').select('created_at'),
        supabase.from('kpis').select('created_at'),
        supabase.from('employee_documents').select('created_at'),
        supabase.from('notifications').select('created_at'),
        supabase.from('feed_reactions').select('created_at'),
        supabase.from('position_history').select('created_at'),
        supabase.from('projects').select('created_at'),
      ]);
      
      const allActivities = [
        ...(updatesData || []),
        ...(kudosData || []),
        ...(attendanceData || []),
        ...(leaveData || []),
        ...(wikiPagesData || []),
        ...(wikiFoldersData || []),
        ...(learningData || []),
        ...(reviewsData || []),
        ...(achievementsData || []),
        ...(calendarData || []),
        ...(kpisData || []),
        ...(documentsData || []),
        ...(notificationsData || []),
        ...(reactionsData || []),
        ...(positionHistoryData || []),
        ...(projectsData || []),
      ];

      // Helper function to get counts - using any to bypass strict table typing
      const getCount = async (table: string, filter?: { column: string; value: string }) => {
        let query = (supabase.from(table as any) as any).select('*', { count: 'exact', head: true });
        if (filter) {
          query = query.eq(filter.column, filter.value);
        }
        const { count } = await query;
        return count || 0;
      };

      const getLastWeekCount = async (table: string, filter?: { column: string; value: string }) => {
        let query = (supabase.from(table as any) as any).select('*', { count: 'exact', head: true }).lt('created_at', oneWeekAgoISO);
        if (filter) {
          query = query.eq(filter.column, filter.value);
        }
        const { count } = await query;
        return count || 0;
      };

      // Fetch all feature counts in parallel
      const [
        // Wiki module
        wikiPagesCount, wikiPagesLastWeek,
        wikiFoldersCount, wikiFoldersLastWeek,
        // Team/Social module
        winsCount, winsLastWeek,
        announcementsCount, announcementsLastWeek,
        kudosCount, kudosLastWeek,
        // HR module
        leaveCount, leaveLastWeek,
        attendanceCount, attendanceLastWeek,
        learningCount, learningLastWeek,
        reviewsCount, reviewsLastWeek,
        positionHistoryCount, positionHistoryLastWeek,
        // Organization module
        calendarCount, calendarLastWeek,
        kpiCount, kpiLastWeek,
        achievementsCount, achievementsLastWeek,
        projectsCount, projectsLastWeek,
        officesCount, officesLastWeek,
        documentsCount, documentsLastWeek,
        notificationsCount, notificationsLastWeek,
      ] = await Promise.all([
        // Wiki module
        getCount('wiki_pages'), getLastWeekCount('wiki_pages'),
        getCount('wiki_folders'), getLastWeekCount('wiki_folders'),
        // Team/Social module
        getCount('updates', { column: 'type', value: 'win' }), getLastWeekCount('updates', { column: 'type', value: 'win' }),
        getCount('updates', { column: 'type', value: 'announcement' }), getLastWeekCount('updates', { column: 'type', value: 'announcement' }),
        getCount('kudos'), getLastWeekCount('kudos'),
        // HR module
        getCount('leave_requests'), getLastWeekCount('leave_requests'),
        getCount('attendance_records'), getLastWeekCount('attendance_records'),
        getCount('learning_development'), getLastWeekCount('learning_development'),
        getCount('performance_reviews'), getLastWeekCount('performance_reviews'),
        getCount('position_history'), getLastWeekCount('position_history'),
        // Organization module
        getCount('calendar_events'), getLastWeekCount('calendar_events'),
        getCount('kpis'), getLastWeekCount('kpis'),
        getCount('achievements'), getLastWeekCount('achievements'),
        getCount('projects'), getLastWeekCount('projects'),
        getCount('offices'), getLastWeekCount('offices'),
        getCount('employee_documents'), getLastWeekCount('employee_documents'),
        getCount('notifications'), getLastWeekCount('notifications'),
      ]);

      const activeOrgs = orgs?.filter(o => o.plan !== 'inactive').length || 0;
      const activeEmployees = employees?.filter(e => e.status === 'active').length || 0;

      setData({
        totalOrgs: orgs?.length || 0,
        activeOrgs,
        totalUsers: profiles?.length || 0,
        activeUsers: activeEmployees,
        featureUsage: [
          // Wiki module
          { name: 'Wiki Pages', count: wikiPagesCount, lastWeekCount: wikiPagesLastWeek, icon: BookOpen, module: 'wiki' },
          { name: 'Wiki Folders', count: wikiFoldersCount, lastWeekCount: wikiFoldersLastWeek, icon: FolderOpen, module: 'wiki' },
          // Team/Social module
          { name: 'Wins', count: winsCount, lastWeekCount: winsLastWeek, icon: Trophy, module: 'team' },
          { name: 'Announcements', count: announcementsCount, lastWeekCount: announcementsLastWeek, icon: Megaphone, module: 'team' },
          { name: 'Kudos', count: kudosCount, lastWeekCount: kudosLastWeek, icon: Heart, module: 'team' },
          // HR module
          { name: 'Leave Requests', count: leaveCount, lastWeekCount: leaveLastWeek, icon: Clock, module: 'hr' },
          { name: 'Attendance', count: attendanceCount, lastWeekCount: attendanceLastWeek, icon: ClipboardCheck, module: 'hr' },
          { name: 'Learning & Dev', count: learningCount, lastWeekCount: learningLastWeek, icon: GraduationCap, module: 'hr' },
          { name: 'Reviews', count: reviewsCount, lastWeekCount: reviewsLastWeek, icon: FileCheck, module: 'hr' },
          { name: 'Position Changes', count: positionHistoryCount, lastWeekCount: positionHistoryLastWeek, icon: History, module: 'hr' },
          // Organization module
          { name: 'Calendar Events', count: calendarCount, lastWeekCount: calendarLastWeek, icon: CalendarDays, module: 'organization' },
          { name: 'KPIs', count: kpiCount, lastWeekCount: kpiLastWeek, icon: Target, module: 'organization' },
          { name: 'Achievements', count: achievementsCount, lastWeekCount: achievementsLastWeek, icon: Award, module: 'organization' },
          { name: 'Projects', count: projectsCount, lastWeekCount: projectsLastWeek, icon: Briefcase, module: 'organization' },
          { name: 'Offices', count: officesCount, lastWeekCount: officesLastWeek, icon: MapPin, module: 'organization' },
          { name: 'Documents', count: documentsCount, lastWeekCount: documentsLastWeek, icon: FileText, module: 'organization' },
          { name: 'Notifications', count: notificationsCount, lastWeekCount: notificationsLastWeek, icon: Bell, module: 'organization' },
        ],
        orgs: orgs?.map(o => ({ id: o.id, created_at: o.created_at })) || [],
        users: profiles?.map(p => ({ id: p.id, created_at: p.created_at })) || [],
        activities: allActivities,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = endOfDay(now);
    
    switch (datePreset) {
      case 'last7':
        start = startOfDay(subDays(now, 6));
        break;
      case 'last30':
        start = startOfDay(subDays(now, 29));
        break;
      case 'last90':
        start = startOfDay(subDays(now, 89));
        break;
      case 'last6months':
        start = startOfDay(subMonths(now, 6));
        break;
      case 'last12months':
        start = startOfDay(subMonths(now, 12));
        break;
      case 'custom':
        start = customStartDate ? startOfDay(customStartDate) : startOfDay(subDays(now, 29));
        end = customEndDate ? endOfDay(customEndDate) : endOfDay(now);
        break;
      default:
        start = startOfDay(subDays(now, 29));
    }
    
    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  // Calculate growth data based on view mode and date range
  const growthData = useMemo(() => {
    if (!data) return { orgGrowth: [], userGrowth: [] };

    const { start, end } = dateRange;
    let intervals: Date[];
    let labelFormat: string;

    switch (viewMode) {
      case 'days':
        intervals = eachDayOfInterval({ start, end });
        labelFormat = 'd MMM';
        break;
      case 'week':
        intervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        labelFormat = 'd MMM';
        break;
      case 'month':
        intervals = eachMonthOfInterval({ start, end });
        labelFormat = 'MMM yyyy';
        break;
      default:
        intervals = eachDayOfInterval({ start, end });
        labelFormat = 'd MMM';
    }

    const orgGrowth: GrowthDataPoint[] = intervals.map((intervalDate) => {
      let intervalStart: Date;
      let intervalEnd: Date;
      switch (viewMode) {
        case 'week':
          intervalStart = startOfWeek(intervalDate, { weekStartsOn: 1 });
          intervalEnd = endOfWeek(intervalDate, { weekStartsOn: 1 });
          break;
        case 'month':
          intervalStart = startOfMonth(intervalDate);
          intervalEnd = endOfMonth(intervalDate);
          break;
        default:
          intervalStart = startOfDay(intervalDate);
          intervalEnd = endOfDay(intervalDate);
      }
      
      // Count orgs created WITHIN this interval (incremental, not cumulative)
      const count = data.orgs.filter(org => {
        const createdAt = new Date(org.created_at);
        return createdAt >= intervalStart && createdAt <= intervalEnd;
      }).length;

      return {
        label: format(intervalDate, labelFormat),
        count,
      };
    });

    const userGrowth: GrowthDataPoint[] = intervals.map((intervalDate) => {
      let intervalStart: Date;
      let intervalEnd: Date;
      switch (viewMode) {
        case 'week':
          intervalStart = startOfWeek(intervalDate, { weekStartsOn: 1 });
          intervalEnd = endOfWeek(intervalDate, { weekStartsOn: 1 });
          break;
        case 'month':
          intervalStart = startOfMonth(intervalDate);
          intervalEnd = endOfMonth(intervalDate);
          break;
        default:
          intervalStart = startOfDay(intervalDate);
          intervalEnd = endOfDay(intervalDate);
      }
      
      // Count users created WITHIN this interval (incremental, not cumulative)
      const count = data.users.filter(user => {
        const createdAt = new Date(user.created_at);
        return createdAt >= intervalStart && createdAt <= intervalEnd;
      }).length;

      return {
        label: format(intervalDate, labelFormat),
        count,
      };
    });

    const activityGrowth: GrowthDataPoint[] = intervals.map((intervalDate) => {
      let intervalStart: Date;
      let intervalEnd: Date;
      switch (viewMode) {
        case 'week':
          intervalStart = startOfWeek(intervalDate, { weekStartsOn: 1 });
          intervalEnd = endOfWeek(intervalDate, { weekStartsOn: 1 });
          break;
        case 'month':
          intervalStart = startOfMonth(intervalDate);
          intervalEnd = endOfMonth(intervalDate);
          break;
        default:
          intervalStart = startOfDay(intervalDate);
          intervalEnd = endOfDay(intervalDate);
      }
      
      // Count activities created WITHIN this interval (incremental, not cumulative)
      const count = data.activities.filter(activity => {
        const createdAt = new Date(activity.created_at);
        return createdAt >= intervalStart && createdAt <= intervalEnd;
      }).length;

      return {
        label: format(intervalDate, labelFormat),
        count,
      };
    });

    return { orgGrowth, userGrowth, activityGrowth };
  }, [data, viewMode, dateRange]);

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-muted-foreground">
            Platform-wide usage statistics and trends
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Organisations
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.activeOrgs}</div>
              <p className="text-xs text-muted-foreground">
                of {data?.totalOrgs} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                of {data?.totalUsers} registered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Most Used Feature
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.featureUsage.sort((a, b) => b.count - a.count)[0]?.name || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {data?.featureUsage.sort((a, b) => b.count - a.count)[0]?.count || 0} records
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Activity
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.featureUsage.reduce((sum, f) => sum + f.count, 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total records across features
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">View by:</span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['days', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition-colors",
                    viewMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Period:</span>
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {customStartDate ? format(customStartDate, 'dd MMM yyyy') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {customEndDate ? format(customEndDate, 'dd MMM yyyy') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    disabled={(date) => date > new Date() || (customStartDate && date < customStartDate)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Organisation Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthData.orgGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      interval={viewMode === 'days' && growthData.orgGrowth.length > 15 ? Math.floor(growthData.orgGrowth.length / 10) : 0}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users Growth</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cumulative</span>
                <Button
                  variant={showCumulative ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowCumulative(!showCumulative)}
                >
                  {showCumulative ? "On" : "Off"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={showCumulative 
                    ? (() => {
                        let cumulative = 0;
                        return growthData.userGrowth.map(item => {
                          cumulative += item.count;
                          return { label: item.label, count: cumulative };
                        });
                      })()
                    : growthData.userGrowth
                  }>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      interval={viewMode === 'days' && growthData.userGrowth.length > 15 ? Math.floor(growthData.userGrowth.length / 10) : 0}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone"
                      dataKey="count" 
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      connectNulls
                      activeDot={{ r: 6, fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities Chart - Full Width */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Activities</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cumulative</span>
              <Button
                variant={showActivitiesCumulative ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowActivitiesCumulative(!showActivitiesCumulative)}
              >
                {showActivitiesCumulative ? "On" : "Off"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={showActivitiesCumulative 
                  ? (() => {
                      let cumulative = 0;
                      return growthData.activityGrowth.map(item => {
                        cumulative += item.count;
                        return { label: item.label, count: cumulative };
                      });
                    })()
                  : growthData.activityGrowth
                }>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval={viewMode === 'days' && growthData.activityGrowth.length > 15 ? Math.floor(growthData.activityGrowth.length / 10) : 0}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="count" 
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    connectNulls
                    activeDot={{ r: 6, fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>


        {/* Feature Usage Cards - Grouped by Module */}
        {(['team', 'hr', 'wiki', 'organization'] as const).map((module) => {
          const moduleLabels = {
            team: 'Team & Social',
            hr: 'HR & People',
            wiki: 'Wiki & Knowledge',
            organization: 'Organization',
          };
          const moduleFeatures = data?.featureUsage.filter(f => f.module === module) || [];
          
          if (moduleFeatures.length === 0) return null;
          
          return (
            <div key={module}>
              <h3 className="text-lg font-semibold text-foreground mb-4">{moduleLabels[module]}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {moduleFeatures.map((feature) => {
                  const IconComponent = feature.icon;
                  const weeklyGrowth = feature.count - feature.lastWeekCount;
                  const growthPercentage = feature.lastWeekCount > 0 
                    ? ((weeklyGrowth / feature.lastWeekCount) * 100).toFixed(1)
                    : feature.count > 0 ? '100' : '0';
                  const isPositive = weeklyGrowth > 0;
                  const isNeutral = weeklyGrowth === 0;
                  
                  return (
                    <Card key={feature.name}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          {feature.name}
                        </CardTitle>
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{feature.count.toLocaleString()}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {isNeutral ? (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          ) : isPositive ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs ${
                            isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isNeutral ? 'No change' : `${isPositive ? '+' : ''}${weeklyGrowth} (${growthPercentage}%)`}
                          </span>
                          <span className="text-xs text-muted-foreground">this week</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminAnalytics;
