import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  FolderOpen,
  GraduationCap,
  FileCheck,
  FileText,
  Award,
  Briefcase,
  MapPin,
  History,
  Bell,
  SmilePlus,
  ChevronDown,
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
import SuperAdminPageHeader from "@/components/super-admin/SuperAdminPageHeader";
import AnalyticsFilters, { DatePreset, ViewMode } from "@/components/super-admin/AnalyticsFilters";
import EngagementMetrics from "@/components/super-admin/EngagementMetrics";
import ActivityHeatmap from "@/components/super-admin/ActivityHeatmap";
import ChurnRiskCard from "@/components/super-admin/ChurnRiskCard";
import { format, subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

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

const MODULE_LABELS = {
  team: 'Team & Social',
  hr: 'HR & People',
  wiki: 'Wiki & Knowledge',
  organization: 'Organization',
};

const SuperAdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [datePreset, setDatePreset] = useState<DatePreset>('last30');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());
  
  // Section states
  const [showCumulative, setShowCumulative] = useState(false);
  const [showActivitiesCumulative, setShowActivitiesCumulative] = useState(false);
  const [openModules, setOpenModules] = useState<string[]>(['team', 'hr', 'wiki', 'organization']);

  // Stabilize dependencies using primitive values to prevent infinite re-renders
  const selectedOrgsKey = selectedOrgs.join(',');
  const selectedUsersKey = selectedUsers.join(',');

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgsKey, selectedUsersKey]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoISO = oneWeekAgo.toISOString();

      // Build org filter
      const orgFilter = selectedOrgs.length > 0 ? selectedOrgs : null;

      // Get organization stats
      let orgsQuery = supabase.from('organizations').select('id, plan, created_at');
      if (orgFilter) {
        orgsQuery = orgsQuery.in('id', orgFilter);
      }
      const { data: orgs } = await orgsQuery;

      // Get user stats with created_at for growth calculation
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, created_at');

      // Get active employees
      let employeesQuery = supabase.from('employees').select('id, status, organization_id');
      if (orgFilter) {
        employeesQuery = employeesQuery.in('organization_id', orgFilter);
      }
      const { data: employees } = await employeesQuery;

      // Build queries with optional org filter
      const buildQuery = (table: string) => {
        let query = (supabase.from(table as any) as any).select('created_at');
        if (orgFilter) {
          query = query.in('organization_id', orgFilter);
        }
        return query;
      };

      // Fetch activities for chart (all feature tables)
      // Note: Using new unified 'posts' table instead of deprecated 'updates' and 'kudos' tables
      const [
        { data: postsData },
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
        { data: postReactionsData },
        { data: positionHistoryData },
        { data: projectsData },
      ] = await Promise.all([
        buildQuery('posts'),
        buildQuery('attendance_records'),
        buildQuery('leave_requests'),
        buildQuery('wiki_pages'),
        buildQuery('wiki_folders'),
        buildQuery('learning_development'),
        buildQuery('performance_reviews'),
        buildQuery('achievements'),
        buildQuery('calendar_events'),
        buildQuery('kpis'),
        buildQuery('employee_documents'),
        buildQuery('notifications'),
        buildQuery('post_reactions'),
        buildQuery('position_history'),
        buildQuery('projects'),
      ]);
      
      const allActivities = [
        ...(postsData || []),
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
        ...(postReactionsData || []),
        ...(positionHistoryData || []),
        ...(projectsData || []),
      ];

      // Helper function to get counts with optional org filter
      const getCount = async (table: string, filter?: { column: string; value: string }) => {
        let query = (supabase.from(table as any) as any).select('*', { count: 'exact', head: true });
        if (filter) {
          query = query.eq(filter.column, filter.value);
        }
        if (orgFilter && table !== 'offices') {
          query = query.in('organization_id', orgFilter);
        }
        const { count } = await query;
        return count || 0;
      };

      const getLastWeekCount = async (table: string, filter?: { column: string; value: string }) => {
        let query = (supabase.from(table as any) as any).select('*', { count: 'exact', head: true }).lt('created_at', oneWeekAgoISO);
        if (filter) {
          query = query.eq(filter.column, filter.value);
        }
        if (orgFilter && table !== 'offices') {
          query = query.in('organization_id', orgFilter);
        }
        const { count } = await query;
        return count || 0;
      };

      // Fetch all feature counts in parallel
      // Note: Using new unified 'posts' table with 'post_type' column instead of deprecated tables
      const [
        wikiPagesCount, wikiPagesLastWeek,
        wikiFoldersCount, wikiFoldersLastWeek,
        winsCount, winsLastWeek,
        announcementsCount, announcementsLastWeek,
        kudosCount, kudosLastWeek,
        socialPostsCount, socialPostsLastWeek,
        updatesCount, updatesLastWeek,
        executiveMessagesCount, executiveMessagesLastWeek,
        leaveCount, leaveLastWeek,
        attendanceCount, attendanceLastWeek,
        learningCount, learningLastWeek,
        reviewsCount, reviewsLastWeek,
        positionHistoryCount, positionHistoryLastWeek,
        calendarCount, calendarLastWeek,
        kpiCount, kpiLastWeek,
        achievementsCount, achievementsLastWeek,
        projectsCount, projectsLastWeek,
        officesCount, officesLastWeek,
        documentsCount, documentsLastWeek,
        notificationsCount, notificationsLastWeek,
        reactionsCount, reactionsLastWeek,
      ] = await Promise.all([
        getCount('wiki_pages'), getLastWeekCount('wiki_pages'),
        getCount('wiki_folders'), getLastWeekCount('wiki_folders'),
        getCount('posts', { column: 'post_type', value: 'win' }), getLastWeekCount('posts', { column: 'post_type', value: 'win' }),
        getCount('posts', { column: 'post_type', value: 'announcement' }), getLastWeekCount('posts', { column: 'post_type', value: 'announcement' }),
        getCount('posts', { column: 'post_type', value: 'kudos' }), getLastWeekCount('posts', { column: 'post_type', value: 'kudos' }),
        getCount('posts', { column: 'post_type', value: 'social' }), getLastWeekCount('posts', { column: 'post_type', value: 'social' }),
        getCount('posts', { column: 'post_type', value: 'update' }), getLastWeekCount('posts', { column: 'post_type', value: 'update' }),
        getCount('posts', { column: 'post_type', value: 'executive_message' }), getLastWeekCount('posts', { column: 'post_type', value: 'executive_message' }),
        getCount('leave_requests'), getLastWeekCount('leave_requests'),
        getCount('attendance_records'), getLastWeekCount('attendance_records'),
        getCount('learning_development'), getLastWeekCount('learning_development'),
        getCount('performance_reviews'), getLastWeekCount('performance_reviews'),
        getCount('position_history'), getLastWeekCount('position_history'),
        getCount('calendar_events'), getLastWeekCount('calendar_events'),
        getCount('kpis'), getLastWeekCount('kpis'),
        getCount('achievements'), getLastWeekCount('achievements'),
        getCount('projects'), getLastWeekCount('projects'),
        getCount('offices'), getLastWeekCount('offices'),
        getCount('employee_documents'), getLastWeekCount('employee_documents'),
        getCount('notifications'), getLastWeekCount('notifications'),
        getCount('post_reactions'), getLastWeekCount('post_reactions'),
      ]);

      const activeOrgs = orgs?.filter(o => o.plan !== 'inactive').length || 0;
      const activeEmployees = employees?.filter(e => e.status === 'active').length || 0;

      setData({
        totalOrgs: orgs?.length || 0,
        activeOrgs,
        totalUsers: profiles?.length || 0,
        activeUsers: activeEmployees,
        featureUsage: [
          { name: 'Wiki Pages', count: wikiPagesCount, lastWeekCount: wikiPagesLastWeek, icon: BookOpen, module: 'wiki' },
          { name: 'Wiki Folders', count: wikiFoldersCount, lastWeekCount: wikiFoldersLastWeek, icon: FolderOpen, module: 'wiki' },
          { name: 'Wins', count: winsCount, lastWeekCount: winsLastWeek, icon: Trophy, module: 'team' },
          { name: 'Announcements', count: announcementsCount, lastWeekCount: announcementsLastWeek, icon: Megaphone, module: 'team' },
          { name: 'Kudos', count: kudosCount, lastWeekCount: kudosLastWeek, icon: Heart, module: 'team' },
          { name: 'Social Posts', count: socialPostsCount, lastWeekCount: socialPostsLastWeek, icon: Activity, module: 'team' },
          { name: 'Updates', count: updatesCount, lastWeekCount: updatesLastWeek, icon: Bell, module: 'team' },
          { name: 'Executive Messages', count: executiveMessagesCount, lastWeekCount: executiveMessagesLastWeek, icon: Megaphone, module: 'team' },
          { name: 'Leave Requests', count: leaveCount, lastWeekCount: leaveLastWeek, icon: Clock, module: 'hr' },
          { name: 'Attendance', count: attendanceCount, lastWeekCount: attendanceLastWeek, icon: ClipboardCheck, module: 'hr' },
          { name: 'Learning & Dev', count: learningCount, lastWeekCount: learningLastWeek, icon: GraduationCap, module: 'hr' },
          { name: 'Reviews', count: reviewsCount, lastWeekCount: reviewsLastWeek, icon: FileCheck, module: 'hr' },
          { name: 'Position Changes', count: positionHistoryCount, lastWeekCount: positionHistoryLastWeek, icon: History, module: 'hr' },
          { name: 'Calendar Events', count: calendarCount, lastWeekCount: calendarLastWeek, icon: CalendarDays, module: 'organization' },
          { name: 'KPIs', count: kpiCount, lastWeekCount: kpiLastWeek, icon: Target, module: 'organization' },
          { name: 'Achievements', count: achievementsCount, lastWeekCount: achievementsLastWeek, icon: Award, module: 'organization' },
          { name: 'Projects', count: projectsCount, lastWeekCount: projectsLastWeek, icon: Briefcase, module: 'organization' },
          { name: 'Offices', count: officesCount, lastWeekCount: officesLastWeek, icon: MapPin, module: 'organization' },
          { name: 'Documents', count: documentsCount, lastWeekCount: documentsLastWeek, icon: FileText, module: 'organization' },
          { name: 'Notifications', count: notificationsCount, lastWeekCount: notificationsLastWeek, icon: Bell, module: 'organization' },
          { name: 'Reactions', count: reactionsCount, lastWeekCount: reactionsLastWeek, icon: SmilePlus, module: 'team' },
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
    if (!data) return { orgGrowth: [], userGrowth: [], activityGrowth: [] };

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

    const getIntervalBounds = (intervalDate: Date) => {
      switch (viewMode) {
        case 'week':
          return {
            start: startOfWeek(intervalDate, { weekStartsOn: 1 }),
            end: endOfWeek(intervalDate, { weekStartsOn: 1 }),
          };
        case 'month':
          return {
            start: startOfMonth(intervalDate),
            end: endOfMonth(intervalDate),
          };
        default:
          return {
            start: startOfDay(intervalDate),
            end: endOfDay(intervalDate),
          };
      }
    };

    const orgGrowth: GrowthDataPoint[] = intervals.map((intervalDate) => {
      const { start: intervalStart, end: intervalEnd } = getIntervalBounds(intervalDate);
      const count = data.orgs.filter(org => {
        const createdAt = new Date(org.created_at);
        return createdAt >= intervalStart && createdAt <= intervalEnd;
      }).length;
      return { label: format(intervalDate, labelFormat), count };
    });

    const userGrowth: GrowthDataPoint[] = intervals.map((intervalDate) => {
      const { start: intervalStart, end: intervalEnd } = getIntervalBounds(intervalDate);
      const count = data.users.filter(user => {
        const createdAt = new Date(user.created_at);
        return createdAt >= intervalStart && createdAt <= intervalEnd;
      }).length;
      return { label: format(intervalDate, labelFormat), count };
    });

    const activityGrowth: GrowthDataPoint[] = intervals.map((intervalDate) => {
      const { start: intervalStart, end: intervalEnd } = getIntervalBounds(intervalDate);
      const count = data.activities.filter(activity => {
        const createdAt = new Date(activity.created_at);
        return createdAt >= intervalStart && createdAt <= intervalEnd;
      }).length;
      return { label: format(intervalDate, labelFormat), count };
    });

    return { orgGrowth, userGrowth, activityGrowth };
  }, [data, viewMode, dateRange]);

  const toggleModule = (module: string) => {
    setOpenModules(prev => 
      prev.includes(module) 
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

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
        <SuperAdminPageHeader 
          title="Analytics" 
          description="Platform-wide usage statistics, engagement metrics, and product insights" 
        />

        {/* Filters */}
        <AnalyticsFilters
          selectedOrgs={selectedOrgs}
          onOrgsChange={setSelectedOrgs}
          selectedUsers={selectedUsers}
          onUsersChange={setSelectedUsers}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customStartDate={customStartDate}
          onCustomStartDateChange={setCustomStartDate}
          customEndDate={customEndDate}
          onCustomEndDateChange={setCustomEndDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Organisations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.activeOrgs}</div>
              <p className="text-xs text-muted-foreground">of {data?.totalOrgs} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.activeUsers}</div>
              <p className="text-xs text-muted-foreground">of {data?.totalUsers} registered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Used Feature</CardTitle>
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
              <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.featureUsage.reduce((sum, f) => sum + f.count, 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total records across features</p>
            </CardContent>
          </Card>
        </div>

        {/* User Engagement Metrics */}
        <EngagementMetrics
          selectedOrgs={selectedOrgs}
          selectedUsers={selectedUsers}
          dateRange={dateRange}
        />

        {/* Activity Heatmap */}
        <ActivityHeatmap
          selectedOrgs={selectedOrgs}
          selectedUsers={selectedUsers}
          dateRange={dateRange}
        />

        {/* Growth Charts */}
        <div className="space-y-6">
          {/* Section Header with View Mode Toggle */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Growth Charts</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">View:</span>
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
          </div>

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
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
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
                      stroke="hsl(142 76% 36%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(142 76% 36%)', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: 'hsl(142 76% 36%)' }}
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
              <CardTitle>Activities Over Time</CardTitle>
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
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
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
                      stroke="hsl(280 65% 60%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(280 65% 60%)', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: 'hsl(280 65% 60%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Churn Risk Card */}
        <ChurnRiskCard />

        {/* Feature Usage by Module - Collapsible */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Feature Usage by Module</h2>
          
          {(['team', 'hr', 'wiki', 'organization'] as const).map((module) => {
            const moduleFeatures = data?.featureUsage.filter(f => f.module === module) || [];
            if (moduleFeatures.length === 0) return null;
            
            return (
              <Collapsible
                key={module}
                open={openModules.includes(module)}
                onOpenChange={() => toggleModule(module)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto border border-border rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-lg font-semibold">{MODULE_LABELS[module]}</span>
                    <ChevronDown className={cn(
                      "h-5 w-5 transition-transform",
                      openModules.includes(module) && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
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
                            <CardTitle className="text-sm font-medium">{feature.name}</CardTitle>
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
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminAnalytics;
