import { Suspense, lazy, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrgLink } from '@/components/OrgLink';
import { useOrganization } from '@/hooks/useOrganization';
import { useHiringMetrics } from '@/services/useHiring';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'recharts';
import { 
  Briefcase, 
  Users, 
  UserCheck, 
  Clock,
  ExternalLink,
  Plus,
  Settings,
  UserPlus,
  TrendingUp,
  Search,
  X
} from 'lucide-react';
import { JobStatus, APPLICATION_STAGE_LABELS } from '@/types/hiring';

// Lazy load tab content components
const JobsList = lazy(() => import('./JobsList'));
const CandidatesList = lazy(() => import('./CandidatesList'));

const COLORS = ['hsl(var(--primary))', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6', '#22D3EE', '#FB923C'];

type TabType = 'analytics' | 'jobs' | 'candidates';


export default function HiringDashboard() {
  const { currentOrg } = useOrganization();
  const { data: metrics, isLoading } = useHiringMetrics();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filter states lifted from child components
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatus | 'all'>('all');
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateSourceFilter, setCandidateSourceFilter] = useState<string>('all');
  
  const tabParam = searchParams.get('tab') as TabType | null;
  const activeTab: TabType = tabParam || 'analytics';

  const handleTabChange = (tab: TabType) => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'analytics') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    setSearchParams(newParams, { replace: true });
  };

  const hasActiveFilters = 
    (activeTab === 'jobs' && (jobSearchQuery || jobStatusFilter !== 'all')) ||
    (activeTab === 'candidates' && (candidateSearchQuery || candidateSourceFilter !== 'all'));

  const clearFilters = () => {
    if (activeTab === 'jobs') {
      setJobSearchQuery('');
      setJobStatusFilter('all');
    } else if (activeTab === 'candidates') {
      setCandidateSearchQuery('');
      setCandidateSourceFilter('all');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 md:h-6 md:w-6" />
            Hiring
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage job vacancies, candidates, and recruitment pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <OrgLink to="/hiring/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </OrgLink>
          </Button>
          <Button variant="outline" asChild>
            <a 
              href={`/careers/${currentOrg?.slug || currentOrg?.id}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Careers Site
            </a>
          </Button>
          <Button asChild>
            <OrgLink to="/hiring/jobs/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Job Vacancy
            </OrgLink>
          </Button>
        </div>
      </div>

      {/* Sticky Filter Bar - positioned below the layout header */}
      <div className="sticky top-16 z-10 bg-purple-50/80 dark:bg-purple-950/20 backdrop-blur-sm -mx-4 px-4 py-2 -mt-2 rounded-lg">
        <div className="flex items-center gap-2 flex-wrap bg-slate-300 dark:bg-slate-700 px-[5px] py-[5px] rounded-lg">
          {/* Tab Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
            <Button 
              variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('analytics')}
              className="gap-1.5 h-7"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
            <Button 
              variant={activeTab === 'jobs' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('jobs')}
              className="gap-1.5 h-7"
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Vacancies</span>
            </Button>
            <Button 
              variant={activeTab === 'candidates' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('candidates')}
              className="gap-1.5 h-7"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Candidates</span>
            </Button>
          </div>

          {/* Divider */}
          {(activeTab === 'jobs' || activeTab === 'candidates') && (
            <div className="w-px h-6 bg-border hidden md:block" />
          )}

          {/* Jobs Tab Filters */}
          {activeTab === 'jobs' && (
            <>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search vacancies..."
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-[200px] bg-background"
                />
              </div>
              <div className="hidden md:block">
                <Select
                  value={jobStatusFilter}
                  onValueChange={(value) => setJobStatusFilter(value as JobStatus | 'all')}
                >
                  <SelectTrigger className="h-9 min-w-[140px] bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Candidates Tab Filters */}
          {activeTab === 'candidates' && (
            <>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={candidateSearchQuery}
                  onChange={(e) => setCandidateSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-[200px] bg-background"
                />
              </div>
              <div className="hidden md:block">
                <Select
                  value={candidateSourceFilter}
                  onValueChange={setCandidateSourceFilter}
                >
                  <SelectTrigger className="h-9 min-w-[140px] bg-background">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="careers_site">Careers Site</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="job_board">Job Board</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Tab Content */}
      {activeTab === 'analytics' && (
        <>
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
                <CardTitle className="text-sm font-medium">Active Vacancies</CardTitle>
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
            {/* Hiring Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Hiring Funnel</CardTitle>
                <CardDescription>Active candidates by pipeline stage</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const stageData = Object.entries(metrics?.candidates_by_stage || {})
                    .filter(([, count]) => count > 0)
                    .map(([stage, count]) => ({
                      name: APPLICATION_STAGE_LABELS[stage as keyof typeof APPLICATION_STAGE_LABELS] || stage,
                      count,
                    }));
                  return stageData.length === 0 ? (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">No active candidates</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stageData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Source of Hire */}
            <Card>
              <CardHeader>
                <CardTitle>Source of Hire</CardTitle>
                <CardDescription>Where candidates come from</CardDescription>
              </CardHeader>
              <CardContent>
                {!metrics?.source_breakdown?.length ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">No application source data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metrics.source_breakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {metrics.source_breakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Applications Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Applications Trend</CardTitle>
                <CardDescription>New applications per week (last 8 weeks)</CardDescription>
              </CardHeader>
              <CardContent>
                {!metrics?.applications_trend?.length ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">No recent application data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.applications_trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        name="Applications"
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Assignment Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Performance</CardTitle>
                <CardDescription>Take-home task completion stats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Completion Rate</p>
                      <p className="text-sm text-muted-foreground">Candidates who submitted</p>
                    </div>
                    <div className="text-2xl font-bold">{(metrics?.assignment_completion_rate || 0).toFixed(0)}%</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Average Rating</p>
                      <p className="text-sm text-muted-foreground">Out of 5 stars</p>
                    </div>
                    <div className="text-2xl font-bold">{metrics?.avg_assignment_rating?.toFixed(1) || '—'}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">On-Time Submission</p>
                      <p className="text-sm text-muted-foreground">Submitted before deadline</p>
                    </div>
                    <div className="text-2xl font-bold">
                      {metrics?.on_time_submission_rate != null ? `${metrics.on_time_submission_rate.toFixed(0)}%` : '—'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Avg. Review Time</p>
                      <p className="text-sm text-muted-foreground">Days to rate after submission</p>
                    </div>
                    <div className="text-2xl font-bold">
                      {metrics?.avg_review_time_days != null ? `${metrics.avg_review_time_days.toFixed(1)}d` : '—'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 3 — Applications by Job */}
          {metrics?.applications_by_job?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Applications by Job</CardTitle>
                <CardDescription>Total applicants per vacancy</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, metrics.applications_by_job.length * 44)}>
                  <BarChart data={metrics.applications_by_job} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="title" type="category" width={160} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Applicants" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                      {metrics.applications_by_job.map((_, index) => (
                        <Cell key={`cell-job-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Jobs Tab Content */}
      {activeTab === 'jobs' && (
        <Suspense fallback={<div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>}>
          <JobsList 
            searchQuery={jobSearchQuery}
            onSearchChange={setJobSearchQuery}
            statusFilter={jobStatusFilter}
            onStatusFilterChange={setJobStatusFilter}
          />
        </Suspense>
      )}

      {/* Candidates Tab Content */}
      {activeTab === 'candidates' && (
        <Suspense fallback={<div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>}>
          <CandidatesList 
            searchQuery={candidateSearchQuery}
            onSearchChange={setCandidateSearchQuery}
            sourceFilter={candidateSourceFilter}
            onSourceFilterChange={setCandidateSourceFilter}
          />
        </Suspense>
      )}
    </div>
  );
}
