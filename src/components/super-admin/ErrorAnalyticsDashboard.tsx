import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2,
  Loader2
} from 'lucide-react';
import { 
  useErrorLogStats, 
  useErrorTrendData, 
  useErrorsByType,
  useTopErrorMessages,
  useErrorsByOrganization
} from '@/services/useErrorLogs';
import { format } from 'date-fns';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

const ErrorAnalyticsDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useErrorLogStats();
  const { data: trendData, isLoading: trendLoading } = useErrorTrendData(7);
  const { data: errorsByType, isLoading: typeLoading } = useErrorsByType();
  const { data: topErrors, isLoading: topLoading } = useTopErrorMessages(5);
  const { data: errorsByOrg, isLoading: orgLoading } = useErrorsByOrganization(5);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors (24h)</p>
                <p className="text-3xl font-bold">{stats?.total24h || 0}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                (stats?.totalChange || 0) > 0 ? 'text-destructive' : 'text-green-500'
              }`}>
                {(stats?.totalChange || 0) > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.abs(stats?.totalChange || 0)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Errors</p>
                <p className="text-3xl font-bold text-destructive">{stats?.critical || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Affected Users</p>
                <p className="text-3xl font-bold">{stats?.affectedUsers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Affected Orgs</p>
                <p className="text-3xl font-bold">{stats?.affectedOrgs || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Error Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Error Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => format(new Date(d), 'MMM d')}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                    labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="critical" 
                    stackId="1"
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.6}
                    name="Critical"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="error" 
                    stackId="1"
                    stroke="#f97316" 
                    fill="#f97316" 
                    fillOpacity={0.6}
                    name="Error"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="warning" 
                    stackId="1"
                    stroke="#eab308" 
                    fill="#eab308" 
                    fillOpacity={0.6}
                    name="Warning"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Error Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Error Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {typeLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={errorsByType}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ type, percentage }) => `${type} ${percentage}%`}
                    labelLine={false}
                  >
                    {errorsByType?.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Error Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Error Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {topLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {topErrors?.map((error, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" title={error.message}>
                        {error.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last: {format(new Date(error.lastOccurred), 'MMM d, HH:mm')}
                      </p>
                    </div>
                    <div className="bg-destructive/10 text-destructive px-2 py-1 rounded text-sm font-medium">
                      {error.count}
                    </div>
                  </div>
                ))}
                {(!topErrors || topErrors.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">No errors recorded</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Errors by Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Errors by Organization</CardTitle>
          </CardHeader>
          <CardContent>
            {orgLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={errorsByOrg} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    type="category" 
                    dataKey="orgName" 
                    width={120}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" name="Total" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="criticalCount" fill="#ef4444" name="Critical" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ErrorAnalyticsDashboard;
