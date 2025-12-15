import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SecurityTrendData {
  date: string;
  score: number;
  openIssues: number;
  resolvedIssues: number;
  criticalIssues: number;
}

interface SecurityTrendChartProps {
  data: SecurityTrendData[];
}

const SecurityTrendChart = ({ data }: SecurityTrendChartProps) => {
  // Calculate trend
  const latestScore = data.length > 0 ? data[data.length - 1].score : 0;
  const previousScore = data.length > 1 ? data[data.length - 2].score : latestScore;
  const trend = latestScore - previousScore;

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  // Calculate metrics
  const totalResolved = data.reduce((sum, d) => sum + d.resolvedIssues, 0);
  const avgResolutionTime = data.length > 0 
    ? Math.round(data.reduce((sum, d) => sum + (d.openIssues > 0 ? 24 : 0), 0) / data.length) 
    : 0;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security Trend</CardTitle>
          <CardDescription>No data available yet</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Run security scans to see trends
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score and Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Security Score</div>
                <div className={`text-3xl font-bold ${getScoreColor(latestScore)}`}>
                  {latestScore}%
                </div>
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={`text-sm ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Open Issues</div>
            <div className="text-3xl font-bold">
              {data.length > 0 ? data[data.length - 1].openIssues : 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.length > 0 ? data[data.length - 1].criticalIssues : 0} critical
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Resolved (30d)</div>
            <div className="text-3xl font-bold text-success">{totalResolved}</div>
            <div className="text-xs text-muted-foreground mt-1">issues fixed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Avg. Resolution</div>
            <div className="text-3xl font-bold">{avgResolutionTime}h</div>
            <div className="text-xs text-muted-foreground mt-1">time to fix</div>
          </CardContent>
        </Card>
      </div>

      {/* Security Score Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security Score Over Time</CardTitle>
          <CardDescription>Track your security posture improvements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="url(#scoreGradient)"
                  strokeWidth={2}
                  name="Security Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Open vs Resolved Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Open vs Resolved Issues</CardTitle>
          <CardDescription>Issue resolution progress over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="openIssues"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Open Issues"
                />
                <Line
                  type="monotone"
                  dataKey="resolvedIssues"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Resolved"
                />
                <Line
                  type="monotone"
                  dataKey="criticalIssues"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name="Critical"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityTrendChart;
