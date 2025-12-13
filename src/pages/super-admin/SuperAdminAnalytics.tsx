import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Users, TrendingUp, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";

interface AnalyticsData {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  activeUsers: number;
  featureUsage: { name: string; count: number }[];
  orgGrowth: { month: string; count: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const SuperAdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get organization stats
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, plan, created_at');

      // Get user stats
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');

      // Get active employees
      const { data: employees } = await supabase
        .from('employees')
        .select('id, status');

      // Feature usage counts
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

      const { count: postsCount } = await supabase
        .from('updates')
        .select('*', { count: 'exact', head: true });

      const { count: kpiCount } = await supabase
        .from('kpis')
        .select('*', { count: 'exact', head: true });

      // Calculate org growth by month (last 6 months)
      const orgGrowth: { month: string; count: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthOrgs = orgs?.filter((org) => {
          const createdAt = new Date(org.created_at);
          return createdAt <= monthEnd;
        }) || [];
        orgGrowth.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          count: monthOrgs.length,
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
          { name: 'Wiki Pages', count: wikiCount || 0 },
          { name: 'Calendar Events', count: calendarCount || 0 },
          { name: 'Leave Requests', count: leaveCount || 0 },
          { name: 'Attendance Records', count: attendanceCount || 0 },
          { name: 'Posts (Wins & Announcements)', count: postsCount || 0 },
          { name: 'Kudos', count: kudosCount || 0 },
          { name: 'KPIs', count: kpiCount || 0 },
        ],
        orgGrowth,
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
              <CardTitle>Feature Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.featureUsage.filter(f => f.count > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {data?.featureUsage.filter(f => f.count > 0).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Usage Table */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.featureUsage.sort((a, b) => b.count - a.count).map((feature, index) => {
                const maxCount = Math.max(...(data?.featureUsage.map(f => f.count) || [1]));
                const percentage = maxCount > 0 ? (feature.count / maxCount) * 100 : 0;
                
                return (
                  <div key={feature.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{feature.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {feature.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminAnalytics;
