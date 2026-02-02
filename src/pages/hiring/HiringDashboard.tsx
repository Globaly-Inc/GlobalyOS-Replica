import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgLink } from '@/components/OrgLink';
import { useJobs, useHiringMetrics, useUpcomingInterviews } from '@/services/useHiring';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  Briefcase, 
  Users, 
  UserCheck, 
  Calendar,
  Clock,
  Plus,
  ExternalLink,
  TrendingUp,
  FileText,
  ArrowRight,
  Settings
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function HiringDashboard() {
  const { currentOrg } = useOrganization();
  const { data: jobs, isLoading: jobsLoading } = useJobs({ status: 'open' });
  const { data: metrics, isLoading: metricsLoading } = useHiringMetrics();
  const { data: upcomingInterviews, isLoading: interviewsLoading } = useUpcomingInterviews();

  const openJobsCount = jobs?.length || 0;
  const candidatesInPipeline = metrics?.total_candidates || 0;
  const hiresLast30Days = metrics?.hires_last_30_days || 0;
  const averageTimeToFill = metrics?.avg_time_to_fill_days || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hiring Dashboard</h1>
          <p className="text-muted-foreground">
            Manage job openings, candidates, and recruitment pipeline
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
              Create Job
            </OrgLink>
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{openJobsCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Active positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates in Pipeline</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{candidatesInPipeline}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Active applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hires (30 days)</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{hiresLast30Days}</div>
            )}
            <p className="text-xs text-muted-foreground">
              New team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Fill</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{averageTimeToFill} days</div>
            )}
            <p className="text-xs text-muted-foreground">
              From open to hired
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open Jobs List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Open Jobs</CardTitle>
                <CardDescription>Recently posted positions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <OrgLink to="/hiring/jobs" className="flex items-center gap-1">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </OrgLink>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.slice(0, 5).map((job) => (
                  <OrgLink
                    key={job.id}
                    to={`/hiring/jobs/${job.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{job.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{typeof job.department === 'object' ? job.department?.name : job.department || 'No department'}</span>
                        {job.location && (
                          <>
                            <span>•</span>
                            <span>{job.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {job._count?.candidate_applications || 0} candidates
                    </Badge>
                  </OrgLink>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No open jobs yet</p>
                <Button asChild>
                  <OrgLink to="/hiring/jobs/new">Create your first job</OrgLink>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Interviews</CardTitle>
                <CardDescription>Scheduled for the next 7 days</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <OrgLink to="/hiring/candidates" className="flex items-center gap-1">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </OrgLink>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {interviewsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : upcomingInterviews && upcomingInterviews.length > 0 ? (
              <div className="space-y-4">
                {upcomingInterviews.slice(0, 5).map((interview) => {
                  const candidateName = interview.candidate_application?.candidate?.name || 'Unknown';
                  const jobTitle = interview.candidate_application?.job?.title || 'Unknown Position';
                  return (
                    <div
                      key={interview.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{candidateName}</p>
                          <p className="text-sm text-muted-foreground">
                            {jobTitle} • {interview.interview_type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(interview.scheduled_at), 'MMM d, h:mm a')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(interview.scheduled_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No upcoming interviews</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <OrgLink to="/hiring/jobs/new">
                <Plus className="h-5 w-5" />
                <span>Create Job</span>
              </OrgLink>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <OrgLink to="/hiring/candidates">
                <Users className="h-5 w-5" />
                <span>View Candidates</span>
              </OrgLink>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <OrgLink to="/hiring/settings">
                <FileText className="h-5 w-5" />
                <span>Assignment Templates</span>
              </OrgLink>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <OrgLink to="/hiring/analytics">
                <TrendingUp className="h-5 w-5" />
                <span>View Analytics</span>
              </OrgLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
