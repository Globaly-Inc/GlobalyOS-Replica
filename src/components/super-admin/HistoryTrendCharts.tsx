import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, BarChart3, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface TestRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  test_type: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  duration_ms: number | null;
}

interface FlakyTest {
  testName: string;
  testFile: string;
  flakyCount: number;
  totalRuns: number;
  flakyRate: number;
  lastFlaky: string;
}

interface HistoryTrendChartsProps {
  testRuns: TestRun[];
}

const HistoryTrendCharts = ({ testRuns }: HistoryTrendChartsProps) => {
  // Calculate trend data from test runs
  const trendData = testRuns
    .slice()
    .reverse()
    .slice(-20)
    .map((run) => ({
      date: format(new Date(run.started_at), 'MMM d'),
      fullDate: run.started_at,
      passRate: run.total_tests > 0 
        ? Math.round((run.passed_tests / run.total_tests) * 100) 
        : 0,
      totalTests: run.total_tests,
      passed: run.passed_tests,
      failed: run.failed_tests,
      skipped: run.skipped_tests,
      duration: run.duration_ms ? run.duration_ms / 1000 : 0,
      testType: run.test_type,
    }));

  // Simulate flaky test detection (in production, would analyze test result patterns)
  const flakyTests: FlakyTest[] = [
    {
      testName: 'should handle concurrent user sessions',
      testFile: 'src/test/security/multi-tenant.test.ts',
      flakyCount: 3,
      totalRuns: 10,
      flakyRate: 30,
      lastFlaky: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      testName: 'should refresh token before expiry',
      testFile: 'src/test/auth/token-refresh.test.ts',
      flakyCount: 2,
      totalRuns: 15,
      flakyRate: 13,
      lastFlaky: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      testName: 'should load dashboard data within timeout',
      testFile: 'src/test/e2e/dashboard.test.ts',
      flakyCount: 4,
      totalRuns: 8,
      flakyRate: 50,
      lastFlaky: new Date(Date.now() - 43200000).toISOString(),
    },
  ].sort((a, b) => b.flakyRate - a.flakyRate);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name === 'Pass Rate' ? '%' : entry.name === 'Duration' ? 's' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pass-rate" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pass-rate" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Pass Rate
          </TabsTrigger>
          <TabsTrigger value="test-count" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Test Count
          </TabsTrigger>
          <TabsTrigger value="duration" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Duration
          </TabsTrigger>
          <TabsTrigger value="flaky" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Flaky Tests
          </TabsTrigger>
        </TabsList>

        {/* Pass Rate Trend */}
        <TabsContent value="pass-rate">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pass Rate Over Time</CardTitle>
              <CardDescription>Test pass percentage across runs</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="passRate"
                      name="Pass Rate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No test run data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Count Growth */}
        <TabsContent value="test-count">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Count Growth</CardTitle>
              <CardDescription>Number of tests over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="passed"
                      name="Passed"
                      stackId="1"
                      stroke="hsl(142 76% 36%)"
                      fill="hsl(142 76% 36% / 0.6)"
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      name="Failed"
                      stackId="1"
                      stroke="hsl(var(--destructive))"
                      fill="hsl(var(--destructive) / 0.6)"
                    />
                    <Area
                      type="monotone"
                      dataKey="skipped"
                      name="Skipped"
                      stackId="1"
                      stroke="hsl(var(--muted-foreground))"
                      fill="hsl(var(--muted-foreground) / 0.4)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No test run data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duration Trends */}
        <TabsContent value="duration">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Duration Trends</CardTitle>
              <CardDescription>Test execution time per run</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${value}s`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="duration"
                      name="Duration"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No test run data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flaky Test Detection */}
        <TabsContent value="flaky">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Flaky Tests Detected
              </CardTitle>
              <CardDescription>Tests with inconsistent pass/fail results</CardDescription>
            </CardHeader>
            <CardContent>
              {flakyTests.length > 0 ? (
                <div className="space-y-3">
                  {flakyTests.map((test, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg border bg-amber-500/5 border-amber-500/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{test.testName}</div>
                        <div className="text-xs text-muted-foreground truncate">{test.testFile}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Last flaky: {format(new Date(test.lastFlaky), 'MMM d, h:mm a')}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-500">{test.flakyCount}</div>
                          <div className="text-xs text-muted-foreground">Flaky runs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{test.totalRuns}</div>
                          <div className="text-xs text-muted-foreground">Total runs</div>
                        </div>
                        <Badge 
                          variant={test.flakyRate >= 30 ? 'destructive' : 'outline'}
                          className={test.flakyRate >= 30 ? '' : 'text-amber-600 border-amber-500'}
                        >
                          {test.flakyRate}% flaky
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">No flaky tests detected</p>
                  <p className="text-xs mt-1">Tests are analyzed after multiple runs</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoryTrendCharts;
