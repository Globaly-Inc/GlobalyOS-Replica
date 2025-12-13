import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  Building2, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Activity,
  BookOpen,
  Calendar,
  Clock,
  ClipboardCheck,
  Trophy,
  Megaphone,
  Heart,
  Target,
  Minus,
  LucideIcon
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

interface FeatureItem {
  name: string;
  count: number;
  lastWeekCount: number;
  icon: LucideIcon;
}

interface AnalyticsData {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  activeUsers: number;
  featureUsage: FeatureItem[];
  orgGrowth: { month: string; count: number }[];
  userGrowth: { month: string; count: number }[];
}



const SuperAdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

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

      // Feature usage counts - current totals
      const { count: wikiCount } = await supabase
        .from('wiki_pages')
        .select('*', { count: 'exact', head: true });

      const { count: calendarCount } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true });

      const { count: leaveCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true });

      const { count: attendanceCount } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true });

      const { count: kudosCount } = await supabase
        .from('kudos')
        .select('*', { count: 'exact', head: true });

      const { count: winsCount } = await supabase
        .from('updates')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'win');

      const { count: announcementsCount } = await supabase
        .from('updates')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'announcement');

      const { count: kpiCount } = await supabase
        .from('kpis')
        .select('*', { count: 'exact', head: true });

      // Last week counts (records created before one week ago)
      const { count: wikiCountLastWeek } = await supabase
        .from('wiki_pages')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', oneWeekAgoISO);

      const { count: calendarCountLastWeek } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', oneWeekAgoISO);

      const { count: leaveCountLastWeek } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', oneWeekAgoISO);

      const { count: attendanceCountLastWeek } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', oneWeekAgoISO);

      const { count: kudosCountLastWeek } = await supabase
        .from('kudos')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', oneWeekAgoISO);

      const { count: winsCountLastWeek } = await supabase
        .from('updates')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'win')
        .lt('created_at', oneWeekAgoISO);

      const { count: announcementsCountLastWeek } = await supabase
        .from('updates')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'announcement')
        .lt('created_at', oneWeekAgoISO);

      const { count: kpiCountLastWeek } = await supabase
        .from('kpis')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', oneWeekAgoISO);

      // Calculate org growth by month (last 6 months)
      const orgGrowth: { month: string; count: number }[] = [];
      const userGrowth: { month: string; count: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthOrgs = orgs?.filter((org) => {
          const createdAt = new Date(org.created_at);
          return createdAt <= monthEnd;
        }) || [];
        const monthUsers = profiles?.filter((profile) => {
          const createdAt = new Date(profile.created_at);
          return createdAt <= monthEnd;
        }) || [];
        orgGrowth.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          count: monthOrgs.length,
        });
        userGrowth.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          count: monthUsers.length,
        });
      }

      const activeOrgs = orgs?.filter(o => o.plan !== 'inactive').length || 0;
      const activeEmployees = employees?.filter(e => e.status === 'active').length || 0;

      setData({
        totalOrgs: orgs?.length || 0,
        activeOrgs,
        totalUsers: profiles?.length || 0,
        activeUsers: activeEmployees,
        featureUsage: [
          { name: 'Wiki Pages', count: wikiCount || 0, lastWeekCount: wikiCountLastWeek || 0, icon: BookOpen },
          { name: 'Calendar Events', count: calendarCount || 0, lastWeekCount: calendarCountLastWeek || 0, icon: Calendar },
          { name: 'Leave Requests', count: leaveCount || 0, lastWeekCount: leaveCountLastWeek || 0, icon: Clock },
          { name: 'Attendance', count: attendanceCount || 0, lastWeekCount: attendanceCountLastWeek || 0, icon: ClipboardCheck },
          { name: 'Wins', count: winsCount || 0, lastWeekCount: winsCountLastWeek || 0, icon: Trophy },
          { name: 'Announcements', count: announcementsCount || 0, lastWeekCount: announcementsCountLastWeek || 0, icon: Megaphone },
          { name: 'Kudos', count: kudosCount || 0, lastWeekCount: kudosCountLastWeek || 0, icon: Heart },
          { name: 'KPIs', count: kpiCount || 0, lastWeekCount: kpiCountLastWeek || 0, icon: Target },
        ],
        orgGrowth,
        userGrowth,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
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

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Organisation Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.orgGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
            <CardHeader>
              <CardTitle>Users Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Usage Cards */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Feature Usage</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {data?.featureUsage.map((feature) => {
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
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminAnalytics;
