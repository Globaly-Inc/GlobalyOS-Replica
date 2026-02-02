import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useHiringMetrics } from '@/services/useHiring';
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
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  Briefcase, 
  Users, 
  UserCheck, 
  Clock,
  TrendingUp,
  Filter
} from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#8884d8', '#82ca9d'];

// Mock data for charts - will be replaced with real data
const stageData = [
  { name: 'Applied', count: 45 },
  { name: 'Screening', count: 32 },
  { name: 'Assignment', count: 18 },
  { name: 'Interview 1', count: 12 },
  { name: 'Interview 2', count: 8 },
  { name: 'Offer', count: 4 },
  { name: 'Hired', count: 3 },
];

const sourceData = [
  { name: 'Careers Site', value: 35 },
  { name: 'LinkedIn', value: 25 },
  { name: 'Referral', value: 20 },
  { name: 'Job Board', value: 15 },
  { name: 'Other', value: 5 },
];

const timeToFillData = [
  { month: 'Jan', days: 28 },
  { month: 'Feb', days: 32 },
  { month: 'Mar', days: 25 },
  { month: 'Apr', days: 22 },
  { month: 'May', days: 30 },
  { month: 'Jun', days: 24 },
];

export default function HiringAnalytics() {
  const { data: metrics, isLoading } = useHiringMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hiring Analytics</h1>
          <p className="text-muted-foreground">
            Track recruitment performance and identify opportunities
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics?.total_candidates || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics?.open_jobs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Currently open
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hires This Month</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics?.hires_last_30_days || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.hires_last_90_days || 0} in last 90 days
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Fill</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics?.avg_time_to_fill_days || 0} days</div>
                <p className="text-xs text-muted-foreground">
                  -3 days from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hiring Funnel</CardTitle>
            <CardDescription>Candidates by pipeline stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source of Hire */}
        <Card>
          <CardHeader>
            <CardTitle>Source of Hire</CardTitle>
            <CardDescription>Where candidates come from</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Time to Fill Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Time to Fill Trend</CardTitle>
            <CardDescription>Average days to fill positions over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeToFillData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="days" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Assignment Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Performance</CardTitle>
            <CardDescription>Take-home task completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Completion Rate</p>
                  <p className="text-sm text-muted-foreground">Candidates who submitted</p>
                </div>
                <div className="text-2xl font-bold">{((metrics?.assignment_completion_rate || 0) * 100).toFixed(0)}%</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Average Rating</p>
                  <p className="text-sm text-muted-foreground">Out of 5 stars</p>
                </div>
                <div className="text-2xl font-bold">{metrics?.avg_assignment_rating?.toFixed(1) || 'N/A'}</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">On-Time Submission</p>
                  <p className="text-sm text-muted-foreground">Before deadline</p>
                </div>
                <div className="text-2xl font-bold">85%</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Avg. Review Time</p>
                  <p className="text-sm text-muted-foreground">Time to rate submission</p>
                </div>
                <div className="text-2xl font-bold">2.3 days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
